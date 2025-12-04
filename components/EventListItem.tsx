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
    <li className="glass-card p-6 rounded-xl border border-white/10 hover:border-primary/30 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(255,0,204,0.2)] relative overflow-hidden">
      {/* Animated background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative z-10">
        <h3 className="text-2xl font-bold font-orbitron mb-3 group-hover:text-primary transition-colors">
          <a
            className="hover:text-accent transition-colors inline-block"
            href={`/events/${event.id}`}
          >
            {event.title}
          </a>
        </h3>

        <div className="space-y-2 mb-4 text-gray-300">
          <p className="flex items-center gap-2">
            <span className="text-accent font-orbitron text-sm">DATE:</span>
            <span className="text-white">{new Date(event.event_datetime).toLocaleString()}</span>
          </p>
          {event.location && (
            <p className="flex items-center gap-2">
              <span className="text-accent font-orbitron text-sm">LOCATION:</span>
              <span className="text-white">{event.location}</span>
            </p>
          )}
        </div>

        {event.description && (
          <p className="text-gray-400 mb-4 leading-relaxed">{event.description}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 pt-4 border-t border-white/10">
          {/* RSVP Actions */}
          {isRsvped ? (
            <div className="flex items-center gap-2">
              <span className="text-accent font-semibold font-orbitron flex items-center gap-1">
                <span className="text-lg">✓</span> RSVPed
              </span>
              {onCancelRsvp && (
                <Button variant="ghost" size="sm" onClick={onCancelRsvp}>
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
            <a
              href={`/events/${event.id}/edit`}
              className="text-sm text-primary hover:text-accent underline ml-auto font-orbitron tracking-wide transition-colors"
            >
              EDIT
            </a>
          )}
        </div>
      </div>
    </li>
  );
};

export default EventListItem;
