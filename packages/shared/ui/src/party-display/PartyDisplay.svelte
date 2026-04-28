<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PartyDisplay Svelte component — RPG party / squad
   * roster display. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PartyDisplayPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PartyDisplay. */
  export type PartyDisplayProps = v.InferOutput<typeof PartyDisplayPropsSchema>;
</script>

<script lang="ts">
  /**
   * PartyDisplay — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PartyDisplay />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PartyDisplayProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PartyDisplayProps = $derived.by(() => {
    const rawProps: PartyDisplayProps = stripSvelteProps(allProps);
    const result = safeParse(PartyDisplayPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PartyDisplayProps;
  });
</script>

<div data-slot="party-display" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
