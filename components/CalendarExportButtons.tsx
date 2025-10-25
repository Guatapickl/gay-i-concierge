import React from 'react';
import { Button } from '@/components/ui';
import { downloadICS, googleCalendarUrl } from '@/lib/calendar';
import type { Event } from '@/types/supabase';

interface CalendarExportButtonsProps {
  event: Event;
}

const CalendarExportButtons: React.FC<CalendarExportButtonsProps> = ({ event }) => {
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => downloadICS(event)}
        title="Download .ics"
      >
        Add to Calendar (.ics)
      </Button>
      <a
        href={googleCalendarUrl(event)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant="outline" size="sm">
          Add to Google Calendar
        </Button>
      </a>
    </>
  );
};

export default CalendarExportButtons;
