<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * TiltCard Svelte component — mouse-tracking 3D tilt card
   * with subtle shadow shift. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TiltCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TiltCard. */
  export type TiltCardProps = v.InferOutput<typeof TiltCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * TiltCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TiltCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TiltCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TiltCardProps = $derived.by(() => {
    const rawProps: TiltCardProps = stripSvelteProps(allProps);
    const result = safeParse(TiltCardPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TiltCardProps;
  });
</script>

<div data-slot="tilt-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
