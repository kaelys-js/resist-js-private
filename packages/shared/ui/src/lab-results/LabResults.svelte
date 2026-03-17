<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LabResultsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type LabResultsProps = v.InferOutput<typeof LabResultsPropsSchema>;
</script>

<script lang="ts">
  /**
   * LabResults — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LabResults />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LabResultsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LabResultsProps = $derived.by(() => {
    const rawProps: LabResultsProps = stripSvelteProps(allProps);
    const result = safeParse(LabResultsPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LabResultsProps;
  });
</script>

<div data-slot="lab-results" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
