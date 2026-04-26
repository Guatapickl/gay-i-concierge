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
  /** Post-meeting notes/recap (markdown). */
  notes?: string | null;
  /** Shared across all instances of a recurring meeting. Null for one-offs. */
  series_id?: string | null;
  /** RRULE-lite string e.g. "FREQ=WEEKLY;INTERVAL=2;BYDAY=TU". Set on every instance for display. */
  recurrence_rule?: string | null;
  /** ISO timestamp; series stops generating after this. */
  recurrence_until?: string | null;
  created_at: string;
  updated_at?: string | null;
};

/**
 * Recurrence frequency presets we expose in the UI. Internally these compile
 * to RRULE-lite strings stored on `events.recurrence_rule`.
 */
export type RecurrenceFrequency = 'none' | 'weekly' | 'biweekly' | 'monthly';

export type RecurrenceConfig = {
  frequency: RecurrenceFrequency;
  /** Number of instances to generate up-front. */
  count: number;
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
 * Newsfeed post (announcement, recap, or general member post).
 */
export type Post = {
  id: string;
  author_user_id: string;
  title: string | null;
  body: string;
  event_id: string | null;
  is_announcement: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type PostComment = {
  id: string;
  post_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
};

export type PostReaction = {
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

/**
 * Hydrated post with author profile + counts. Built client-side from joins.
 */
export type FeedPost = Post & {
  author_name: string | null;
  comment_count: number;
  reactions: { emoji: string; count: number; mine: boolean }[];
  event?: Pick<Event, 'id' | 'title' | 'event_datetime'> | null;
};

/**
 * Email reminder queue row.
 */
export type EmailReminder = {
  id: string;
  event_id: string | null;
  recipient_email: string;
  recipient_user_id: string | null;
  kind: 'event_reminder' | 'rsvp_confirmation' | 'agenda_published' | 'event_cancelled' | 'digest' | 'custom';
  subject: string;
  body_html: string;
  body_text: string | null;
  send_at: string;
  sent_at: string | null;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';
  error: string | null;
  attempts: number;
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
