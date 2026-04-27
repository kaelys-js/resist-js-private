<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CommitCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CommitCard. */
  export type CommitCardProps = v.InferOutput<typeof CommitCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * CommitCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CommitCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CommitCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CommitCardProps = $derived.by(() => {
    const rawProps: CommitCardProps = stripSvelteProps(allProps);
    const result = safeParse(CommitCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CommitCardProps;
  });
</script>

<div data-slot="commit-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
