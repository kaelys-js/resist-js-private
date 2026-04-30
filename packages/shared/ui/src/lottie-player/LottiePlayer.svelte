<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * LottiePlayer Svelte component — Lottie animation player
   * with play / pause / loop controls. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LottiePlayerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for LottiePlayer. */
  export type LottiePlayerProps = v.InferOutput<typeof LottiePlayerPropsSchema>;
</script>

<script lang="ts">
  /**
   * LottiePlayer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LottiePlayer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LottiePlayerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LottiePlayerProps = $derived.by(() => {
    const rawProps: LottiePlayerProps = stripSvelteProps(allProps);
    const result = safeParse(LottiePlayerPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LottiePlayerProps;
  });
</script>

<div data-slot="lottie-player" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
