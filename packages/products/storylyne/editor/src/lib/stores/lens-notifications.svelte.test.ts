/**
 * Tests for the lens notification store.
 *
 * @module
 */

import { describe, expect, it, beforeEach } from 'vitest';
import type { Num } from '@/schemas/common';
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
  type LensNotification,
} from './lens-notifications.svelte';

beforeEach(() => {
  clearAllNotifications();
  resetPreferences();
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
});
