<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ResultPage Svelte component — full-page success/error
   * status screen with icon, title, message, and action
   * buttons. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ResultPagePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ResultPage. */
  export type ResultPageProps = v.InferOutput<typeof ResultPagePropsSchema>;
</script>

<script lang="ts">
  /**
   * ResultPage — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ResultPage />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ResultPageProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ResultPageProps = $derived.by(() => {
    const rawProps: ResultPageProps = stripSvelteProps(allProps);
    const result = safeParse(ResultPagePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ResultPageProps;
  });
</script>

<div data-slot="result-page" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
