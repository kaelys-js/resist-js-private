<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ThermostatControl Svelte component — circular dial for
   * adjusting target temperature with current/set-point
   * indicators. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ThermostatControlPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ThermostatControl. */
  export type ThermostatControlProps = v.InferOutput<typeof ThermostatControlPropsSchema>;
</script>

<script lang="ts">
  /**
   * ThermostatControl — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ThermostatControl />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ThermostatControlProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ThermostatControlProps = $derived.by(() => {
    const rawProps: ThermostatControlProps = stripSvelteProps(allProps);
    const result = safeParse(ThermostatControlPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ThermostatControlProps;
  });
</script>

<div data-slot="thermostat-control" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
