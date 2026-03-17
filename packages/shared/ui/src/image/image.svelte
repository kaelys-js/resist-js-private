<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ImagePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ImageProps = v.InferOutput<typeof ImagePropsSchema>;
</script>

<script lang="ts">
  /**
   * Image — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Image />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ImageProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ImageProps = $derived.by(() => {
    const rawProps: ImageProps = stripSvelteProps(allProps);
    const result = safeParse(ImagePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ImageProps;
  });
</script>

<div data-slot="image" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
