<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DockManagerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DockManager. */
  export type DockManagerProps = v.InferOutput<typeof DockManagerPropsSchema>;
</script>

<script lang="ts">
  /**
   * DockManager — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DockManager />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DockManagerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DockManagerProps = $derived.by(() => {
    const rawProps: DockManagerProps = stripSvelteProps(allProps);
    const result = safeParse(DockManagerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DockManagerProps;
  });
</script>

<div data-slot="dock-manager" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
