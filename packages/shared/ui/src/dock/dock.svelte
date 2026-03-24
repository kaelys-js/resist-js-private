<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DockPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DockProps = v.InferOutput<typeof DockPropsSchema>;
</script>

<script lang="ts">
  /**
   * Dock — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Dock />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DockProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DockProps = $derived.by(() => {
    const rawProps: DockProps = stripSvelteProps(allProps);
    const result = safeParse(DockPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DockProps;
  });
</script>

<div data-slot="dock" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
