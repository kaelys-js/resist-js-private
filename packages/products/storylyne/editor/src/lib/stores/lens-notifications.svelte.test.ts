/**
 * Tests for the lens notification store.
 *
 * @module
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Num, Str, NullableStr, Void } from '@/schemas/common';
import { storageKey } from '$lib/config/app-meta';
import {
  pushNotification,
  pushNotificationBatch,
  markRead,
  markAllRead,
  removeNotification,
  removeByCategory,
  clearAllNotifications,
  getNotifications,
  getUnreadCount,
  updatePreferences,
  resetPreferences,
  getPreferences,
  isTypeEnabled,
  getGroupedNotifications,
  loadNotifications,
  type LensNotification,
} from './lens-notifications.svelte';

const _lnStorage = new Map<Str, Str>();
vi.stubGlobal('localStorage', {
  getItem: (key: Str): NullableStr => _lnStorage.get(key) ?? null,
  setItem: (key: Str, value: Str): Void => {
    _lnStorage.set(key, value);
  },
  removeItem: (key: Str): Void => {
    _lnStorage.delete(key);
  },
  clear: (): Void => {
    _lnStorage.clear();
  },
});

beforeEach(() => {
  clearAllNotifications();
  resetPreferences();
  _lnStorage.clear();
});

// ── CRUD ────────────────────────────────────────────────────────────────

describe('notification CRUD', () => {
  it('pushNotification adds notification to store', () => {
    const notif: LensNotification = pushNotification({ type: 'info', title: 'Test' });
    expect(notif.id).toBeDefined();
    expect(notif.type).toBe('info');
    expect(notif.title).toBe('Test');
    expect(notif.read).toBe(false);
    expect(getNotifications()).toHaveLength(1);
  });

  it('pushNotificationBatch adds multiple at once', () => {
    const created = pushNotificationBatch([
      { type: 'info', title: 'First' },
      { type: 'warning', title: 'Second' },
      { type: 'error', title: 'Third' },
    ]);
    expect(created).toHaveLength(3);
    expect(getNotifications()).toHaveLength(3);
  });

  it('markRead marks a notification as read', () => {
    const notif = pushNotification({ type: 'info', title: 'Test' });
    expect(notif.read).toBe(false);

    markRead(notif.id);
    const updated = getNotifications().find((n) => n.id === notif.id);
    expect(updated!.read).toBe(true);
  });

  it('markAllRead marks all as read', () => {
    pushNotification({ type: 'info', title: 'A' });
    pushNotification({ type: 'warning', title: 'B' });
    expect(getUnreadCount()).toBe(2);

    markAllRead();
    expect(getUnreadCount()).toBe(0);
  });

  it('removeNotification removes by ID', () => {
    const notif = pushNotification({ type: 'info', title: 'Remove me' });
    expect(getNotifications()).toHaveLength(1);

    removeNotification(notif.id);
    expect(getNotifications()).toHaveLength(0);
  });

  it('removeByCategory removes matching category', () => {
    pushNotification({ type: 'info', title: 'A', category: 'status' });
    pushNotification({ type: 'info', title: 'B', category: 'activity' });
    pushNotification({ type: 'info', title: 'C', category: 'status' });
    expect(getNotifications()).toHaveLength(3);

    removeByCategory('status');
    expect(getNotifications()).toHaveLength(1);
    expect(getNotifications()[0]!.category).toBe('activity');
  });

  it('clearAllNotifications empties the store', () => {
    pushNotification({ type: 'info', title: 'A' });
    pushNotification({ type: 'info', title: 'B' });
    clearAllNotifications();
    expect(getNotifications()).toHaveLength(0);
  });
});

// ── Counts ──────────────────────────────────────────────────────────────

describe('getUnreadCount', () => {
  it('returns correct unread count', () => {
    pushNotification({ type: 'info', title: 'A' });
    pushNotification({ type: 'info', title: 'B' });
    const notif = pushNotification({ type: 'info', title: 'C' });
    markRead(notif.id);

    const count: Num = getUnreadCount();
    expect(count).toBe(2);
  });
});

// ── Preferences ─────────────────────────────────────────────────────────

describe('preferences', () => {
  it('updatePreferences merges partial updates', () => {
    updatePreferences({ autoDismissMs: 3000, showToasts: false });
    const prefs = getPreferences();
    expect(prefs.autoDismissMs).toBe(3000);
    expect(prefs.showToasts).toBe(false);
    // Unchanged defaults preserved
    expect(prefs.info).toBe(true);
    expect(prefs.error).toBe(true);
  });

  it('isTypeEnabled returns preference value', () => {
    expect(isTypeEnabled('info')).toBe(true);
    updatePreferences({ info: false });
    expect(isTypeEnabled('info')).toBe(false);
  });

  it('resetPreferences restores defaults', () => {
    updatePreferences({ showToasts: false, autoDismissMs: 0 });
    resetPreferences();
    const prefs = getPreferences();
    expect(prefs.showToasts).toBe(true);
    expect(prefs.autoDismissMs).toBe(5000);
  });
});

// ── Grouping ────────────────────────────────────────────────────────────

describe('getGroupedNotifications', () => {
  it('groups notifications by time period', () => {
    // Push a fresh notification (today)
    pushNotification({ type: 'info', title: 'Today' });

    const grouped = getGroupedNotifications();
    expect(grouped.today).toHaveLength(1);
    expect(grouped.thisWeek).toHaveLength(0);
    expect(grouped.older).toHaveLength(0);
  });

  it('places notifications older than 7 days in older bucket', () => {
    /* Push a fresh notification, then mutate its timestamp to 30 days ago to
     * exercise the `else` branch (line 364). pushNotification writes through
     * the store which keeps a live array — the in-store entry can be mutated
     * by mutating the returned object since both reference the same record. */
    const fresh: LensNotification = pushNotification({ type: 'info', title: 'Old' });
    const all: LensNotification[] = getNotifications();
    /* Mutate the timestamp on the in-store notification. */
    const stored = all.find((n) => n.id === fresh.id);
    expect(stored).toBeDefined();
    const thirtyDaysAgo: Str = new Date(Date.now() - 30 * 86_400_000).toISOString();
    (stored as LensNotification).timestamp = thirtyDaysAgo;

    const grouped = getGroupedNotifications();
    expect(grouped.today).toHaveLength(0);
    expect(grouped.thisWeek).toHaveLength(0);
    expect(grouped.older).toHaveLength(1);
    expect(grouped.older[0]?.id).toBe(fresh.id);
  });

  it('places notifications between 1 and 7 days old in thisWeek bucket', () => {
    const fresh: LensNotification = pushNotification({ type: 'info', title: 'Mid' });
    const stored = getNotifications().find((n) => n.id === fresh.id) as LensNotification;
    const threeDaysAgo: Str = new Date(Date.now() - 3 * 86_400_000).toISOString();
    stored.timestamp = threeDaysAgo;

    const grouped = getGroupedNotifications();
    expect(grouped.today).toHaveLength(0);
    expect(grouped.thisWeek).toHaveLength(1);
    expect(grouped.older).toHaveLength(0);
  });
});

// ── loadNotifications ────────────────────────────────────────────────────

describe('loadNotifications', () => {
  it('restores notifications from localStorage', () => {
    const sample: LensNotification[] = [
      {
        id: 'n1',
        type: 'info',
        title: 'Restored',
        timestamp: new Date().toISOString(),
        read: false,
      },
    ];
    _lnStorage.set(storageKey('lens-notifications'), JSON.stringify(sample));
    loadNotifications();
    const all: LensNotification[] = getNotifications();
    expect(all).toHaveLength(1);
    expect(all[0]?.id).toBe('n1');
    expect(all[0]?.title).toBe('Restored');
  });

  it('restores preferences from localStorage and merges with defaults', () => {
    /* Partial payload — only override `showToasts`; defaults must fill the rest. */
    _lnStorage.set(
      storageKey('lens-notification-prefs'),
      JSON.stringify({ showToasts: false, autoDismissMs: 9999 }),
    );
    loadNotifications();
    const prefs = getPreferences();
    expect(prefs.showToasts).toBe(false);
    expect(prefs.autoDismissMs).toBe(9999);
    /* Unset keys must keep defaults. */
    expect(prefs.info).toBe(true);
    expect(prefs.error).toBe(true);
  });

  it('noops cleanly when localStorage is empty', () => {
    /* No keys present — both early-return paths (line 112 false, line 120 false). */
    loadNotifications();
    expect(getNotifications()).toHaveLength(0);
    expect(getPreferences().showToasts).toBe(true);
  });

  it('swallows JSON.parse errors for notifications and preferences', () => {
    _lnStorage.set(storageKey('lens-notifications'), 'not-valid-json');
    _lnStorage.set(storageKey('lens-notification-prefs'), 'also-not-json');
    /* Must not throw — both try/catch arms must be exercised. */
    expect(() => loadNotifications()).not.toThrow();
    expect(getNotifications()).toHaveLength(0);
    expect(getPreferences().showToasts).toBe(true);
  });
});
