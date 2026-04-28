<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PullRequestCard Svelte component — summary card showing
   * a pull/merge request's title, status, author, and review
   * count. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PullRequestCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PullRequestCard. */
  export type PullRequestCardProps = v.InferOutput<typeof PullRequestCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * PullRequestCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PullRequestCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PullRequestCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PullRequestCardProps = $derived.by(() => {
    const rawProps: PullRequestCardProps = stripSvelteProps(allProps);
    const result = safeParse(PullRequestCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PullRequestCardProps;
  });
</script>

<div data-slot="pull-request-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
