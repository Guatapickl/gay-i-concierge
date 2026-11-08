/**
 * Neutral label for members whose profile has no `full_name` yet.
 *
 * Accounts get a basic `user_profiles/{uid}` document at sign-up (see
 * lib/firebase/userProfiles.ts) with `full_name` taken from the Auth display
 * name, or null when the account has none. Member surfaces must show this
 * label for a missing name; they never fall back to the email address.
 */
export const MISSING_NAME_LABEL = 'New member';

export function memberDisplayName(fullName: string | null | undefined): string {
  const name = typeof fullName === 'string' ? fullName.trim() : '';
  return name || MISSING_NAME_LABEL;
}
