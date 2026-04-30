<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * EmbedCard Svelte component — oEmbed-style link preview
   * card with title, description, and thumbnail. Placeholder
   * shell awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const EmbedCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for EmbedCard. */
  export type EmbedCardProps = v.InferOutput<typeof EmbedCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * EmbedCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <EmbedCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = EmbedCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: EmbedCardProps = $derived.by(() => {
    const rawProps: EmbedCardProps = stripSvelteProps(allProps);
    const result = safeParse(EmbedCardPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as EmbedCardProps;
  });
</script>

<div data-slot="embed-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
