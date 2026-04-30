<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * DynamicForm Svelte component — schema-driven form builder
   * that renders fields from a runtime schema definition.
   * Placeholder shell awaiting full implementation; ships with a
   * class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DynamicFormPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DynamicForm. */
  export type DynamicFormProps = v.InferOutput<typeof DynamicFormPropsSchema>;
</script>

<script lang="ts">
  /**
   * DynamicForm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DynamicForm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DynamicFormProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DynamicFormProps = $derived.by(() => {
    const rawProps: DynamicFormProps = stripSvelteProps(allProps);
    const result = safeParse(DynamicFormPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DynamicFormProps;
  });
</script>

<div data-slot="dynamic-form" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
