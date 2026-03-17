<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AchievementBadgePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AchievementBadgeProps = v.InferOutput<typeof AchievementBadgePropsSchema>;
</script>

<script lang="ts">
  /**
   * AchievementBadge — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AchievementBadge />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AchievementBadgeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AchievementBadgeProps = $derived.by(() => {
    const rawProps: AchievementBadgeProps = stripSvelteProps(allProps);
    const result = safeParse(AchievementBadgePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AchievementBadgeProps;
  });
</script>

<div data-slot="achievement-badge" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
