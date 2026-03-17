<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AbTestResultsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AbTestResultsProps = v.InferOutput<typeof AbTestResultsPropsSchema>;
</script>

<script lang="ts">
  /**
   * AbTestResults — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AbTestResults />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AbTestResultsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AbTestResultsProps = $derived.by(() => {
    const rawProps: AbTestResultsProps = stripSvelteProps(allProps);
    const result = safeParse(AbTestResultsPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AbTestResultsProps;
  });
</script>

<div data-slot="ab-test-results" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
