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

/**
 * Event type reflects the 'events' table schema in Supabase.
 */
export type Event = {
  id: string;
  title: string;
  description: string | null;
  event_datetime: string;
  location: string | null;
  created_at: string;
};
/**
 * RSVP type reflects the 'rsvps' table schema in Supabase.
 */
export type Rsvp = {
  id: string;
  profile_id: string;
  event_id: string;
  event_date?: string;
  created_at: string;
};
