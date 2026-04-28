<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * IntersectionObserver Svelte component — viewport
   * intersection detection wrapper for triggering effects when
   * a child enters / leaves the viewport. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const IntersectionObserverPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for IntersectionObserver. */
  export type IntersectionObserverProps = v.InferOutput<typeof IntersectionObserverPropsSchema>;
</script>

<script lang="ts">
  /**
   * IntersectionObserver — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <IntersectionObserver />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = IntersectionObserverProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: IntersectionObserverProps = $derived.by(() => {
    const rawProps: IntersectionObserverProps = stripSvelteProps(allProps);
    const result = safeParse(IntersectionObserverPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as IntersectionObserverProps;
  });
</script>

<div data-slot="intersection-observer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
