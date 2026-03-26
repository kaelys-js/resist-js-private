import { register } from '../src/registry.js';
import type { CollectorDefinition, CollectorContext } from '../src/types.js';
import { DEFAULT_RETRY_POLICY } from '../src/types.js';

interface SkatingSession {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  activity: string;
  location: string;
  ageGroup?: string;
}

interface SkatingData {
  sessions: SkatingSession[];
  facilities: string[];
  collectedAt: string;
}

// All Burnaby skating facilities with their location_ref IDs
// Updated from: https://www.burnaby.ca/recreation-and-arts/activities-and-registration/daily-activities?activity_tid=656
const FACILITIES = [
  { name: 'Bill Copeland Sports Centre', locationRef: '2991' },
  { name: 'Kensington Complex', locationRef: '3046' },
  { name: 'Rosemary Brown Recreation Centre', locationRef: '6916' },
];

// Parse time string like "1-3:15 pm" or "10:30 am - 12 pm"
function parseTimeRange(timeStr: string): { start: string; end: string } | null {
  // Normalize the string
  const normalized = timeStr.toLowerCase().replace(/\s+/g, ' ').trim();

  // Pattern: "1-3:15 pm" or "1:00-3:15 pm" (single meridiem at end)
  const singleMeridiemMatch = normalized.match(
    /^(\d{1,2}(?::\d{2})?)\s*[-–]\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)$/
  );
  if (singleMeridiemMatch) {
    const [, start, end, meridiem] = singleMeridiemMatch;
    return {
      start: formatTime(start, meridiem),
      end: formatTime(end, meridiem),
    };
  }

  // Pattern: "10:30 am - 12 pm" (separate meridiems)
  const dualMeridiemMatch = normalized.match(
    /^(\d{1,2}(?::\d{2})?)\s*(am|pm)\s*[-–]\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)$/
  );
  if (dualMeridiemMatch) {
    const [, start, startM, end, endM] = dualMeridiemMatch;
    return {
      start: formatTime(start, startM),
      end: formatTime(end, endM),
    };
  }

  return null;
}

function formatTime(time: string, meridiem: string): string {
  const [hourStr, minuteStr] = time.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';

  if (meridiem === 'pm' && hour !== 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;

  return `${hour.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

// Get dates for next 14 days
function getNext14Days(now: Date): Map<string, string> {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const result = new Map<string, string>();

  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = days[d.getDay()];
    result.set(dayOfWeek, dateStr);
  }

  return result;
}

// Get all dates for a given day of week in next 14 days
function getDatesForDay(now: Date, dayOfWeek: string): string[] {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDay = days.indexOf(dayOfWeek);
  if (targetDay === -1) return [];

  const result: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    if (d.getDay() === targetDay) {
      result.push(d.toISOString().split('T')[0]);
    }
  }
  return result;
}

function getDayOfWeek(dateStr: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const date = new Date(dateStr + 'T12:00:00');
  return days[date.getDay()];
}

async function fetchFacilitySchedule(
  ctx: CollectorContext,
  facility: { name: string; locationRef: string }
): Promise<SkatingSession[]> {
  const url = `https://www.burnaby.ca/recreation-and-arts/activities-and-registration/daily-activities?activity_tid=656&location_ref=${facility.locationRef}`;

  const response = await ctx.fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${facility.name}`);
  }

  const html = await response.text();
  const sessions: SkatingSession[] = [];

  // The Burnaby site shows a weekly schedule table
  // Each row represents a time slot, columns are days of the week
  // We need to find the table and parse it

  // Look for schedule data - the page uses a weekly calendar view
  // Pattern: day header -> activity cells

  // Try to find schedule table structure
  // The page has a table with days as columns

  const dayHeaders = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Strategy 1: Look for activity cards/cells with time and activity info
  // Pattern in Burnaby site: activity blocks with time and description
  const activityBlockRegex =
    /<(?:td|div)[^>]*class="[^"]*(?:views-field|activity|schedule)[^"]*"[^>]*>([\s\S]*?)<\/(?:td|div)>/gi;

  // Strategy 2: Look for structured data in script tags or data attributes
  const jsonDataMatch = html.match(
    /(?:Drupal\.settings\.daily_activities|var\s+scheduleData)\s*=\s*(\{[\s\S]*?\});/
  );
  if (jsonDataMatch) {
    try {
      interface ScheduleItem {
        day?: string;
        time?: string;
        activity?: string;
        title?: string;
      }
      const data = JSON.parse(jsonDataMatch[1]) as Record<string, ScheduleItem[]>;
      for (const [day, items] of Object.entries(data)) {
        if (Array.isArray(items)) {
          for (const item of items) {
            const timeRange = parseTimeRange(item.time || '');
            if (timeRange && (item.activity || item.title)) {
              const dates = getDatesForDay(ctx.now, day);
              for (const date of dates) {
                sessions.push({
                  date,
                  dayOfWeek: day,
                  startTime: timeRange.start,
                  endTime: timeRange.end,
                  activity: item.activity || item.title || 'Public Skating',
                  location: facility.name,
                });
              }
            }
          }
        }
      }
      if (sessions.length > 0) return sessions;
    } catch {
      // JSON parse failed
    }
  }

  // Strategy 3: Parse the weekly schedule table directly
  // Look for table with day headers and activity rows

  // Find all activity mentions with times near "skate" or "skating"
  // The schedule shows activities organized by day

  // Extract day-based schedule sections
  for (const day of dayHeaders) {
    // Look for section containing this day's schedule
    const dayRegex = new RegExp(
      `(?:${day})[\\s\\S]*?(?=(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|$))`,
      'i'
    );
    const daySection = html.match(dayRegex);

    if (daySection) {
      // Find all time + activity patterns in this section
      const activityRegex =
        /(?:Public\s*Skat(?:e|ing)|Drop[- ]?in\s*Skat(?:e|ing)|Family\s*Skat(?:e|ing)|Adult\s*Skat(?:e|ing)|Stick\s*(?:and|&)\s*Puck|Shinny)[^<]*?(\d{1,2}(?::\d{2})?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))|(\d{1,2}(?::\d{2})?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))[^<]*?(?:Public\s*Skat(?:e|ing)|Drop[- ]?in\s*Skat(?:e|ing)|Family\s*Skat(?:e|ing)|Adult\s*Skat(?:e|ing)|Stick\s*(?:and|&)\s*Puck|Shinny)/gi;

      let match;
      while ((match = activityRegex.exec(daySection[0])) !== null) {
        const timeStr = match[1] || match[2];
        const timeRange = parseTimeRange(timeStr);

        if (timeRange) {
          // Determine activity type from context
          const context = match[0].toLowerCase();
          let activity = 'Public Skating';
          if (context.includes('family')) activity = 'Family Skating';
          else if (context.includes('adult')) activity = 'Adult Skating';
          else if (context.includes('drop')) activity = 'Drop-in Skating';
          else if (context.includes('stick') || context.includes('puck')) activity = 'Stick & Puck';
          else if (context.includes('shinny')) activity = 'Shinny';

          const dates = getDatesForDay(ctx.now, day);
          for (const date of dates) {
            sessions.push({
              date,
              dayOfWeek: day,
              startTime: timeRange.start,
              endTime: timeRange.end,
              activity,
              location: facility.name,
            });
          }
        }
      }
    }
  }

  // Strategy 4: Generic extraction - find all time + skating patterns
  if (sessions.length === 0) {
    // Look for table cells with activity info
    const cellRegex =
      /<td[^>]*>([\s\S]*?(?:skat|public|drop[- ]?in)[\s\S]*?)<\/td>/gi;

    let cellMatch;
    while ((cellMatch = cellRegex.exec(html)) !== null) {
      const cellContent = cellMatch[1];

      // Find time in cell
      const timeMatch = cellContent.match(
        /(\d{1,2}(?::\d{2})?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
      );
      if (!timeMatch) continue;

      const timeRange = parseTimeRange(timeMatch[1]);
      if (!timeRange) continue;

      // Try to determine which day this cell belongs to by position
      // This is approximate - would need full table parsing for accuracy

      // Look for activity name
      const activityMatch = cellContent.match(
        /(Public\s*Skat(?:e|ing)|Family\s*Skat(?:e|ing)|Adult\s*Skat(?:e|ing)|Drop[- ]?in\s*Skat(?:e|ing)|Stick\s*(?:and|&)\s*Puck|Shinny)/i
      );

      const activity = activityMatch ? activityMatch[1].replace(/\s+/g, ' ').trim() : 'Public Skating';

      // Add for all weekend days as fallback
      for (const day of ['Saturday', 'Sunday']) {
        const dates = getDatesForDay(ctx.now, day);
        for (const date of dates) {
          sessions.push({
            date,
            dayOfWeek: day,
            startTime: timeRange.start,
            endTime: timeRange.end,
            activity,
            location: facility.name,
          });
        }
      }
    }
  }

  return sessions;
}

async function fetchAllSkatingSchedules(ctx: CollectorContext): Promise<SkatingSession[]> {
  // Fetch all facilities in parallel
  const results = await Promise.allSettled(
    FACILITIES.map((facility) => fetchFacilitySchedule(ctx, facility))
  );

  const allSessions: SkatingSession[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allSessions.push(...result.value);
    }
  }

  // Sort by date and time
  allSessions.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  // Deduplicate
  const seen = new Set<string>();
  return allSessions.filter((s) => {
    const key = `${s.date}-${s.startTime}-${s.endTime}-${s.location}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const skatingCollector: CollectorDefinition<SkatingData> = {
  id: 'skating',
  schedule: {
    type: 'cron',
    expression: '0 6 * * *', // Daily at 6 AM
  },
  mode: 'both',
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 2,
    timeoutMs: 60000, // More time for multiple facility fetches
  },

  async collect(ctx) {
    const sessions = await fetchAllSkatingSchedules(ctx);
    const facilities = [...new Set(sessions.map((s) => s.location))];

    return {
      sessions,
      facilities: facilities.length > 0 ? facilities : FACILITIES.map((f) => f.name),
      collectedAt: ctx.now.toISOString(),
    };
  },
};

register(skatingCollector);
