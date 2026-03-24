<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GalleriaPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type GalleriaProps = v.InferOutput<typeof GalleriaPropsSchema>;
</script>

<script lang="ts">
  /**
   * Galleria — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Galleria />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GalleriaProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GalleriaProps = $derived.by(() => {
    const rawProps: GalleriaProps = stripSvelteProps(allProps);
    const result = safeParse(GalleriaPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GalleriaProps;
  });
</script>

<div data-slot="galleria" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
