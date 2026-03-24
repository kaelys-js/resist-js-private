<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const IssueCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type IssueCardProps = v.InferOutput<typeof IssueCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * IssueCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <IssueCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = IssueCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: IssueCardProps = $derived.by(() => {
    const rawProps: IssueCardProps = stripSvelteProps(allProps);
    const result = safeParse(IssueCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as IssueCardProps;
  });
</script>

<div data-slot="issue-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
