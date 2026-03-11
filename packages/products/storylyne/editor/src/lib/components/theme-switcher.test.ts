import { render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeSwitcherTest from './ThemeSwitcherTest.svelte';

describe('ThemeSwitcher', () => {
  // bits-ui's BodyScrollLock schedules a 24ms setTimeout on destroy.
  // Without fake timers, the callback fires after jsdom teardown → "document is not defined".
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
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
