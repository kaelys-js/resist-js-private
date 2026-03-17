<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ScrollShadowPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ScrollShadowProps = v.InferOutput<typeof ScrollShadowPropsSchema>;
</script>

<script lang="ts">
  /**
   * ScrollShadow — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ScrollShadow />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ScrollShadowProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ScrollShadowProps = $derived.by(() => {
    const rawProps: ScrollShadowProps = stripSvelteProps(allProps);
    const result = safeParse(ScrollShadowPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ScrollShadowProps;
  });
</script>

<div data-slot="scroll-shadow" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
