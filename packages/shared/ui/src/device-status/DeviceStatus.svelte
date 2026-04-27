<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * DeviceStatus — connectivity / power status indicator for a
   * device. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DeviceStatusPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DeviceStatus. */
  export type DeviceStatusProps = v.InferOutput<typeof DeviceStatusPropsSchema>;
</script>

<script lang="ts">
  /**
   * DeviceStatus — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DeviceStatus />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DeviceStatusProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DeviceStatusProps = $derived.by(() => {
    const rawProps: DeviceStatusProps = stripSvelteProps(allProps);
    const result = safeParse(DeviceStatusPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DeviceStatusProps;
  });
</script>

<div data-slot="device-status" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
