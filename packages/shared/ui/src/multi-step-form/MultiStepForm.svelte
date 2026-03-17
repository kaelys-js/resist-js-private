<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MultiStepFormPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MultiStepFormProps = v.InferOutput<typeof MultiStepFormPropsSchema>;
</script>

<script lang="ts">
  /**
   * MultiStepForm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MultiStepForm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MultiStepFormProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MultiStepFormProps = $derived.by(() => {
    const rawProps: MultiStepFormProps = stripSvelteProps(allProps);
    const result = safeParse(MultiStepFormPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MultiStepFormProps;
  });
</script>

<div data-slot="multi-step-form" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
