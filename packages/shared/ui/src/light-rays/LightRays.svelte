<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * LightRays Svelte component — animated god-rays /
   * volumetric light backdrop effect. Placeholder shell awaiting
   * full implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LightRaysPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for LightRays. */
  export type LightRaysProps = v.InferOutput<typeof LightRaysPropsSchema>;
</script>

<script lang="ts">
  /**
   * LightRays — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LightRays />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LightRaysProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LightRaysProps = $derived.by(() => {
    const rawProps: LightRaysProps = stripSvelteProps(allProps);
    const result = safeParse(LightRaysPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LightRaysProps;
  });
</script>

<div data-slot="light-rays" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
