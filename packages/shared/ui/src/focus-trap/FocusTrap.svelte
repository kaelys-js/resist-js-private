<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * FocusTrap Svelte component — confines keyboard focus to
   * a sub-tree (e.g. a modal) for accessibility. Placeholder
   * shell awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FocusTrapPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FocusTrap. */
  export type FocusTrapProps = v.InferOutput<typeof FocusTrapPropsSchema>;
</script>

<script lang="ts">
  /**
   * FocusTrap — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FocusTrap />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FocusTrapProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FocusTrapProps = $derived.by(() => {
    const rawProps: FocusTrapProps = stripSvelteProps(allProps);
    const result = safeParse(FocusTrapPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FocusTrapProps;
  });
</script>

<div data-slot="focus-trap" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
