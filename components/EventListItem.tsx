import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import CalendarExportButtons from '@/components/CalendarExportButtons';
import type { Event } from '@/types/supabase';

interface EventListItemProps {
  event: Event;
  isRsvped?: boolean;
  isAdmin?: boolean;
  onRsvp?: () => void;
  onCancelRsvp?: () => void;
  showViewAgenda?: boolean;
}

const EventListItem: React.FC<EventListItemProps> = ({
  event,
  isRsvped = false,
  isAdmin = false,
  onRsvp,
  onCancelRsvp,
  showViewAgenda = true,
}) => {
  return (
    <li className="border p-4 rounded">
      <h3 className="text-xl font-semibold">
        <a className="underline" href={`/events/${event.id}`}>
          {event.title}
        </a>
      </h3>
      <p>
        <strong>Date:</strong> {new Date(event.event_datetime).toLocaleString()}
      </p>
      {event.location && (
        <p>
          <strong>Location:</strong> {event.location}
        </p>
      )}
      {event.description && <p>{event.description}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {/* RSVP Actions */}
        {isRsvped ? (
          <div className="flex items-center gap-2">
            <span className="text-green-700 font-semibold">✅ RSVPed</span>
            {onCancelRsvp && (
              <Button variant="secondary" size="sm" onClick={onCancelRsvp}>
                Cancel
              </Button>
            )}
          </div>
        ) : (
          onRsvp && (
            <Button variant="primary" size="md" onClick={onRsvp}>
              RSVP
            </Button>
          )
        )}

        {/* Calendar Export Buttons */}
        <CalendarExportButtons event={event} />

        {/* View Agenda Button */}
        {showViewAgenda && Array.isArray(event.agenda) && event.agenda.length > 0 && (
          <Link href={`/events/${event.id}/agenda`}>
            <Button variant="outline" size="sm">
              View Agenda
            </Button>
          </Link>
        )}

        {/* Admin Edit Link */}
        {isAdmin && (
          <a href={`/events/${event.id}/edit`} className="text-sm text-blue-600 underline ml-auto">
            Edit
          </a>
        )}
      </div>
    </li>
  );
};

export default EventListItem;
