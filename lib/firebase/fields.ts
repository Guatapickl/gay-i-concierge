/** Field names that hold timestamps across all collections. No SDK imports — safe anywhere. */
export const TIMESTAMP_FIELDS = new Set([
  'created_at', 'updated_at', 'event_datetime', 'recurrence_until', 'send_at', 'sent_at', 'expires_at',
  'published_at', 'closes_at', 'option_datetime', 'email_opt_in_at', 'email_opt_out_at',
  'sms_opt_in_at', 'sms_opt_out_at', 'consumed_at', 'event_date', 'last_seen_at',
]);
