<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema, BoolSchema } from '@/schemas/common';

  /**
   * Styled keyboard shortcut badge.
   *
   * Renders a `<kbd>` element with consistent styling for displaying keyboard shortcuts.
   * By default hidden on mobile and shown on `md+` breakpoints; set `alwaysVisible` to override.
   */
  export const KbdPropsSchema = v.strictObject({
    /** The formatted shortcut string (e.g. "⌘B", "Ctrl+1", "Esc"). @values ⌘B, Ctrl+K, Esc, ⌘⇧P */
    label: StrSchema,
    /** When true, the badge is always visible instead of hidden on mobile. @values true, false */
    alwaysVisible: v.optional(BoolSchema),
    /** Additional CSS classes. */
    class: v.optional(StrSchema),
  });
  export type KbdProps = v.InferOutput<typeof KbdPropsSchema>;
</script>

<script lang="ts">
  /**
   * Keyboard shortcut badge rendered as a styled `<kbd>` element.
   *
   * Hidden on mobile by default; set `alwaysVisible` to show on all breakpoints.
   */
  import type { Str } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';

  const allProps: KbdProps = $props();
  const validated: KbdProps = $derived.by(() => {
    const rawProps: KbdProps = stripSvelteProps(allProps);
    const result = safeParse(KbdPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as KbdProps;
  });
</script>

<kbd
  class="{(validated.alwaysVisible ?? false)
    ? 'inline-flex'
    : 'hidden md:inline-flex'} items-center rounded border border-border bg-secondary px-1.5 py-0.5 text-xs font-mono leading-none text-muted-foreground shadow-sm {validated.class ??
    ''}">{validated.label}</kbd
>
