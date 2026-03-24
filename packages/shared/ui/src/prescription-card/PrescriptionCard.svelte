<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PrescriptionCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PrescriptionCardProps = v.InferOutput<typeof PrescriptionCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * PrescriptionCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PrescriptionCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PrescriptionCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PrescriptionCardProps = $derived.by(() => {
    const rawProps: PrescriptionCardProps = stripSvelteProps(allProps);
    const result = safeParse(PrescriptionCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PrescriptionCardProps;
  });
</script>

<div data-slot="prescription-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
