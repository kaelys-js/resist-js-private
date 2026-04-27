<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ConditionalFormPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ConditionalForm. */
  export type ConditionalFormProps = v.InferOutput<typeof ConditionalFormPropsSchema>;
</script>

<script lang="ts">
  /**
   * ConditionalForm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ConditionalForm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ConditionalFormProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ConditionalFormProps = $derived.by(() => {
    const rawProps: ConditionalFormProps = stripSvelteProps(allProps);
    const result = safeParse(ConditionalFormPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ConditionalFormProps;
  });
</script>

<div data-slot="conditional-form" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
