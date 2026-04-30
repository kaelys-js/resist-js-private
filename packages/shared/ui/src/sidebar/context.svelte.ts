/**
 * Sidebar state management via Svelte context.
 *
 * Provides a reactive `SidebarState` class that tracks open/collapsed state
 * for both desktop and mobile, handles the sidebar toggle keyboard shortcut,
 * and exposes context helpers (`setSidebar` / `useSidebar`) for child components.
 *
 * @module
 */

import { IsMobile } from '../hooks/is-mobile.svelte.js';
import { getContext, setContext } from 'svelte';
import type { Bool, Str, Void } from '@/schemas/common';

type Getter<T> = () => T;

/** Props for constructing a SidebarState — open/setOpen for desktop and mobile, plus the keyboard-shortcut character. */
export type SidebarStateProps = {
  /**
   * A getter function that returns the current open state of the sidebar.
   * We use a getter function here to support `bind:open` on the `Sidebar.Provider`
   * component.
   */
  open: Getter<boolean>;

  /**
   * A function that sets the open state of the sidebar. To support `bind:open`, we need
   * a source of truth for changing the open state to ensure it will be synced throughout
   * the sub-components and any `bind:` references.
   */
  setOpen: (open: boolean) => void;

  /**
   * Optional callback that checks whether a keyboard event matches the sidebar
   * toggle shortcut. Each product provides its own shortcut-matching logic.
   * If omitted, the keyboard shortcut handler is a no-op.
   */
  matchToggleShortcut?: (e: KeyboardEvent) => Bool;
};

/**
 * Reactive sidebar state.
 *
 * Tracks desktop open/collapsed and mobile open/closed state, provides a
 * keyboard shortcut handler, and exposes derived `state` and `isMobile` getters.
 * Instantiate via {@link setSidebar} inside the Sidebar.Provider component.
 */
class SidebarState {
  /** Original props passed to the constructor. */
  readonly props: SidebarStateProps;

  /** Whether the sidebar is open on desktop (derived from props getter). */
  open: Bool = $derived.by(() => this.props.open());

  /** Whether the sidebar is open on mobile. */
  openMobile: Bool = $state(false);

  /** Setter for the desktop open state. */
  setOpen: SidebarStateProps['setOpen'];

  #isMobile: IsMobile;

  /** Sidebar expansion state string: `'expanded'` or `'collapsed'`. */
  state: Str = $derived.by(() => (this.open ? 'expanded' : 'collapsed'));

  /** Optional shortcut matcher injected by the consuming product. */
  #matchToggleShortcut?: (e: KeyboardEvent) => Bool;

  /** @param props - Desktop open getter and setter for bind:open support */
  constructor(props: SidebarStateProps) {
    this.setOpen = props.setOpen;
    this.#isMobile = new IsMobile();
    this.#matchToggleShortcut = props.matchToggleShortcut;
    this.props = props;
  }

  /**
   * Whether the current viewport is mobile-sized.
   *
   * Convenience getter so consumers can write `sidebar.isMobile`
   * instead of `sidebar.isMobile.current`.
   *
   * @returns Whether the viewport is mobile-sized
   */
  get isMobile(): Bool {
    return this.#isMobile.current;
  }

  /**
   * Keyboard event handler for the sidebar toggle shortcut.
   *
   * Attach to `<svelte:window on:keydown>`.
   *
   * @param e - The keyboard event to check
   */
  handleShortcutKeydown = (e: KeyboardEvent): Void => {
    if (this.#matchToggleShortcut?.(e)) {
      e.preventDefault();
      this.toggle();
    }
  };

  /**
   * Sets the mobile sidebar open state.
   *
   * @param value - Whether the mobile sidebar should be open
   */
  setOpenMobile = (value: Bool): Void => {
    this.openMobile = value;
  };

  /** Toggles the sidebar open/closed, handling mobile vs desktop. */
  toggle = (): Void => {
    if (this.#isMobile.current) {
      this.openMobile = !this.openMobile;
    } else {
      this.setOpen(!this.open);
    }
  };
}

const SYMBOL_KEY: Str = 'scn-sidebar';

/**
 * Instantiates a new `SidebarState` instance and sets it in the context.
 *
 * @param {SidebarStateProps} props - The constructor props for the `SidebarState` class.
 * @returns {SidebarState} The `SidebarState` instance.
 *
 * @example
 * ```typescript
 * const sidebar = setSidebar({ open: () => isOpen, setOpen: (v) => { isOpen = v; } });
 * ```
 */
export function setSidebar(props: SidebarStateProps): SidebarState {
  return setContext(Symbol.for(SYMBOL_KEY), new SidebarState(props));
}

/**
 * Retrieves the `SidebarState` instance from the context. This is a class instance,
 * so you cannot destructure it.
 *
 * @returns {SidebarState} The `SidebarState` instance.
 *
 * @example
 * ```typescript
 * const sidebar = useSidebar();
 * sidebar.toggle();
 * ```
 */
export function useSidebar(): SidebarState {
  return getContext(Symbol.for(SYMBOL_KEY));
}
