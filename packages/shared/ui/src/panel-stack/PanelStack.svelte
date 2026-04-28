<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PanelStack Svelte component — stacked navigation panels
   * for drill-down flows. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PanelStackPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PanelStack. */
  export type PanelStackProps = v.InferOutput<typeof PanelStackPropsSchema>;
</script>

<script lang="ts">
  /**
   * PanelStack — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PanelStack />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PanelStackProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PanelStackProps = $derived.by(() => {
    const rawProps: PanelStackProps = stripSvelteProps(allProps);
    const result = safeParse(PanelStackPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PanelStackProps;
  });
</script>

<div data-slot="panel-stack" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
