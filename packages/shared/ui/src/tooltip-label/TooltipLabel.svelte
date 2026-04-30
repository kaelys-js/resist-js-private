<script module lang="ts">
  /**
   * TooltipLabel Svelte component — standardised tooltip
   * content with a label and optional `<kbd>` keyboard
   * shortcut badge. Designed to be rendered inside a
   * `<Tooltip.Content>`.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema, BoolSchema } from '@/schemas/common';

  /**
   * Standardized tooltip content with optional keyboard shortcut badge.
   *
   * Use inside `<Tooltip.Content>` to render a label with an optional `<kbd>` shortcut indicator.
   */
  export const TooltipLabelPropsSchema = v.strictObject({
    /** The tooltip text label. @values Toggle Sidebar, Copy to clipboard, Search */
    label: StrSchema,
    /** Optional formatted keyboard shortcut string (e.g. "⌘B"). @values ⌘B, Ctrl+K, Esc */
    shortcutLabel: v.optional(StrSchema),
    /** When true, the kbd badge is always visible instead of hidden on mobile. @values true, false */
    shortcutAlwaysVisible: v.optional(BoolSchema, false),
  });
  /** Caller-visible props (defaults are optional). */
  export type TooltipLabelProps = v.InferInput<typeof TooltipLabelPropsSchema>;
  /** Validated props (post-default — every field present). */
  export type TooltipLabelPropsValidated = v.InferOutput<typeof TooltipLabelPropsSchema>;
</script>

<script lang="ts">
  /**
   * Standardized tooltip content with an optional keyboard shortcut badge.
   *
   * Use inside `<Tooltip.Content>` to render a label with an optional `<Kbd>` indicator.
   */
  import type { Str } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import Kbd from '../kbd/Kbd.svelte';
  import { stripSvelteProps } from '../lens/lens-utils.js';

  const { ...restProps }: TooltipLabelProps = $props();
  const validated: TooltipLabelPropsValidated = $derived.by(() => {
    const rawProps: TooltipLabelProps = stripSvelteProps(restProps);
    const result = safeParse(TooltipLabelPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TooltipLabelPropsValidated;
  });
</script>

{#if validated.shortcutLabel}
  <span class="flex items-center gap-1.5" {...restProps}
    >{validated.label}
    <Kbd
      label={validated.shortcutLabel}
      alwaysVisible={validated.shortcutAlwaysVisible ?? false}
    /></span
  >
{:else}
  {validated.label}
{/if}
