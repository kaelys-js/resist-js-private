<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * StackTrace Svelte component — formatted display of an
   * error stack with collapsible frames and source links.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StackTracePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for StackTrace. */
  export type StackTraceProps = v.InferOutput<typeof StackTracePropsSchema>;
</script>

<script lang="ts">
  /**
   * StackTrace — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StackTrace />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StackTraceProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StackTraceProps = $derived.by(() => {
    const rawProps: StackTraceProps = stripSvelteProps(allProps);
    const result = safeParse(StackTracePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StackTraceProps;
  });
</script>

<div data-slot="stack-trace" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
