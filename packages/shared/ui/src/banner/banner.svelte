<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BannerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Banner. */
  export type BannerProps = v.InferOutput<typeof BannerPropsSchema>;
</script>

<script lang="ts">
  /**
   * Banner — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Banner />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BannerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BannerProps = $derived.by(() => {
    const rawProps: BannerProps = stripSvelteProps(allProps);
    const result = safeParse(BannerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BannerProps;
  });
</script>

<div data-slot="banner" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
