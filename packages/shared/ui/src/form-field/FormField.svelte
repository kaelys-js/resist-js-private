<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FormFieldPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FormField. */
  export type FormFieldProps = v.InferOutput<typeof FormFieldPropsSchema>;
</script>

<script lang="ts">
  /**
   * FormField — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FormField />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FormFieldProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FormFieldProps = $derived.by(() => {
    const rawProps: FormFieldProps = stripSvelteProps(allProps);
    const result = safeParse(FormFieldPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FormFieldProps;
  });
</script>

<div data-slot="form-field" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
