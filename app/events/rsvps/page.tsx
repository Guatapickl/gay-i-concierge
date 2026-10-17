"use client";

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getNextMeetingRsvps, RsvpViewError } from '@/lib/rsvp';
import NextMeetingRsvps, { type RsvpViewState } from '@/components/NextMeetingRsvps';

/**
 * /events/rsvps — organizer view of who has RSVP'd to the next meeting.
 * Access is enforced by the server (`/api/events/attendees` answers 401/403);
 * this page only decides which state to show. `?event=<id>` preselects an
 * event; otherwise the next upcoming meeting is shown.
 */
export default function NextMeetingRsvpsPage() {
  return (
    <Suspense fallback={<NextMeetingRsvps state={{ status: 'loading' }} />}>
      <RsvpsView />
    </Suspense>
  );
}

function RsvpsView() {
  const { userId, loading: authLoading } = useCurrentUser();
  const searchParams = useSearchParams();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => searchParams.get('event'));
  const [state, setState] = useState<RsvpViewState>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (eventId: string | null, mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setState({ status: 'loading' });
    else setRefreshing(true);
    try {
      const data = await getNextMeetingRsvps(eventId);
      setState({ status: 'ready', data });
    } catch (err) {
      const status = err instanceof RsvpViewError ? err.status : null;
      if (status === 401) setState({ status: 'signed-out' });
      else if (status === 403) setState({ status: 'forbidden' });
      else setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setState({ status: 'signed-out' });
      return;
    }
    void load(selectedEventId, 'initial');
  }, [authLoading, userId, selectedEventId, load]);

  return (
    <NextMeetingRsvps
      state={state}
      refreshing={refreshing}
      onRefresh={() => { void load(selectedEventId, 'refresh'); }}
      onSelectEvent={eventId => setSelectedEventId(eventId)}
    />
  );
}
