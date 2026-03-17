<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AutosizeTextareaPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AutosizeTextareaProps = v.InferOutput<typeof AutosizeTextareaPropsSchema>;
</script>

<script lang="ts">
  /**
   * AutosizeTextarea — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AutosizeTextarea />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AutosizeTextareaProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AutosizeTextareaProps = $derived.by(() => {
    const rawProps: AutosizeTextareaProps = stripSvelteProps(allProps);
    const result = safeParse(AutosizeTextareaPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AutosizeTextareaProps;
  });
</script>

<div data-slot="autosize-textarea" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
