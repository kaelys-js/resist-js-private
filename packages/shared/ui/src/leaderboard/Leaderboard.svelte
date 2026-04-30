<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Leaderboard Svelte component — ranked player / user list
   * for gaming and competitive features. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LeaderboardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Leaderboard. */
  export type LeaderboardProps = v.InferOutput<typeof LeaderboardPropsSchema>;
</script>

<script lang="ts">
  /**
   * Leaderboard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Leaderboard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LeaderboardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LeaderboardProps = $derived.by(() => {
    const rawProps: LeaderboardProps = stripSvelteProps(allProps);
    const result = safeParse(LeaderboardPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LeaderboardProps;
  });
</script>

<div data-slot="leaderboard" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
