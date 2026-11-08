/**
 * Backfill basic `user_profiles/{uid}` documents for Firebase Auth accounts
 * that have none, so every account appears on the Members page.
 *
 * Idempotent: existing profiles are never read into memory for editing, never
 * modified and never overwritten (lib/firebase/userProfiles.ts creates inside a
 * transaction only when the document is still missing). Re-running after a
 * successful apply reports `created=0`.
 *
 * Dry run (default) prints what would be created and writes nothing:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run profiles:backfill -- --project gayiclub
 * Real run:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run profiles:backfill -- --project gayiclub --apply
 *
 * `--project` (or NEXT_PUBLIC_FIREBASE_PROJECT_ID) names the Firebase project.
 * Credentials come from Application Default Credentials or
 * FIREBASE_SERVICE_ACCOUNT_JSON, exactly as the server code does.
 * The output lists uids, the public name that would be stored and the account
 * creation time. It never prints email addresses.
 */
/* eslint-disable no-console -- command line report */
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const projectFlag = args.indexOf('--project');
if (projectFlag !== -1) process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = args[projectFlag + 1];
const unknown = args.filter((a, i) => a !== '--apply' && a !== '--project' && !(i > 0 && args[i - 1] === '--project'));
const projectValue = projectFlag === -1 ? undefined : args[projectFlag + 1];
if (unknown.length || (projectFlag !== -1 && (!projectValue || projectValue.startsWith('--')))) {
  console.error(`usage: backfill-user-profiles [--project <firebase-project-id>] [--apply]  (unexpected: ${unknown.join(' ')})`);
  process.exit(2);
}
if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.error('Set --project <id> or NEXT_PUBLIC_FIREBASE_PROJECT_ID.');
  process.exit(2);
}

async function main() {
  // Import after the project id is settled: adminApp() reads it at init.
  const { adminAuth, adminDb } = await import('@/lib/firebase/admin');
  const { basicProfile, ensureUserProfile, USER_PROFILES } = await import('@/lib/firebase/userProfiles');
  const auth = adminAuth();
  const db = adminDb();

  const users: Awaited<ReturnType<typeof auth.listUsers>>['users'] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  users.sort((a, b) => new Date(a.metadata.creationTime).getTime() - new Date(b.metadata.creationTime).getTime());

  console.log(`${apply ? 'APPLY' : 'DRY RUN'} project=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID} accounts=${users.length}`);
  let existing = 0;
  let created = 0;
  let raced = 0;
  const missing: string[] = [];
  for (const user of users) {
    const snap = await db.collection(USER_PROFILES).doc(user.uid).get();
    if (snap.exists) {
      existing += 1;
      continue;
    }
    missing.push(user.uid);
    const preview = basicProfile(user);
    const line = `uid=${user.uid} full_name=${preview.full_name === null ? 'null' : JSON.stringify(preview.full_name)} created_at=${preview.created_at.toDate().toISOString()}${user.disabled ? ' disabled=true' : ''}`;
    if (!apply) {
      console.log(`would create ${line}`);
      continue;
    }
    const result = await ensureUserProfile(user, db);
    if (result.created) {
      created += 1;
      console.log(`created ${line}`);
    } else {
      raced += 1;
      console.log(`skipped (profile appeared before the write) uid=${user.uid}`);
    }
  }
  const after = (await db.collection(USER_PROFILES).count().get()).data().count;
  console.log(
    `summary accounts=${users.length} existing=${existing} missing=${missing.length} created=${created} modified=0 skipped=${raced} ` +
      `profiles_after=${after}${apply ? '' : ' (dry run, nothing written)'}`,
  );
  // A profile that appeared during the run (a member signing in) is the wanted end state, not a failure.
  if (apply && created + raced !== missing.length) process.exitCode = 1;
}

main().catch(e => {
  console.error('backfill failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
