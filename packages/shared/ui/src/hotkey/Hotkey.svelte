<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const HotkeyPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type HotkeyProps = v.InferOutput<typeof HotkeyPropsSchema>;
</script>

<script lang="ts">
  /**
   * Hotkey — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Hotkey />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = HotkeyProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: HotkeyProps = $derived.by(() => {
    const rawProps: HotkeyProps = stripSvelteProps(allProps);
    const result = safeParse(HotkeyPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HotkeyProps;
  });
</script>

<div data-slot="hotkey" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
