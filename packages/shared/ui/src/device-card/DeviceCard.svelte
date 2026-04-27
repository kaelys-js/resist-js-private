<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * DeviceCard — IoT / hardware device summary card. Placeholder
   * shell awaiting full implementation; ships with a `class`
   * prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DeviceCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DeviceCard. */
  export type DeviceCardProps = v.InferOutput<typeof DeviceCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * DeviceCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DeviceCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DeviceCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DeviceCardProps = $derived.by(() => {
    const rawProps: DeviceCardProps = stripSvelteProps(allProps);
    const result = safeParse(DeviceCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DeviceCardProps;
  });
</script>

<div data-slot="device-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
