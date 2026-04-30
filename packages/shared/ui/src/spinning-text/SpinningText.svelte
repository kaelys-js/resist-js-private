<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SpinningText Svelte component — text laid out around a
   * circle that rotates continuously for decorative
   * emphasis. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SpinningTextPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SpinningText. */
  export type SpinningTextProps = v.InferOutput<typeof SpinningTextPropsSchema>;
</script>

<script lang="ts">
  /**
   * SpinningText — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SpinningText />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SpinningTextProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SpinningTextProps = $derived.by(() => {
    const rawProps: SpinningTextProps = stripSvelteProps(allProps);
    const result = safeParse(SpinningTextPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SpinningTextProps;
  });
</script>

<div data-slot="spinning-text" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
