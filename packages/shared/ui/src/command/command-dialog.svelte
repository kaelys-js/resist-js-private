<script lang="ts">
  /**
   * A dialog-wrapped command palette that opens as a modal overlay.
   *
   * Combines Dialog and Command primitives into a single component with accessible title/description and a bindable open state.
   */
  import type { Command as CommandPrimitive, Dialog as DialogPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import Command from './command.svelte';
  import * as Dialog from '../dialog/index.js';
  import type { WithoutChildrenOrChild } from '../utils.js';

  let {
    /** Whether the command dialog is open. */
    open = $bindable(false),
    /** The underlying DOM element reference. */
    ref = $bindable(null),
    /** The current search query. @values search, filter, find */
    value = $bindable(''),
    /** Accessible title for screen readers. @values Command Palette, Search, Actions */
    title = 'Command Palette',
    /** Accessible description for screen readers. @values Search for a command to run, Type to search, Find an action */
    description = 'Search for a command to run',
    /** Props forwarded to the portal wrapper. */
    portalProps,
    /** The command palette content (input, groups, items). */
    children,
    ...restProps
  }: WithoutChildrenOrChild<DialogPrimitive.RootProps> &
    WithoutChildrenOrChild<CommandPrimitive.RootProps> & {
      portalProps?: DialogPrimitive.PortalProps;
      children: Snippet;
      title?: string;
      description?: string;
    } = $props();
</script>

<Dialog.Root bind:open {...restProps}>
  <Dialog.Header class="sr-only">
    <Dialog.Title>{title}</Dialog.Title>
    <Dialog.Description>{description}</Dialog.Description>
  </Dialog.Header>
  <Dialog.Content class="overflow-hidden p-0" {portalProps}>
    <Command
      class="**:data-[slot=command-input-wrapper]:h-12 [&_[data-command-group]]:px-2 [&_[data-command-group]:not([hidden])_~[data-command-group]]:pt-0 [&_[data-command-input-wrapper]_svg]:h-5 [&_[data-command-input-wrapper]_svg]:w-5 [&_[data-command-input]]:h-12 [&_[data-command-item]]:px-2 [&_[data-command-item]]:py-3 [&_[data-command-item]_svg]:h-5 [&_[data-command-item]_svg]:w-5"
      {...restProps}
      bind:value
      bind:ref
      {children}
    />
  </Dialog.Content>
</Dialog.Root>
