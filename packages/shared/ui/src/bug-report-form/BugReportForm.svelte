<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BugReportFormPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BugReportFormProps = v.InferOutput<typeof BugReportFormPropsSchema>;
</script>

<script lang="ts">
  /**
   * BugReportForm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BugReportForm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BugReportFormProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BugReportFormProps = $derived.by(() => {
    const rawProps: BugReportFormProps = stripSvelteProps(allProps);
    const result = safeParse(BugReportFormPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BugReportFormProps;
  });
</script>

<div data-slot="bug-report-form" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
