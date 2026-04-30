<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Suspense Svelte component — async loading-fallback
   * wrapper that renders a skeleton/placeholder while
   * children resolve. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SuspensePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Suspense. */
  export type SuspenseProps = v.InferOutput<typeof SuspensePropsSchema>;
</script>

<script lang="ts">
  /**
   * Suspense — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Suspense />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SuspenseProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SuspenseProps = $derived.by(() => {
    const rawProps: SuspenseProps = stripSvelteProps(allProps);
    const result = safeParse(SuspensePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SuspenseProps;
  });
</script>

<div data-slot="suspense" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
