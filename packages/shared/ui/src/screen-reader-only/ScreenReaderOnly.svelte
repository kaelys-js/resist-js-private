<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ScreenReaderOnlyPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ScreenReaderOnly. */
  export type ScreenReaderOnlyProps = v.InferOutput<typeof ScreenReaderOnlyPropsSchema>;
</script>

<script lang="ts">
  /**
   * ScreenReaderOnly — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ScreenReaderOnly />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ScreenReaderOnlyProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ScreenReaderOnlyProps = $derived.by(() => {
    const rawProps: ScreenReaderOnlyProps = stripSvelteProps(allProps);
    const result = safeParse(ScreenReaderOnlyPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ScreenReaderOnlyProps;
  });
</script>

<div data-slot="screen-reader-only" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
