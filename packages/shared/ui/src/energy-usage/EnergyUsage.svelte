<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * EnergyUsage Svelte component — energy / power consumption
   * dashboard widget. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const EnergyUsagePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for EnergyUsage. */
  export type EnergyUsageProps = v.InferOutput<typeof EnergyUsagePropsSchema>;
</script>

<script lang="ts">
  /**
   * EnergyUsage — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <EnergyUsage />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = EnergyUsageProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: EnergyUsageProps = $derived.by(() => {
    const rawProps: EnergyUsageProps = stripSvelteProps(allProps);
    const result = safeParse(EnergyUsagePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as EnergyUsageProps;
  });
</script>

<div data-slot="energy-usage" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
