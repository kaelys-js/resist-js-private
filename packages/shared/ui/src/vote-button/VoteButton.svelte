<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const VoteButtonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for VoteButton. */
  export type VoteButtonProps = v.InferOutput<typeof VoteButtonPropsSchema>;
</script>

<script lang="ts">
  /**
   * VoteButton — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <VoteButton />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = VoteButtonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: VoteButtonProps = $derived.by(() => {
    const rawProps: VoteButtonProps = stripSvelteProps(allProps);
    const result = safeParse(VoteButtonPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as VoteButtonProps;
  });
</script>

<div data-slot="vote-button" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
