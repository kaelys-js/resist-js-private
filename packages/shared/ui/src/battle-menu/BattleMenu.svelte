<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BattleMenu — turn-based RPG combat action menu. Placeholder
   * shell awaiting full implementation; ships with a `class` prop
   * for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BattleMenuPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BattleMenu. */
  export type BattleMenuProps = v.InferOutput<typeof BattleMenuPropsSchema>;
</script>

<script lang="ts">
  /**
   * BattleMenu — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BattleMenu />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BattleMenuProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BattleMenuProps = $derived.by(() => {
    const rawProps: BattleMenuProps = stripSvelteProps(allProps);
    const result = safeParse(BattleMenuPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BattleMenuProps;
  });
</script>

<div data-slot="battle-menu" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
