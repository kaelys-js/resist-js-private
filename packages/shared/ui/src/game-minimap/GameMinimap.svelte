<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GameMinimapPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type GameMinimapProps = v.InferOutput<typeof GameMinimapPropsSchema>;
</script>

<script lang="ts">
  /**
   * GameMinimap — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <GameMinimap />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GameMinimapProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GameMinimapProps = $derived.by(() => {
    const rawProps: GameMinimapProps = stripSvelteProps(allProps);
    const result = safeParse(GameMinimapPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GameMinimapProps;
  });
</script>

<div data-slot="game-minimap" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
