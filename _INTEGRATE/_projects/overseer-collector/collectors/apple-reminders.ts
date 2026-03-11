import { register } from '../src/registry.js';
import type { CollectorDefinition, LocalContext } from '../src/types.js';
import { DEFAULT_RETRY_POLICY, isLocalContext } from '../src/types.js';

interface Reminder {
  title: string;
  dueDate?: string;
  isCompleted: boolean;
  priority: number; // 0 = none, 1 = high, 5 = medium, 9 = low
  notes?: string;
  list: string;
}

interface AppleRemindersData {
  reminders: Reminder[];
  lists: string[];
  timeframeDays: number;
  collectedAt: string;
}

// ekctl JSON response types
interface EkctlReminder {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string | null;
  priority: number;
  notes?: string | null;
  list: {
    id: string;
    title: string;
  };
}

interface EkctlRemindersResponse {
  count: number;
  reminders: EkctlReminder[];
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

async function fetchAppleReminders(
  exec: LocalContext['exec'],
  now: Date,
  timeframeDays: number
): Promise<{ reminders: Reminder[]; lists: string[] }> {
  // Get all reminder lists using ekctl
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

  const reminderLists = calendarsData.calendars.filter(c => c.type === 'reminder');
  if (reminderLists.length === 0) {
    return { reminders: [], lists: [] };
  }

  // Calculate date range
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + timeframeDays);

  const allReminders: Reminder[] = [];
  const listNames: string[] = [];

  // Fetch reminders from each list
  for (const list of reminderLists) {
    listNames.push(list.title);

    const remindersResult = await exec(`ekctl list reminders --list "${list.id}" 2>&1`);
    if (remindersResult.exitCode !== 0) {
      console.error(`Failed to fetch reminders from ${list.title}: ${remindersResult.stderr}`);
      continue;
    }

    let remindersData: EkctlRemindersResponse;
    try {
      remindersData = JSON.parse(remindersResult.stdout);
    } catch {
      console.error(`Failed to parse reminders from ${list.title}`);
      continue;
    }

    for (const rem of remindersData.reminders) {
      // Skip completed reminders
      if (rem.completed) continue;

      // Filter by due date if present
      if (rem.dueDate) {
        const dueTime = new Date(rem.dueDate).getTime();
        // Include if due date is within range (from now to timeframeDays ahead)
        // Also include overdue items
        if (dueTime > endDate.getTime()) {
          continue;
        }
      }

      allReminders.push({
        title: rem.title,
        dueDate: rem.dueDate || undefined,
        isCompleted: rem.completed,
        priority: rem.priority,
        notes: rem.notes ? (rem.notes.length > 500 ? rem.notes.slice(0, 497) + '...' : rem.notes) : undefined,
        list: rem.list.title,
      });
    }
  }

  // Sort: items with due dates first (by date), then items without due dates (by priority)
  allReminders.sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return a.priority - b.priority;
  });

  return { reminders: allReminders, lists: listNames.sort() };
}

const appleRemindersCollector: CollectorDefinition<AppleRemindersData> = {
  id: 'apple-reminders',
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
      throw new Error('apple-reminders collector requires local runtime with exec()');
    }

    const { reminders, lists } = await fetchAppleReminders(
      ctx.exec,
      ctx.now,
      DEFAULT_TIMEFRAME_DAYS
    );

    return {
      reminders,
      lists,
      timeframeDays: DEFAULT_TIMEFRAME_DAYS,
      collectedAt: ctx.now.toISOString(),
    };
  },
};

register(appleRemindersCollector);
