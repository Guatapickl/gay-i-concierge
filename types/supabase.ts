/**
 * Profile type reflects the 'profiles' table schema in Supabase.
 */
export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  interests: string[] | null;
  /** User's AI experience level */
  experienceLevel: 'none' | 'beginner' | 'intermediate' | 'advanced' | null;
  created_at: string;
};