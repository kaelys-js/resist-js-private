<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ReplyFormPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ReplyFormProps = v.InferOutput<typeof ReplyFormPropsSchema>;
</script>

<script lang="ts">
  /**
   * ReplyForm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ReplyForm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ReplyFormProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ReplyFormProps = $derived.by(() => {
    const rawProps: ReplyFormProps = stripSvelteProps(allProps);
    const result = safeParse(ReplyFormPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ReplyFormProps;
  });
</script>

<div data-slot="reply-form" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
