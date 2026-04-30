<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * FloatingLabelInput Svelte component — Material-style text
   * input where the label animates above the value when focused
   * or filled. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FloatingLabelInputPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FloatingLabelInput. */
  export type FloatingLabelInputProps = v.InferOutput<typeof FloatingLabelInputPropsSchema>;
</script>

<script lang="ts">
  /**
   * FloatingLabelInput — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FloatingLabelInput />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FloatingLabelInputProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FloatingLabelInputProps = $derived.by(() => {
    const rawProps: FloatingLabelInputProps = stripSvelteProps(allProps);
    const result = safeParse(FloatingLabelInputPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FloatingLabelInputProps;
  });
</script>

<div data-slot="floating-label-input" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
