<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * InfoPanel Svelte component — informational content panel
   * for surfacing tips and reference info. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const InfoPanelPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for InfoPanel. */
  export type InfoPanelProps = v.InferOutput<typeof InfoPanelPropsSchema>;
</script>

<script lang="ts">
  /**
   * InfoPanel — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <InfoPanel />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = InfoPanelProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: InfoPanelProps = $derived.by(() => {
    const rawProps: InfoPanelProps = stripSvelteProps(allProps);
    const result = safeParse(InfoPanelPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as InfoPanelProps;
  });
</script>

<div data-slot="info-panel" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
