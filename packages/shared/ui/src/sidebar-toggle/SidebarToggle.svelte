<script module lang="ts">
  /**
   * SidebarToggle Svelte component — sidebar collapse/expand
   * trigger button wrapped in a tooltip showing the
   * localized label and keyboard shortcut, followed by a
   * vertical separator. Per-product editors supply their own
   * label and formatted shortcut string.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  /**
   * Props for the shared SidebarToggle component.
   *
   * Each product editor provides its own locale label and formatted shortcut string.
   */
  export const SidebarTogglePropsSchema = v.strictObject({
    /** Localized "Toggle Sidebar" label for the tooltip. @values Toggle Sidebar, Show/Hide Sidebar, Sidebar */
    label: StrSchema,
    /** Formatted keyboard shortcut display string (e.g. "⌘B"). @values ⌘B, Ctrl+B, ⌘\\ */
    shortcutLabel: StrSchema,
  });
  /** Public component props for SidebarToggle. */
  export type SidebarToggleProps = v.InferOutput<typeof SidebarTogglePropsSchema>;
</script>

<script lang="ts">
  /**
   * Sidebar toggle button with a tooltip showing the label and keyboard shortcut.
   *
   * Renders the sidebar trigger wrapped in a tooltip, followed by a vertical separator.
   */
  import type { Str } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import * as Sidebar from '../sidebar/index.js';
  import * as Tooltip from '../tooltip/index.js';
  import { Separator } from '../separator/index.js';
  import TooltipLabel from '../tooltip-label/TooltipLabel.svelte';
  import { stripSvelteProps } from '../lens/lens-utils.js';

  const { ...restProps }: SidebarToggleProps = $props();
  const validated: SidebarToggleProps = $derived.by(() => {
    const rawProps: SidebarToggleProps = stripSvelteProps(restProps);
    const result = safeParse(SidebarTogglePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SidebarToggleProps;
  });
</script>

<Tooltip.Root delayDuration={700} {...restProps}>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      <Sidebar.Trigger class="-ml-1" {...props} />
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Content side="right" sideOffset={4}>
    <TooltipLabel label={validated.label} shortcutLabel={validated.shortcutLabel} />
  </Tooltip.Content>
</Tooltip.Root>
<Separator orientation="vertical" role="separator" class="mx-2 data-[orientation=vertical]:h-4" />
