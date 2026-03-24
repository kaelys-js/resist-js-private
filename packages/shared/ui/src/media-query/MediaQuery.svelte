<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MediaQueryPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MediaQueryProps = v.InferOutput<typeof MediaQueryPropsSchema>;
</script>

<script lang="ts">
  /**
   * MediaQuery — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MediaQuery />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MediaQueryProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MediaQueryProps = $derived.by(() => {
    const rawProps: MediaQueryProps = stripSvelteProps(allProps);
    const result = safeParse(MediaQueryPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MediaQueryProps;
  });
</script>

<div data-slot="media-query" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
