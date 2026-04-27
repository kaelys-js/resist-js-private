<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BlockUiPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BlockUi. */
  export type BlockUiProps = v.InferOutput<typeof BlockUiPropsSchema>;
</script>

<script lang="ts">
  /**
   * BlockUi — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BlockUi />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BlockUiProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BlockUiProps = $derived.by(() => {
    const rawProps: BlockUiProps = stripSvelteProps(allProps);
    const result = safeParse(BlockUiPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BlockUiProps;
  });
</script>

<div data-slot="block-ui" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
