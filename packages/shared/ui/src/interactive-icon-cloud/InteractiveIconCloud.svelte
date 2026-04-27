<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const InteractiveIconCloudPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for InteractiveIconCloud. */
  export type InteractiveIconCloudProps = v.InferOutput<typeof InteractiveIconCloudPropsSchema>;
</script>

<script lang="ts">
  /**
   * InteractiveIconCloud — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <InteractiveIconCloud />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = InteractiveIconCloudProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: InteractiveIconCloudProps = $derived.by(() => {
    const rawProps: InteractiveIconCloudProps = stripSvelteProps(allProps);
    const result = safeParse(InteractiveIconCloudPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as InteractiveIconCloudProps;
  });
</script>

<div data-slot="interactive-icon-cloud" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
