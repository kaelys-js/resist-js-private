/**
 * Lens notification store — reactive state for toast and notification center.
 *
 * Provides a centralized notification system with:
 * - Transient toasts (auto-dismiss)
 * - Persistent notification center entries (bell icon dropdown)
 * - localStorage persistence for notification center
 * - Type-safe notification types and preferences
 */
import * as v from 'valibot';
import type { Bool, Num, Str } from '@/schemas/common';
import { storageKey } from '$lib/config/app-meta';

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

/** Notification severity/type. */
export const NotificationTypeSchema = v.picklist(['info', 'success', 'warning', 'error']);
/** Notification severity/type. */
export type NotificationType = v.InferOutput<typeof NotificationTypeSchema>;

/** Schema for a single notification entry. */
export const LensNotificationSchema = v.strictObject({
  /** Unique notification ID. */
  id: v.string(),
  /** Notification severity/type. */
  type: NotificationTypeSchema,
  /** Short title text. */
  title: v.string(),
  /** Optional longer message body. */
  message: v.optional(v.string()),
  /** Optional action label (e.g. "View component"). */
  actionLabel: v.optional(v.string()),
  /** Optional action href for navigation. */
  actionHref: v.optional(v.string()),
  /** ISO timestamp of when the notification was created. */
  timestamp: v.string(),
  /** Whether the notification has been read. */
  read: v.boolean(),
  /** Optional component name this notification relates to. */
  componentName: v.optional(v.string()),
  /** Optional category for grouping (e.g. "status", "coverage", "dependency", "activity"). */
  category: v.optional(v.string()),
});
/** A single notification entry. */
export type LensNotification = v.InferOutput<typeof LensNotificationSchema>;

/** Schema for notification preferences. */
export const NotificationPreferencesSchema = v.strictObject({
  /** Whether info notifications are enabled. */
  info: v.boolean(),
  /** Whether success notifications are enabled. */
  success: v.boolean(),
  /** Whether warning notifications are enabled. */
  warning: v.boolean(),
  /** Whether error notifications are enabled. */
  error: v.boolean(),
  /** Auto-dismiss duration in milliseconds (0 = no auto-dismiss). */
  autoDismissMs: v.number(),
  /** Whether to show toast popups. */
  showToasts: v.boolean(),
});
/** Notification preferences. */
export type NotificationPreferences = v.InferOutput<typeof NotificationPreferencesSchema>;

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

/** Default notification preferences. */
const DEFAULT_PREFERENCES: NotificationPreferences = {
  info: true,
  success: true,
  warning: true,
  error: true,
  autoDismissMs: 5000,
  showToasts: true,
};

/* ------------------------------------------------------------------ */
/*  Storage keys                                                       */
/* ------------------------------------------------------------------ */

/** localStorage key for notifications. */
const NOTIFICATIONS_KEY: Str = storageKey('lens-notifications');

/** localStorage key for notification preferences. */
const PREFERENCES_KEY: Str = storageKey('lens-notification-prefs');

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

/** All notifications (newest first). */
let notifications: LensNotification[] = $state([]);

/** User notification preferences. */
let preferences: NotificationPreferences = $state({ ...DEFAULT_PREFERENCES });

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */

/**
 * Load notifications and preferences from localStorage.
 * Call once on mount.
 */
export function loadNotifications(): void {
  try {
    const stored: Str | null = localStorage.getItem(NOTIFICATIONS_KEY);
    if (stored) {
      notifications = JSON.parse(stored) as LensNotification[];
    }
  } catch {
    /* localStorage unavailable (SSR/incognito) — default empty is fine */
  }
  try {
    const stored: Str | null = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      preferences = { ...DEFAULT_PREFERENCES, ...(JSON.parse(stored) as NotificationPreferences) };
    }
  } catch {
    /* localStorage unavailable (SSR/incognito) — default prefs are fine */
  }
}

/** Persist notifications to localStorage. */
function persistNotifications(): void {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch {
    /* localStorage unavailable (SSR/incognito) — non-critical */
  }
}

/** Persist preferences to localStorage. */
function persistPreferences(): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    /* localStorage unavailable (SSR/incognito) — non-critical */
  }
}

/* ------------------------------------------------------------------ */
/*  Notification CRUD                                                  */
/* ------------------------------------------------------------------ */

/** Counter for generating unique IDs. */
let idCounter: Num = 0 as Num;

/**
 * Generate a unique notification ID.
 *
 * @returns A unique string ID
 */
function generateId(): Str {
  idCounter = (idCounter + 1) as Num;
  return `lens-notif-${Date.now()}-${idCounter}` as Str;
}

/**
 * Push a new notification.
 *
 * @param opts - Notification options (type, title, message, etc.)
 * @returns The created notification
 */
export function pushNotification(opts: {
  type: NotificationType;
  title: Str;
  message?: Str;
  actionLabel?: Str;
  actionHref?: Str;
  componentName?: Str;
  category?: Str;
}): LensNotification {
  const notif: LensNotification = {
    id: generateId(),
    type: opts.type,
    title: opts.title,
    message: opts.message,
    actionLabel: opts.actionLabel,
    actionHref: opts.actionHref,
    timestamp: new Date().toISOString(),
    read: false,
    componentName: opts.componentName,
    category: opts.category,
  };
  notifications = [notif, ...notifications];
  persistNotifications();
  return notif;
}

/**
 * Push multiple notifications at once (single persist at the end).
 * Use for batch operations to avoid N localStorage writes.
 *
 * @param items - Array of notification option objects
 * @returns Array of created notifications
 */
export function pushNotificationBatch(
  items: Array<{
    type: NotificationType;
    title: Str;
    message?: Str;
    actionLabel?: Str;
    actionHref?: Str;
    componentName?: Str;
    category?: Str;
  }>,
): LensNotification[] {
  const created: LensNotification[] = items.map(
    (opts): LensNotification => ({
      id: generateId(),
      type: opts.type,
      title: opts.title,
      message: opts.message,
      actionLabel: opts.actionLabel,
      actionHref: opts.actionHref,
      timestamp: new Date().toISOString(),
      read: false,
      componentName: opts.componentName,
      category: opts.category,
    }),
  );
  notifications = [...created, ...notifications];
  persistNotifications();
  return created;
}

/**
 * Mark a notification as read.
 *
 * @param id - Notification ID to mark as read
 */
export function markRead(id: Str): void {
  notifications = notifications.map(
    (n: LensNotification): LensNotification => (n.id === id ? { ...n, read: true } : n),
  );
  persistNotifications();
}

/** Mark all notifications as read. */
export function markAllRead(): void {
  notifications = notifications.map(
    (n: LensNotification): LensNotification => ({ ...n, read: true }),
  );
  persistNotifications();
}

/**
 * Remove a single notification.
 *
 * @param id - Notification ID to remove
 */
export function removeNotification(id: Str): void {
  notifications = notifications.filter((n: LensNotification): boolean => n.id !== id);
  persistNotifications();
}

/**
 * Remove all notifications matching a category in a single bulk operation.
 *
 * @param category - Category string to match against
 */
export function removeByCategory(category: Str): void {
  notifications = notifications.filter((n: LensNotification): boolean => n.category !== category);
  persistNotifications();
}

/** Clear all notifications. */
export function clearAllNotifications(): void {
  notifications = [];
  persistNotifications();
}

/* ------------------------------------------------------------------ */
/*  Preferences                                                        */
/* ------------------------------------------------------------------ */

/**
 * Update notification preferences.
 *
 * @param updates - Partial preferences to merge
 */
export function updatePreferences(updates: Partial<NotificationPreferences>): void {
  preferences = { ...preferences, ...updates };
  persistPreferences();
}

/** Reset preferences to defaults. */
export function resetPreferences(): void {
  preferences = { ...DEFAULT_PREFERENCES };
  persistPreferences();
}

/* ------------------------------------------------------------------ */
/*  Derived / accessors                                                */
/* ------------------------------------------------------------------ */

/**
 * Check if a notification type is enabled in preferences.
 *
 * @param type - The notification type to check
 * @returns Whether the type is enabled
 */
export function isTypeEnabled(type: NotificationType): Bool {
  return preferences[type] as Bool;
}

/**
 * Get all notifications (reactive).
 *
 * @returns All notifications array, newest first
 */
export function getNotifications(): LensNotification[] {
  return notifications;
}

/**
 * Get unread count (reactive).
 *
 * @returns Number of unread notifications
 */
export function getUnreadCount(): Num {
  return notifications.filter((n: LensNotification): boolean => !n.read).length as Num;
}

/**
 * Get current preferences (reactive).
 *
 * @returns Current notification preferences
 */
export function getPreferences(): NotificationPreferences {
  return preferences;
}

/**
 * Get notifications grouped by time period.
 *
 * @returns Object with today, thisWeek, and older notification arrays
 */
export function getGroupedNotifications(): {
  today: LensNotification[];
  thisWeek: LensNotification[];
  older: LensNotification[];
} {
  const now: number = Date.now();
  const dayMs: number = 86_400_000;
  const weekMs: number = 604_800_000;

  const today: LensNotification[] = [];
  const thisWeek: LensNotification[] = [];
  const older: LensNotification[] = [];

  for (const n of notifications) {
    const age: number = now - new Date(n.timestamp).getTime();
    if (age < dayMs) {
      today.push(n);
    } else if (age < weekMs) {
      thisWeek.push(n);
    } else {
      older.push(n);
    }
  }
  return { today, thisWeek, older };
}
