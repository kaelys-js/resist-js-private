<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BackToTopPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BackToTop. */
  export type BackToTopProps = v.InferOutput<typeof BackToTopPropsSchema>;
</script>

<script lang="ts">
  /**
   * BackToTop — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BackToTop />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BackToTopProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BackToTopProps = $derived.by(() => {
    const rawProps: BackToTopProps = stripSvelteProps(allProps);
    const result = safeParse(BackToTopPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BackToTopProps;
  });
</script>

<div data-slot="back-to-top" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
