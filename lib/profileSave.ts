/**
 * Fields the Profile page writes to `user_profiles/{uid}`.
 *
 * The page merges this payload into the existing document (`setDoc` with
 * `{ merge: true }`). `created_at` is deliberately absent so the account
 * creation time written at sign-up, or by scripts/backfill-user-profiles.ts,
 * survives every later save. Timestamps are ISO strings here; the caller runs
 * the result through `payloadOf` to store Firestore Timestamps.
 */
export type ProfileSaveInput = {
  userId: string;
  fullName: string;
  betaOptIn: boolean;
  experienceLevel: string;
  interests: string[];
  /** Private convenience copy of the sign-in email; rules hide it from other members. */
  email: string | null;
  updatedAt: string;
};

export function profileSavePayload(input: ProfileSaveInput) {
  return {
    id: input.userId,
    full_name: input.fullName.trim() || null,
    beta_opt_in: input.betaOptIn,
    experience_level: input.experienceLevel,
    interests: input.interests,
    email: input.email,
    updated_at: input.updatedAt,
  };
}
