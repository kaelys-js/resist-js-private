<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TrafficLightsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TrafficLightsProps = v.InferOutput<typeof TrafficLightsPropsSchema>;
</script>

<script lang="ts">
  /**
   * TrafficLights — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TrafficLights />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TrafficLightsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TrafficLightsProps = $derived.by(() => {
    const rawProps: TrafficLightsProps = stripSvelteProps(allProps);
    const result = safeParse(TrafficLightsPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TrafficLightsProps;
  });
</script>

<div data-slot="traffic-lights" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
