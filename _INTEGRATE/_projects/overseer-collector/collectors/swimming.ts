import { register } from '../src/registry.js';
import type { CollectorDefinition, CollectorContext } from '../src/types.js';
import { DEFAULT_RETRY_POLICY } from '../src/types.js';

interface SwimmingSession {
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  title: string;
  location: string;
  spotsAvailable?: number;
}

interface SwimmingData {
  sessions: SwimmingSession[];
  facility: string;
  collectedAt: string;
}

const CALENDAR_ID = 'f744a9cd-27f0-4c58-be71-af01b805395d';
const WIDGET_ID = '2edd14d7-7dee-4a06-85e1-e211553c48d5';
const API_URL = 'https://cityofnewwestminster.perfectmind.com/23693/Clients/BookMe4BookingPagesV2/ClassesV2';

interface PerfectMindClass {
  EventName?: string;
  EventTimeDescription?: string;
  Location?: string;
  Facility?: string;
  OccurrenceDate?: string;
  StartDate?: string;
  FormattedStartDate?: string;
  Spots?: number;
}

interface PerfectMindResponse {
  classes?: PerfectMindClass[]; // lowercase 'classes'!
}

function getDayOfWeek(dateStr: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const date = new Date(dateStr + 'T12:00:00');
  return days[date.getDay()];
}

function parseEventTime(desc: string): { start: string; end: string } | null {
  if (!desc) return null;
  const match = desc.match(/(\d{1,2}:\d{2})\s*(AM|PM)\s*[-–]\s*(\d{1,2}:\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  const to24 = (t: string, m: string) => {
    const [h, min] = t.split(':');
    let hour = parseInt(h, 10);
    if (m.toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (m.toUpperCase() === 'AM' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${min}`;
  };

  return {
    start: to24(match[1], match[2]),
    end: to24(match[3], match[4]),
  };
}

function parseDate(input: string | undefined): string | null {
  if (!input) return null;

  // yyyyMMdd format
  if (/^\d{8}$/.test(input)) {
    return `${input.slice(0, 4)}-${input.slice(4, 6)}-${input.slice(6, 8)}`;
  }

  // ISO or other parseable format
  const d = new Date(input);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
}

async function fetchSwimmingSessions(ctx: CollectorContext): Promise<SwimmingSession[]> {
  const startDate = ctx.now.toISOString().split('T')[0].replace(/-/g, '');
  const endDate = new Date(ctx.now);
  endDate.setDate(endDate.getDate() + 14);
  const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');
  const today = ctx.now.toISOString().split('T')[0];

  const response = await ctx.fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      calendarId: CALENDAR_ID,
      widgetId: WIDGET_ID,
      startDate,
      endDate: endDateStr,
      numberOfDaysToLoad: 14,
    }),
  });

  if (!response.ok) {
    throw new Error(`PerfectMind API error: ${response.status}`);
  }

  const data: PerfectMindResponse = await response.json();

  // IMPORTANT: API returns lowercase 'classes', not 'Classes'
  const classes = data.classes || [];
  const sessions: SwimmingSession[] = [];

  for (const cls of classes) {
    const name = cls.EventName || '';
    const nameLower = name.toLowerCase();

    // Filter for public swim / drop-in
    const isPublicSwim =
      nameLower.includes('public swim') ||
      nameLower.includes('drop-in') ||
      nameLower.includes('dropin') ||
      nameLower.includes('lane swim') ||
      (nameLower.includes('swim') && nameLower.includes('public'));

    if (!isPublicSwim) continue;

    const timeInfo = parseEventTime(cls.EventTimeDescription || '');
    if (!timeInfo) continue;

    const date = parseDate(cls.OccurrenceDate) || parseDate(cls.StartDate) || parseDate(cls.FormattedStartDate);
    if (!date || date < today) continue;

    sessions.push({
      date,
      dayOfWeek: getDayOfWeek(date),
      startTime: timeInfo.start,
      endTime: timeInfo.end,
      title: name,
      location: cls.Location || cls.Facility || 'Canada Games Pool',
      spotsAvailable: cls.Spots,
    });
  }

  // Sort and deduplicate
  sessions.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const seen = new Set<string>();
  return sessions.filter(s => {
    const key = `${s.date}-${s.startTime}-${s.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const swimmingCollector: CollectorDefinition<SwimmingData> = {
  id: 'swimming',
  schedule: {
    type: 'cron',
    expression: '0 6 * * *',
  },
  mode: 'both',
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 3,
    timeoutMs: 30000,
  },

  async collect(ctx) {
    const sessions = await fetchSwimmingSessions(ctx);
    return {
      sessions,
      facility: 'Canada Games Pool',
      collectedAt: ctx.now.toISOString(),
    };
  },
};

register(swimmingCollector);
