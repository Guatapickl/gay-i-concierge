import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Clock, Check, Pencil } from 'lucide-react';
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
  const eventDate = new Date(event.event_datetime);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <li className="card p-5 hover:border-primary/30 transition-all duration-200">
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        {/* Date Badge */}
        <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-surface-elevated border border-border rounded-lg shrink-0">
          <span className="text-xs font-medium text-foreground-muted uppercase">
            {eventDate.toLocaleDateString('en-US', { month: 'short' })}
          </span>
          <span className="text-xl font-bold text-foreground">
            {eventDate.getDate()}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Link href={`/events/${event.id}`}>
            <h3 className="text-lg font-semibold text-foreground hover:text-primary transition-colors mb-2">
              {event.title}
            </h3>
          </Link>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground-muted mb-3">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formattedTime}
            </span>
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {event.location}
              </span>
            )}
          </div>

          {event.description && (
            <p className="text-sm text-foreground-muted line-clamp-2 mb-4">
              {event.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
            {/* RSVP Actions */}
            {isRsvped ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                  <Check className="w-4 h-4" />
                  RSVPed
                </span>
                {onCancelRsvp && (
                  <Button variant="ghost" size="sm" onClick={onCancelRsvp}>
                    Cancel
                  </Button>
                )}
              </div>
            ) : (
              onRsvp && (
                <Button variant="primary" size="sm" onClick={onRsvp}>
                  RSVP
                </Button>
              )
            )}

            {/* Calendar Export */}
            <CalendarExportButtons event={event} />

            {/* View Agenda */}
            {showViewAgenda && Array.isArray(event.agenda) && event.agenda.length > 0 && (
              <Link href={`/events/${event.id}/agenda`}>
                <Button variant="outline" size="sm">
                  View Agenda
                </Button>
              </Link>
            )}

            {/* Admin Edit */}
            {isAdmin && (
              <Link
                href={`/events/${event.id}/edit`}
                className="ml-auto flex items-center gap-1.5 text-sm text-foreground-muted hover:text-primary transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Link>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};

export default EventListItem;
