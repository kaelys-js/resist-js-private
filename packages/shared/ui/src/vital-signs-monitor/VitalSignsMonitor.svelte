<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const VitalSignsMonitorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type VitalSignsMonitorProps = v.InferOutput<typeof VitalSignsMonitorPropsSchema>;
</script>

<script lang="ts">
  /**
   * VitalSignsMonitor — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <VitalSignsMonitor />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = VitalSignsMonitorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: VitalSignsMonitorProps = $derived.by(() => {
    const rawProps: VitalSignsMonitorProps = stripSvelteProps(allProps);
    const result = safeParse(VitalSignsMonitorPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as VitalSignsMonitorProps;
  });
</script>

<div data-slot="vital-signs-monitor" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
