<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Panel Svelte component — generic surface container.
   * Placeholder shell awaiting full implementation; ships with
   * a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PanelPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Panel. */
  export type PanelProps = v.InferOutput<typeof PanelPropsSchema>;
</script>

<script lang="ts">
  /**
   * Panel — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Panel />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PanelProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PanelProps = $derived.by(() => {
    const rawProps: PanelProps = stripSvelteProps(allProps);
    const result = safeParse(PanelPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PanelProps;
  });
</script>

<div data-slot="panel" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
