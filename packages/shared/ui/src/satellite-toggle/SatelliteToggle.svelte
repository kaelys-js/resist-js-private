<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SatelliteTogglePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SatelliteToggleProps = v.InferOutput<typeof SatelliteTogglePropsSchema>;
</script>

<script lang="ts">
  /**
   * SatelliteToggle — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SatelliteToggle />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SatelliteToggleProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SatelliteToggleProps = $derived.by(() => {
    const rawProps: SatelliteToggleProps = stripSvelteProps(allProps);
    const result = safeParse(SatelliteTogglePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SatelliteToggleProps;
  });
</script>

<div data-slot="satellite-toggle" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
