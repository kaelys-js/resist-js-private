<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * RainbowButton Svelte component — animated CTA button with
   * a flowing rainbow-gradient outline. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RainbowButtonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for RainbowButton. */
  export type RainbowButtonProps = v.InferOutput<typeof RainbowButtonPropsSchema>;
</script>

<script lang="ts">
  /**
   * RainbowButton — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RainbowButton />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RainbowButtonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RainbowButtonProps = $derived.by(() => {
    const rawProps: RainbowButtonProps = stripSvelteProps(allProps);
    const result = safeParse(RainbowButtonPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RainbowButtonProps;
  });
</script>

<div data-slot="rainbow-button" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
