<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DateFieldPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DateFieldProps = v.InferOutput<typeof DateFieldPropsSchema>;
</script>

<script lang="ts">
  /**
   * DateField — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DateField />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DateFieldProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DateFieldProps = $derived.by(() => {
    const rawProps: DateFieldProps = stripSvelteProps(allProps);
    const result = safeParse(DateFieldPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DateFieldProps;
  });
</script>

<div data-slot="date-field" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
