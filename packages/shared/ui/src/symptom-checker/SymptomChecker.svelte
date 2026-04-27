<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SymptomCheckerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SymptomChecker. */
  export type SymptomCheckerProps = v.InferOutput<typeof SymptomCheckerPropsSchema>;
</script>

<script lang="ts">
  /**
   * SymptomChecker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SymptomChecker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SymptomCheckerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SymptomCheckerProps = $derived.by(() => {
    const rawProps: SymptomCheckerProps = stripSvelteProps(allProps);
    const result = safeParse(SymptomCheckerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SymptomCheckerProps;
  });
</script>

<div data-slot="symptom-checker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
