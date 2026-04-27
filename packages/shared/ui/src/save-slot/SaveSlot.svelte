<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SaveSlotPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SaveSlot. */
  export type SaveSlotProps = v.InferOutput<typeof SaveSlotPropsSchema>;
</script>

<script lang="ts">
  /**
   * SaveSlot — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SaveSlot />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SaveSlotProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SaveSlotProps = $derived.by(() => {
    const rawProps: SaveSlotProps = stripSvelteProps(allProps);
    const result = safeParse(SaveSlotPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SaveSlotProps;
  });
</script>

<div data-slot="save-slot" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
