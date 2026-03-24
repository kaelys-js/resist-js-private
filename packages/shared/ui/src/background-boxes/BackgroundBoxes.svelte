<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BackgroundBoxesPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BackgroundBoxesProps = v.InferOutput<typeof BackgroundBoxesPropsSchema>;
</script>

<script lang="ts">
  /**
   * BackgroundBoxes — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BackgroundBoxes />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BackgroundBoxesProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BackgroundBoxesProps = $derived.by(() => {
    const rawProps: BackgroundBoxesProps = stripSvelteProps(allProps);
    const result = safeParse(BackgroundBoxesPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BackgroundBoxesProps;
  });
</script>

<div data-slot="background-boxes" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
