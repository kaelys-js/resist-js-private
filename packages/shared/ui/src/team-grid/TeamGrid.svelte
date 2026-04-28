<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * TeamGrid Svelte component — grid of team-member cards
   * with photo, role, and bio. Placeholder shell awaiting
   * full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TeamGridPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TeamGrid. */
  export type TeamGridProps = v.InferOutput<typeof TeamGridPropsSchema>;
</script>

<script lang="ts">
  /**
   * TeamGrid — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TeamGrid />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TeamGridProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TeamGridProps = $derived.by(() => {
    const rawProps: TeamGridProps = stripSvelteProps(allProps);
    const result = safeParse(TeamGridPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TeamGridProps;
  });
</script>

<div data-slot="team-grid" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
