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
  /** Optional structured agenda as JSON (stored in DB as jsonb) */
  agenda?: AgendaItem[] | null;
  created_at: string;
};

/**
 * Agenda item structure for event agendas.
 */
export type AgendaItem = {
  time?: string | null; // e.g., "10:00 AM"
  title: string; // e.g., "Welcome & Introductions"
  speaker?: string | null;
  notes?: string | null; // optional details
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

/**
 * Resource library entries posted by signed-in users.
 */
export type Resource = {
  id: string;
  owner_user_id: string; // auth.users.id of the creator
  url: string;
  title: string;
  description: string | null;
  category: string | null; // simple single category
  tags: string[] | null; // optional tag list
  is_pinned: boolean; // admins can pin featured resources
  clicks: number; // future use: track clicks
  created_at: string;
  updated_at: string | null;
};
