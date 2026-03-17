<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SizeGuidePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SizeGuideProps = v.InferOutput<typeof SizeGuidePropsSchema>;
</script>

<script lang="ts">
  /**
   * SizeGuide — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SizeGuide />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SizeGuideProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SizeGuideProps = $derived.by(() => {
    const rawProps: SizeGuideProps = stripSvelteProps(allProps);
    const result = safeParse(SizeGuidePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SizeGuideProps;
  });
</script>

<div data-slot="size-guide" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
