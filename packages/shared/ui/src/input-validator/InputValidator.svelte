<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * InputValidator Svelte component — input wrapper that
   * applies validation rules and surfaces error messages.
   * Placeholder shell awaiting full implementation; ships with a
   * class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const InputValidatorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for InputValidator. */
  export type InputValidatorProps = v.InferOutput<typeof InputValidatorPropsSchema>;
</script>

<script lang="ts">
  /**
   * InputValidator — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <InputValidator />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = InputValidatorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: InputValidatorProps = $derived.by(() => {
    const rawProps: InputValidatorProps = stripSvelteProps(allProps);
    const result = safeParse(InputValidatorPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as InputValidatorProps;
  });
</script>

<div data-slot="input-validator" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
