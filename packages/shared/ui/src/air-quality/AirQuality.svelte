<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * AirQuality — IoT-style air-quality index display. Placeholder
   * shell awaiting full implementation; ships with a `class` prop
   * for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AirQualityPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AirQuality. */
  export type AirQualityProps = v.InferOutput<typeof AirQualityPropsSchema>;
</script>

<script lang="ts">
  /**
   * AirQuality — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AirQuality />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AirQualityProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AirQualityProps = $derived.by(() => {
    const rawProps: AirQualityProps = stripSvelteProps(allProps);
    const result = safeParse(AirQualityPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AirQualityProps;
  });
</script>

<div data-slot="air-quality" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
