<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RetroGridPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for RetroGrid. */
  export type RetroGridProps = v.InferOutput<typeof RetroGridPropsSchema>;
</script>

<script lang="ts">
  /**
   * RetroGrid — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RetroGrid />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RetroGridProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RetroGridProps = $derived.by(() => {
    const rawProps: RetroGridProps = stripSvelteProps(allProps);
    const result = safeParse(RetroGridPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RetroGridProps;
  });
</script>

<div data-slot="retro-grid" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
