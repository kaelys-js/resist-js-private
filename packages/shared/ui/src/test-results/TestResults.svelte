<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * `@/ui` TestResults — lens component that renders test-suite results.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TestResultsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Props accepted by the {@link TestResults} component. See {@link TestResultsPropsSchema}. */
  export type TestResultsProps = v.InferOutput<typeof TestResultsPropsSchema>;
</script>

<script lang="ts">
  /**
   * TestResults — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TestResults />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TestResultsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TestResultsProps = $derived.by(() => {
    const rawProps: TestResultsProps = stripSvelteProps(allProps);
    const result = safeParse(TestResultsPropsSchema, rawProps);

    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TestResultsProps;
  });
</script>

<div data-slot="test-results" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
