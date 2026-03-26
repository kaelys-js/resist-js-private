import { register } from '../src/registry.js';
import type { CollectorDefinition, LocalContext } from '../src/types.js';
import { DEFAULT_RETRY_POLICY, isLocalContext } from '../src/types.js';

interface Birthday {
  name: string;
  date: string; // YYYY-MM-DD of next occurrence
  monthDay: string; // MM-DD for recurring reference
  year?: number; // Birth year if extractable from event
  age?: number; // Age they're turning (if birth year known)
  daysUntil: number;
  type: 'birthday';
}

interface Anniversary {
  name: string;
  date: string; // YYYY-MM-DD of next occurrence
  monthDay: string; // MM-DD for recurring reference
  year?: number; // Original year of anniversary
  years?: number; // Years being celebrated
  daysUntil: number;
  type: 'anniversary';
}

interface BirthdaysData {
  birthdays: Birthday[];
  anniversaries: Anniversary[];
  upcoming: (Birthday | Anniversary)[]; // Next 30 days, sorted
  collectedAt: string;
}

// ekctl types
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

// Calculate days until a date
function getDaysUntil(targetDate: Date, now: Date): number {
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Extract birth year from notes field if present (Contacts often stores it there)
function extractBirthYear(notes: string | undefined): number | undefined {
  if (!notes) return undefined;

  // Look for patterns like "Born: 1990" or "Birth year: 1990" or just a 4-digit year in context
  const patterns = [
    /born[:\s]+(\d{4})/i,
    /birth\s*year[:\s]+(\d{4})/i,
    /\b(19\d{2}|20[0-2]\d)\b/, // Years 1900-2029
  ];

  for (const pattern of patterns) {
    const match = notes.match(pattern);
    if (match) {
      const year = parseInt(match[1], 10);
      if (year >= 1900 && year <= new Date().getFullYear()) {
        return year;
      }
    }
  }

  return undefined;
}

// Extract anniversary year from title or notes
function extractAnniversaryYear(title: string, notes: string | undefined, eventDate: Date): number | undefined {
  // Check title for year like "5th Anniversary" or "Wedding Anniversary (2020)"
  const titleYearMatch = title.match(/\((\d{4})\)/);
  if (titleYearMatch) {
    return parseInt(titleYearMatch[1], 10);
  }

  // Check notes
  if (notes) {
    const notesMatch = notes.match(/\b(19\d{2}|20[0-2]\d)\b/);
    if (notesMatch) {
      const year = parseInt(notesMatch[1], 10);
      if (year <= eventDate.getFullYear()) {
        return year;
      }
    }
  }

  return undefined;
}

async function fetchBirthdaysAndAnniversaries(
  exec: LocalContext['exec'],
  now: Date
): Promise<{ birthdays: Birthday[]; anniversaries: Anniversary[] }> {
  // Get all calendars
  const calendarsResult = await exec('ekctl list calendars 2>&1');
  if (calendarsResult.exitCode !== 0) {
    throw new Error(`ekctl list calendars failed: ${calendarsResult.stderr || calendarsResult.stdout}`);
  }

  let calendarsData: EkctlCalendarsResponse;
  try {
    calendarsData = JSON.parse(calendarsResult.stdout);
  } catch {
    throw new Error(`Failed to parse calendars: ${calendarsResult.stdout.slice(0, 200)}`);
  }

  // Find birthday-related calendars and all event calendars
  // Note: The system "Birthdays" calendar requires the exec-server to have Calendar permissions
  // in System Settings → Privacy & Security → Calendars
  const birthdayCalendars = calendarsData.calendars.filter(
    c => c.type === 'event' && c.title.toLowerCase().includes('birthday')
  );
  const eventCalendars = calendarsData.calendars.filter(c => c.type === 'event');

  const birthdays: Birthday[] = [];
  const anniversaries: Anniversary[] = [];

  // Date range: 1 year ahead to capture all upcoming birthdays
  const startDate = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const endDate = new Date(now);
  endDate.setFullYear(endDate.getFullYear() + 1);
  const endDateISO = endDate.toISOString().replace(/\.\d{3}Z$/, 'Z');

  // Fetch from birthday-specific calendars (e.g., system "Birthdays" calendar)
  for (const calendar of birthdayCalendars) {
    const eventsResult = await exec(
      `ekctl list events --calendar "${calendar.id}" --from "${startDate}" --to "${endDateISO}" 2>&1`
    );

    if (eventsResult.exitCode !== 0) continue;

    let eventsData: EkctlEventsResponse;
    try {
      eventsData = JSON.parse(eventsResult.stdout);
    } catch {
      continue;
    }

    for (const evt of eventsData.events) {
      const eventDate = new Date(evt.startDate);
      const daysUntil = getDaysUntil(eventDate, now);

      // Skip past events
      if (daysUntil < 0) continue;

      const monthDay = `${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;

      // Parse title format like "Cole's 37th Birthday" or "Mom's Birthday"
      const titleMatch = evt.title.match(/^(.+?)['']s\s+(?:(\d+)(?:st|nd|rd|th)\s+)?Birthday$/i);
      const name = titleMatch ? titleMatch[1] : evt.title.replace(/'s Birthday$/i, '').replace(/['']s Birthday$/i, '').trim();

      // Extract age from title (e.g., "37th") or notes
      let age: number | undefined;
      if (titleMatch && titleMatch[2]) {
        age = parseInt(titleMatch[2], 10);
      }

      // Calculate birth year from age
      const birthYear = age ? eventDate.getFullYear() - age : extractBirthYear(evt.notes || undefined);
      if (!age && birthYear) {
        age = eventDate.getFullYear() - birthYear;
      }

      birthdays.push({
        name,
        date: eventDate.toISOString().split('T')[0],
        monthDay,
        year: birthYear,
        age,
        daysUntil,
        type: 'birthday',
      });
    }
  }

  // Also check all event calendars for birthday events (manual entries)
  const seenBirthdays = new Set<string>();
  for (const b of birthdays) {
    seenBirthdays.add(`${b.name.toLowerCase()}-${b.monthDay}`);
  }

  // Fetch birthdays and anniversaries from all event calendars
  const seenAnniversaries = new Set<string>();

  for (const calendar of eventCalendars) {
    // Skip birthday-specific calendars (already processed)
    if (calendar.title.toLowerCase().includes('birthday')) continue;

    const eventsResult = await exec(
      `ekctl list events --calendar "${calendar.id}" --from "${startDate}" --to "${endDateISO}" 2>&1`
    );

    if (eventsResult.exitCode !== 0) continue;

    let eventsData: EkctlEventsResponse;
    try {
      eventsData = JSON.parse(eventsResult.stdout);
    } catch {
      continue;
    }

    for (const evt of eventsData.events) {
      const titleLower = evt.title.toLowerCase();

      // Check for birthday events in regular calendars
      if (titleLower.includes('birthday')) {
        const eventDate = new Date(evt.startDate);
        const daysUntil = getDaysUntil(eventDate, now);
        if (daysUntil < 0) continue;

        const monthDay = `${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;

        // Parse title format
        const titleMatch = evt.title.match(/^(.+?)['']s\s+(?:(\d+)(?:st|nd|rd|th)\s+)?Birthday$/i);
        const name = titleMatch ? titleMatch[1] : evt.title.replace(/['']?s?\s*Birthday$/i, '').trim();

        const key = `${name.toLowerCase()}-${monthDay}`;
        if (seenBirthdays.has(key)) continue;
        seenBirthdays.add(key);

        let age: number | undefined;
        if (titleMatch && titleMatch[2]) {
          age = parseInt(titleMatch[2], 10);
        }
        const birthYear = age ? eventDate.getFullYear() - age : extractBirthYear(evt.notes || undefined);
        if (!age && birthYear) {
          age = eventDate.getFullYear() - birthYear;
        }

        birthdays.push({
          name,
          date: eventDate.toISOString().split('T')[0],
          monthDay,
          year: birthYear,
          age,
          daysUntil,
          type: 'birthday',
        });
        continue;
      }

      // Check if it's an anniversary event
      if (!titleLower.includes('anniversary')) continue;

      const eventDate = new Date(evt.startDate);
      const daysUntil = getDaysUntil(eventDate, now);

      // Skip past events
      if (daysUntil < 0) continue;

      const monthDay = `${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;

      // Deduplicate
      const key = `${evt.title.toLowerCase()}-${monthDay}`;
      if (seenAnniversaries.has(key)) continue;
      seenAnniversaries.add(key);

      const originalYear = extractAnniversaryYear(evt.title, evt.notes || undefined, eventDate);
      const years = originalYear ? eventDate.getFullYear() - originalYear : undefined;

      anniversaries.push({
        name: evt.title,
        date: eventDate.toISOString().split('T')[0],
        monthDay,
        year: originalYear,
        years,
        daysUntil,
        type: 'anniversary',
      });
    }
  }

  return { birthdays, anniversaries };
}

const birthdaysCollector: CollectorDefinition<BirthdaysData> = {
  id: 'birthdays',
  schedule: {
    type: 'cron',
    expression: '0 6 * * *', // Daily at 6 AM
  },
  mode: 'local', // Requires exec() for ekctl
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 2,
    timeoutMs: 60000,
  },

  async collect(ctx) {
    if (!isLocalContext(ctx)) {
      throw new Error('birthdays collector requires local runtime with exec()');
    }

    const { birthdays, anniversaries } = await fetchBirthdaysAndAnniversaries(ctx.exec, ctx.now);

    // Sort by days until
    birthdays.sort((a, b) => a.daysUntil - b.daysUntil);
    anniversaries.sort((a, b) => a.daysUntil - b.daysUntil);

    // Combine upcoming (next 30 days)
    const upcoming: (Birthday | Anniversary)[] = [
      ...birthdays.filter(b => b.daysUntil <= 30),
      ...anniversaries.filter(a => a.daysUntil <= 30),
    ].sort((a, b) => a.daysUntil - b.daysUntil);

    return {
      birthdays,
      anniversaries,
      upcoming,
      collectedAt: ctx.now.toISOString(),
    };
  },
};

register(birthdaysCollector);
