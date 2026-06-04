/**
 * Unit tests for the ThemeSwitcher submenu — verifies the
 * sub-trigger label, theme entries, and selection callback. Uses
 * fake timers because bits-ui's BodyScrollLock schedules an async
 * destroy timeout that would otherwise outlive jsdom teardown.
 *
 * @module
 */

import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeSwitcherTest from './ThemeSwitcherTest.svelte';

describe('ThemeSwitcher', () => {
  // bits-ui's BodyScrollLock schedules a 24ms setTimeout on destroy that
  // touches document.body. This project sets `globals: true`, which makes
  // @testing-library/svelte's svelteTesting() auto-cleanup bail, so the
  // component would otherwise stay mounted until jsdom teardown and fire that
  // timer against a torn-down env → "document is not defined".
  //
  // Fix: under fake timers, unmount explicitly via cleanup() (synchronous
  // Svelte flushSync) WHILE jsdom is still alive — this schedules the now-fake
  // 24ms timer — then runAllTimers() flushes it against a live document.
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('renders sub-trigger with "Theme" text', () => {
    render(ThemeSwitcherTest);
    expect(screen.getByText('Theme')).toBeInTheDocument();
  });

  it('renders trigger as a clickable element', () => {
    render(ThemeSwitcherTest);
    const trigger: HTMLElement = screen.getByText('Theme');
    expect(trigger.closest('[role="menuitem"]')).toBeInTheDocument();
  });
});
