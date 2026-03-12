<script lang="ts">
  /**
   * Sidebar context and state provider that manages open/closed state and keyboard shortcuts.
   *
   * Wraps children in a Tooltip.Provider and sets CSS custom properties for sidebar widths.
   */
  import * as Tooltip from '../tooltip/index.js';
  import { cn, type WithElementRef } from '../utils.js';
  import type { HTMLAttributes } from 'svelte/elements';
  import { persistSidebarState, SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON } from './constants.js';
  import { setSidebar } from './context.svelte.js';
  import type { Bool } from '@/schemas/common';

  let {
    /** The underlying DOM element reference. */
    ref = $bindable(null),
    /** Whether the sidebar is expanded. */
    open = $bindable(true),
    /** Callback when the open state changes. */
    onOpenChange = (_open: boolean) => {
      /* no-op default — caller may override */
    },
    /** Optional callback to match the sidebar toggle keyboard shortcut. */
    matchToggleShortcut,
    /** Additional CSS classes to apply. */
    class: className,
    /** Inline styles for CSS custom properties. */
    style,
    /** The sidebar and main content. */
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Optional callback to match the sidebar toggle keyboard shortcut. */
    matchToggleShortcut?: (e: KeyboardEvent) => Bool;
  } = $props();

  const sidebar = setSidebar({
    open: () => open,
    setOpen: (value: boolean) => {
      open = value;
      onOpenChange(value);
      persistSidebarState(open);
    },
    matchToggleShortcut,
  });
</script>

<svelte:window onkeydown={sidebar.handleShortcutKeydown} />

<Tooltip.Provider delayDuration={0}>
  <div
    data-slot="sidebar-wrapper"
    style="--sidebar-width: {SIDEBAR_WIDTH}; --sidebar-width-icon: {SIDEBAR_WIDTH_ICON}; {style}"
    class={cn(
      'group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full',
      className,
    )}
    bind:this={ref}
    {...restProps}
  >
    {@render children?.()}
  </div>
</Tooltip.Provider>
