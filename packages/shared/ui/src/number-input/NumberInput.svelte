<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * NumberInput Svelte component — numeric input with
   * stepper / spinner controls. Placeholder shell awaiting
   * full implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NumberInputPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for NumberInput. */
  export type NumberInputProps = v.InferOutput<typeof NumberInputPropsSchema>;
</script>

<script lang="ts">
  /**
   * NumberInput — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <NumberInput />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NumberInputProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NumberInputProps = $derived.by(() => {
    const rawProps: NumberInputProps = stripSvelteProps(allProps);
    const result = safeParse(NumberInputPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NumberInputProps;
  });
</script>

<div data-slot="number-input" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
