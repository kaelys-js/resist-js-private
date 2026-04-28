<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SemiCircleProgress Svelte component — half-circle gauge
   * arc showing completion percentage. Placeholder shell
   * awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SemiCircleProgressPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SemiCircleProgress. */
  export type SemiCircleProgressProps = v.InferOutput<typeof SemiCircleProgressPropsSchema>;
</script>

<script lang="ts">
  /**
   * SemiCircleProgress — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SemiCircleProgress />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SemiCircleProgressProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SemiCircleProgressProps = $derived.by(() => {
    const rawProps: SemiCircleProgressProps = stripSvelteProps(allProps);
    const result = safeParse(SemiCircleProgressPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SemiCircleProgressProps;
  });
</script>

<div data-slot="semi-circle-progress" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
