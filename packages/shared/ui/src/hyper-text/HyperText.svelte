<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const HyperTextPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for HyperText. */
  export type HyperTextProps = v.InferOutput<typeof HyperTextPropsSchema>;
</script>

<script lang="ts">
  /**
   * HyperText — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <HyperText />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = HyperTextProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: HyperTextProps = $derived.by(() => {
    const rawProps: HyperTextProps = stripSvelteProps(allProps);
    const result = safeParse(HyperTextPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HyperTextProps;
  });
</script>

<div data-slot="hyper-text" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
