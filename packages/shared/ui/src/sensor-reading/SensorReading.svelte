<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SensorReadingPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SensorReading. */
  export type SensorReadingProps = v.InferOutput<typeof SensorReadingPropsSchema>;
</script>

<script lang="ts">
  /**
   * SensorReading — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SensorReading />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SensorReadingProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SensorReadingProps = $derived.by(() => {
    const rawProps: SensorReadingProps = stripSvelteProps(allProps);
    const result = safeParse(SensorReadingPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SensorReadingProps;
  });
</script>

<div data-slot="sensor-reading" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
