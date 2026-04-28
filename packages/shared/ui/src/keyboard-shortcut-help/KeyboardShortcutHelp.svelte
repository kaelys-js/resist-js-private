<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * KeyboardShortcutHelp Svelte component — overlay listing
   * available keyboard shortcuts grouped by category.
   * Placeholder shell awaiting full implementation; ships with a
   * class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const KeyboardShortcutHelpPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for KeyboardShortcutHelp. */
  export type KeyboardShortcutHelpProps = v.InferOutput<typeof KeyboardShortcutHelpPropsSchema>;
</script>

<script lang="ts">
  /**
   * KeyboardShortcutHelp — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <KeyboardShortcutHelp />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = KeyboardShortcutHelpProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: KeyboardShortcutHelpProps = $derived.by(() => {
    const rawProps: KeyboardShortcutHelpProps = stripSvelteProps(allProps);
    const result = safeParse(KeyboardShortcutHelpPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as KeyboardShortcutHelpProps;
  });
</script>

<div data-slot="keyboard-shortcut-help" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
