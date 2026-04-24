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

/** Mock matchMedia — jsdom does not implement it. */
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

/** Mount the harness, return the sidebar instance + useSidebar-view + cleanup. */
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

describe('SidebarState (via setSidebar / useSidebar)', () => {
  it('`state` returns "expanded" when open getter returns true', () => {
    const { sidebar, unmount } = mountHarness({ open: () => true, setOpen: vi.fn() });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    expect(s.state).toBe('expanded');
    unmount();
  });

  it('`state` returns "collapsed" when open getter returns false', () => {
    const { sidebar, unmount } = mountHarness({ open: () => false, setOpen: vi.fn() });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    expect(s.state).toBe('collapsed');
    unmount();
  });

  it('`toggle()` on desktop calls setOpen with the negated value', () => {
    const setOpen = vi.fn();
    const { sidebar, unmount } = mountHarness({ open: () => true, setOpen });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    s.toggle();
    expect(setOpen).toHaveBeenCalledExactlyOnceWith(false);
    unmount();
  });

  it('`toggle()` on mobile flips openMobile instead of calling setOpen', () => {
    stubMatchMedia(true);
    const setOpen = vi.fn();
    const { sidebar, unmount } = mountHarness({ open: () => true, setOpen });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    expect(s.openMobile).toBe(false);
    s.toggle();
    flushSync();
    expect(s.openMobile).toBe(true);
    expect(setOpen).not.toHaveBeenCalled();
    unmount();
  });

  it('`setOpenMobile` assigns the given value', () => {
    const { sidebar, unmount } = mountHarness({ open: () => false, setOpen: vi.fn() });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    s.setOpenMobile(true);
    flushSync();
    expect(s.openMobile).toBe(true);
    s.setOpenMobile(false);
    flushSync();
    expect(s.openMobile).toBe(false);
    unmount();
  });

  it('`handleShortcutKeydown` no-ops when no matcher is provided', () => {
    const setOpen = vi.fn();
    const { sidebar, unmount } = mountHarness({ open: () => false, setOpen });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    const ev: KeyboardEvent = new KeyboardEvent('keydown', { key: 'b' });
    const preventDefault = vi.spyOn(ev, 'preventDefault');
    s.handleShortcutKeydown(ev);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(setOpen).not.toHaveBeenCalled();
    unmount();
  });

  it('`handleShortcutKeydown` calls preventDefault + toggle when matcher returns true', () => {
    const setOpen = vi.fn();
    const matcher = vi.fn((_e: KeyboardEvent) => true);
    const { sidebar, unmount } = mountHarness({
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
    unmount();
  });

  it('`handleShortcutKeydown` does NOT call toggle when matcher returns false', () => {
    const setOpen = vi.fn();
    const matcher = vi.fn((_e: KeyboardEvent) => false);
    const { sidebar, unmount } = mountHarness({
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
    unmount();
  });

  it('`useSidebar` returns the same instance set by `setSidebar` in the same context', () => {
    const { sidebar, unmount } = mountHarness({ open: () => true, setOpen: vi.fn() });
    const api = sidebar as unknown as {
      getSidebar: () => SidebarInstance;
      getRetrieved: () => SidebarInstance;
    };
    expect(api.getRetrieved()).toBe(api.getSidebar());
    unmount();
  });

  it('`isMobile` getter reflects matchMedia result', () => {
    stubMatchMedia(true);
    const { sidebar, unmount } = mountHarness({ open: () => true, setOpen: vi.fn() });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    expect(s.isMobile).toBe(true);
    unmount();
  });

  it('`props` field exposes the original constructor props object', () => {
    const open = () => true;
    const setOpen = vi.fn();
    const { sidebar, unmount } = mountHarness({ open, setOpen });
    const s = (sidebar as unknown as { getSidebar: () => SidebarInstance }).getSidebar();
    expect(s.props.open).toBe(open);
    expect(s.props.setOpen).toBe(setOpen);
    unmount();
  });
});
