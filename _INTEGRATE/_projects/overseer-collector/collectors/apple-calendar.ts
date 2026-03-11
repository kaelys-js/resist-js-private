import { register } from '../src/registry.js';
import type { CollectorDefinition, LocalContext } from '../src/types.js';
import { DEFAULT_RETRY_POLICY, isLocalContext } from '../src/types.js';

interface CalendarEvent {
  title: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  location?: string;
  notes?: string;
  calendar: string;
  recurrence?: string;
}

interface AppleCalendarData {
  events: CalendarEvent[];
  calendars: string[];
  timeframeDays: number;
  collectedAt: string;
}

// ekctl JSON response types
interface EkctlEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string | null;
  notes?: string | null;
  calendar: {
    id: string;
    title: string;
  };
  hasRecurrenceRules?: boolean;
}

interface EkctlEventsResponse {
  count: number;
  events: EkctlEvent[];
  status: string;
}

interface EkctlCalendar {
  id: string;
  title: string;
  type: 'event' | 'reminder';
  source: string;
  color: string;
  allowsModifications: boolean;
}

interface EkctlCalendarsResponse {
  calendars: EkctlCalendar[];
}

const DEFAULT_TIMEFRAME_DAYS = 30;

async function fetchAppleCalendar(
  exec: LocalContext['exec'],
  now: Date,
  timeframeDays: number
): Promise<{ events: CalendarEvent[]; calendars: string[] }> {
  // Get all calendars using ekctl
  const calendarsResult = await exec('ekctl list calendars 2>&1');
  if (calendarsResult.exitCode !== 0) {
    throw new Error(`ekctl list calendars failed: ${calendarsResult.stderr || calendarsResult.stdout}`);
  }

  let calendarsData: EkctlCalendarsResponse;
  try {
    calendarsData = JSON.parse(calendarsResult.stdout);
  } catch {
    throw new Error(`Failed to parse ekctl calendars output: ${calendarsResult.stdout.slice(0, 200)}`);
  }

  const eventCalendars = calendarsData.calendars.filter(c => c.type === 'event');
  if (eventCalendars.length === 0) {
    throw new Error('No calendars found. Please grant ekctl full calendar access in System Settings → Privacy & Security → Calendars');
  }

  // Calculate date range in ISO format (without milliseconds - ekctl doesn't accept them)
  const startDate = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + timeframeDays);
  const endDateISO = endDate.toISOString().replace(/\.\d{3}Z$/, 'Z');

  const allEvents: CalendarEvent[] = [];
  const calendarNames: string[] = [];

  // Fetch events from each calendar
  for (const calendar of eventCalendars) {
    calendarNames.push(calendar.title);

    const eventsResult = await exec(
      `ekctl list events --calendar "${calendar.id}" --from "${startDate}" --to "${endDateISO}" 2>&1`
    );

    if (eventsResult.exitCode !== 0) {
      console.error(`Failed to fetch events from ${calendar.title}: ${eventsResult.stderr}`);
      continue;
    }

    let eventsData: EkctlEventsResponse;
    try {
      eventsData = JSON.parse(eventsResult.stdout);
    } catch {
      console.error(`Failed to parse events from ${calendar.title}`);
      continue;
    }

    for (const evt of eventsData.events) {
      allEvents.push({
        title: evt.title,
        startDate: evt.startDate,
        endDate: evt.endDate,
        isAllDay: evt.allDay,
        location: evt.location || undefined,
        notes: evt.notes ? (evt.notes.length > 500 ? evt.notes.slice(0, 497) + '...' : evt.notes) : undefined,
        calendar: evt.calendar.title,
        recurrence: evt.hasRecurrenceRules ? 'recurring' : undefined,
      });
    }
  }

  // Sort by start date
  allEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return { events: allEvents, calendars: calendarNames.sort() };
}

const appleCalendarCollector: CollectorDefinition<AppleCalendarData> = {
  id: 'apple-calendar',
  schedule: {
    type: 'cron',
    expression: '*/30 * * * *',
  },
  mode: 'local',
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 2,
    timeoutMs: 60000,
  },

  async collect(ctx) {
    if (!isLocalContext(ctx)) {
      throw new Error('apple-calendar collector requires local runtime with exec()');
    }

    const { events, calendars } = await fetchAppleCalendar(
      ctx.exec,
      ctx.now,
      DEFAULT_TIMEFRAME_DAYS
    );

    return {
      events,
      calendars,
      timeframeDays: DEFAULT_TIMEFRAME_DAYS,
      collectedAt: ctx.now.toISOString(),
    };
  },
};

register(appleCalendarCollector);
