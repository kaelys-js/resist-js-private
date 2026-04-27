<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PatientCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PatientCard. */
  export type PatientCardProps = v.InferOutput<typeof PatientCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * PatientCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PatientCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PatientCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PatientCardProps = $derived.by(() => {
    const rawProps: PatientCardProps = stripSvelteProps(allProps);
    const result = safeParse(PatientCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PatientCardProps;
  });
</script>

<div data-slot="patient-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
