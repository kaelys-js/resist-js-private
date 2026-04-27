<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BorderBeamPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BorderBeam. */
  export type BorderBeamProps = v.InferOutput<typeof BorderBeamPropsSchema>;
</script>

<script lang="ts">
  /**
   * BorderBeam — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BorderBeam />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BorderBeamProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BorderBeamProps = $derived.by(() => {
    const rawProps: BorderBeamProps = stripSvelteProps(allProps);
    const result = safeParse(BorderBeamPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BorderBeamProps;
  });
</script>

<div data-slot="border-beam" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
