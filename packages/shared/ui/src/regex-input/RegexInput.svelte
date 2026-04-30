<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * RegexInput Svelte component — text input that accepts a
   * regular expression and renders match/no-match preview
   * against a sample string. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RegexInputPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for RegexInput. */
  export type RegexInputProps = v.InferOutput<typeof RegexInputPropsSchema>;
</script>

<script lang="ts">
  /**
   * RegexInput — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RegexInput />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RegexInputProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RegexInputProps = $derived.by(() => {
    const rawProps: RegexInputProps = stripSvelteProps(allProps);
    const result = safeParse(RegexInputPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RegexInputProps;
  });
</script>

<div data-slot="regex-input" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
