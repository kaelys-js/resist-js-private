<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Mention Svelte component — `@username` mention picker
   * inside a text input. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MentionPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Mention. */
  export type MentionProps = v.InferOutput<typeof MentionPropsSchema>;
</script>

<script lang="ts">
  /**
   * Mention — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Mention />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MentionProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MentionProps = $derived.by(() => {
    const rawProps: MentionProps = stripSvelteProps(allProps);
    const result = safeParse(MentionPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MentionProps;
  });
</script>

<div data-slot="mention" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
