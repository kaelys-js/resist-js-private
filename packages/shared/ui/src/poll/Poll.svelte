<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PollPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Poll. */
  export type PollProps = v.InferOutput<typeof PollPropsSchema>;
</script>

<script lang="ts">
  /**
   * Poll — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Poll />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PollProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PollProps = $derived.by(() => {
    const rawProps: PollProps = stripSvelteProps(allProps);
    const result = safeParse(PollPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PollProps;
  });
</script>

<div data-slot="poll" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
