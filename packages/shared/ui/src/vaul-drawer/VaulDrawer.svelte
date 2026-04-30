<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * VaulDrawer Svelte component — mobile-style pull-to-dismiss
   * drawer based on the vaul-svelte primitive. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const VaulDrawerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for VaulDrawer. */
  export type VaulDrawerProps = v.InferOutput<typeof VaulDrawerPropsSchema>;
</script>

<script lang="ts">
  /**
   * VaulDrawer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <VaulDrawer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = VaulDrawerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: VaulDrawerProps = $derived.by(() => {
    const rawProps: VaulDrawerProps = stripSvelteProps(allProps);
    const result = safeParse(VaulDrawerPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as VaulDrawerProps;
  });
</script>

<div data-slot="vaul-drawer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
