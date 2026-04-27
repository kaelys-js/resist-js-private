<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CharacterSheet — RPG character stats / attributes sheet.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CharacterSheetPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CharacterSheet. */
  export type CharacterSheetProps = v.InferOutput<typeof CharacterSheetPropsSchema>;
</script>

<script lang="ts">
  /**
   * CharacterSheet — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CharacterSheet />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CharacterSheetProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CharacterSheetProps = $derived.by(() => {
    const rawProps: CharacterSheetProps = stripSvelteProps(allProps);
    const result = safeParse(CharacterSheetPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CharacterSheetProps;
  });
</script>

<div data-slot="character-sheet" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
