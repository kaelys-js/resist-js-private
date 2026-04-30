<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * GitGraph Svelte component — git commit graph visualisation
   * with branch lanes and merge points. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GitGraphPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for GitGraph. */
  export type GitGraphProps = v.InferOutput<typeof GitGraphPropsSchema>;
</script>

<script lang="ts">
  /**
   * GitGraph — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <GitGraph />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GitGraphProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GitGraphProps = $derived.by(() => {
    const rawProps: GitGraphProps = stripSvelteProps(allProps);
    const result = safeParse(GitGraphPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GitGraphProps;
  });
</script>

<div data-slot="git-graph" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
