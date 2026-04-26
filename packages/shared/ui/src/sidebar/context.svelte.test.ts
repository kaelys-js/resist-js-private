/**
 * Unit tests for `SidebarState` context helpers.
 *
 * `setContext` / `getContext` require a Svelte component initialisation
 * context. We mount a tiny headless test component that calls `setSidebar`
 * and exposes the resulting instance via a binding, then exercise every
 * branch of `SidebarState` methods against the returned instance.
 *
 * Covers:
 * - both arms of the `state` derived getter (expanded / collapsed)
 * - both arms of the `toggle` method (mobile path vs desktop path)
 * - both arms of the `handleShortcutKeydown` optional-chain (with / without matcher)
 * - `setOpenMobile` state update
 * - `setSidebar` + `useSidebar` round-trip
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import TestHarness from './context-test-harness.svelte';
import type { SidebarStateProps } from './context.svelte.js';

/**
 * Mock matchMedia — jsdom does not implement it.
 *
 * @param matches - Boolean returned by every synthesized MediaQueryList.
 */
function stubMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeEach(() => {
  stubMatchMedia(false);
});

/**
 * Mount the harness, return the sidebar instance + useSidebar-view + cleanup.
 *
 * @param props - Constructor props forwarded to the test harness.
 * @returns Object with the mounted sidebar instance and an `unmount` cleanup callback.
 */
function mountHarness(props: SidebarStateProps): {
  sidebar: ReturnType<typeof mount>;
  unmount: () => void;
} {
  const host: HTMLDivElement = document.createElement('div');
  const instance = mount(TestHarness, { target: host, props: { init: props } }) as {
    getSidebar: () => unknown;
    getRetrieved: () => unknown;
  };
  flushSync();
  return {
    sidebar: instance as never,
    unmount: () => {
      unmount(instance as never);
    },
  };
}

type SidebarInstance = {
  state: string;
  openMobile: boolean;
  isMobile: boolean;
  toggle: () => void;
  setOpenMobile: (v: boolean) => void;
  handleShortcutKeydown: (e: KeyboardEvent) => void;
  props: SidebarStateProps;
};

/**
 * Identity getter used by the `props` field test. Hoisted to the describe-block
 * scope so the lint rule `consistent-function-scoping` is satisfied.
 *
 * @returns Always `true`; the value is irrelevant — only reference identity matters.
 */
const openTrue = (): boolean => true;

describe('SidebarState (via setSidebar / useSidebar)', () => {
  it('`state` returns "expanded" when open getter returns true', () => {
    const { sidebar, unmount: cleanup } = mountHarness({ open: () => true, setOpen: vi.fn() });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    expect(s.state).toBe('expanded');
    cleanup();
  });

  it('`state` returns "collapsed" when open getter returns false', () => {
    const { sidebar, unmount: cleanup } = mountHarness({ open: () => false, setOpen: vi.fn() });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    expect(s.state).toBe('collapsed');
    cleanup();
  });

  it('`toggle()` on desktop calls setOpen with the negated value', () => {
    const setOpen = vi.fn();
    const { sidebar, unmount: cleanup } = mountHarness({ open: () => true, setOpen });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    s.toggle();
    expect(setOpen).toHaveBeenCalledExactlyOnceWith(false);
    cleanup();
  });

  it('`toggle()` on mobile flips openMobile instead of calling setOpen', () => {
    stubMatchMedia(true);
    const setOpen = vi.fn();
    const { sidebar, unmount: cleanup } = mountHarness({ open: () => true, setOpen });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    expect(s.openMobile).toBe(false);
    s.toggle();
    flushSync();
    expect(s.openMobile).toBe(true);
    expect(setOpen).not.toHaveBeenCalled();
    cleanup();
  });

  it('`setOpenMobile` assigns the given value', () => {
    const { sidebar, unmount: cleanup } = mountHarness({ open: () => false, setOpen: vi.fn() });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    s.setOpenMobile(true);
    flushSync();
    expect(s.openMobile).toBe(true);
    s.setOpenMobile(false);
    flushSync();
    expect(s.openMobile).toBe(false);
    cleanup();
  });

  it('`handleShortcutKeydown` no-ops when no matcher is provided', () => {
    const setOpen = vi.fn();
    const { sidebar, unmount: cleanup } = mountHarness({ open: () => false, setOpen });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    const ev: KeyboardEvent = new KeyboardEvent('keydown', { key: 'b' });
    const preventDefault = vi.spyOn(ev, 'preventDefault');
    s.handleShortcutKeydown(ev);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(setOpen).not.toHaveBeenCalled();
    cleanup();
  });

  it('`handleShortcutKeydown` calls preventDefault + toggle when matcher returns true', () => {
    const setOpen = vi.fn();
    const matcher = vi.fn((_e: KeyboardEvent) => true);
    const { sidebar, unmount: cleanup } = mountHarness({
      open: () => true,
      setOpen,
      matchToggleShortcut: matcher,
    });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    const ev: KeyboardEvent = new KeyboardEvent('keydown', { key: 'b' });
    const preventDefault = vi.spyOn(ev, 'preventDefault');
    s.handleShortcutKeydown(ev);
    expect(matcher).toHaveBeenCalledExactlyOnceWith(ev);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(setOpen).toHaveBeenCalledExactlyOnceWith(false);
    cleanup();
  });

  it('`handleShortcutKeydown` does NOT call toggle when matcher returns false', () => {
    const setOpen = vi.fn();
    const matcher = vi.fn((_e: KeyboardEvent) => false);
    const { sidebar, unmount: cleanup } = mountHarness({
      open: () => true,
      setOpen,
      matchToggleShortcut: matcher,
    });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    const ev: KeyboardEvent = new KeyboardEvent('keydown', { key: 'x' });
    const preventDefault = vi.spyOn(ev, 'preventDefault');
    s.handleShortcutKeydown(ev);
    expect(matcher).toHaveBeenCalledOnce();
    expect(preventDefault).not.toHaveBeenCalled();
    expect(setOpen).not.toHaveBeenCalled();
    cleanup();
  });

  it('`useSidebar` returns the same instance set by `setSidebar` in the same context', () => {
    const { sidebar, unmount: cleanup } = mountHarness({ open: () => true, setOpen: vi.fn() });
    const api = sidebar as unknown as {
      getSidebar: () => SidebarInstance;
      getRetrieved: () => SidebarInstance;
    };
    expect(api.getRetrieved()).toBe(api.getSidebar());
    cleanup();
  });

  it('`isMobile` getter reflects matchMedia result', () => {
    stubMatchMedia(true);
    const { sidebar, unmount: cleanup } = mountHarness({ open: () => true, setOpen: vi.fn() });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    expect(s.isMobile).toBe(true);
    cleanup();
  });

  it('`props` field exposes the original constructor props object', () => {
    const setOpen = vi.fn();
    const { sidebar, unmount: cleanup } = mountHarness({ open: openTrue, setOpen });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    expect(s.props.open).toBe(openTrue);
    expect(s.props.setOpen).toBe(setOpen);
    cleanup();
  });
});
