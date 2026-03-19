<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const KbdGroupPropsSchema = v.strictObject({
    /** Separator character displayed between grouped keys. @values +, then, or */
    separator: v.optional(StrSchema, '+'),
    /** Additional CSS classes. @values gap-1, ml-2 */
    class: v.optional(StrSchema),
  });
  export type KbdGroupProps = v.InferOutput<typeof KbdGroupPropsSchema>;
</script>

<script lang="ts">
  /**
   * KbdGroup — groups multiple Kbd components with a separator between them.
   *
   * Wraps children in a flex container with consistent spacing and an
   * optional separator string (defaults to `+`) between each child.
   * The separator is injected via a CSS `::before` pseudo-element on
   * non-first-child `[data-slot="kbd"]` elements using a CSS custom property.
   *
   * @example
   * ```svelte
   * <KbdGroup>
   *   <Kbd label="⌘" />
   *   <Kbd label="K" />
   * </KbdGroup>
   * ```
   */
  import type { Snippet } from 'svelte';
  import type { Str } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = KbdGroupProps & {
    /** Kbd elements to render inside the group. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: KbdGroupProps = $derived.by(() => {
    const rawProps: KbdGroupProps = stripSvelteProps(allProps);
    const result = safeParse(KbdGroupPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as KbdGroupProps;
  });

  /** Resolved separator with default fallback. */
  const separator: Str = $derived((validated.separator ?? '+') as Str);
</script>

<span
  data-slot="kbd-group"
  class={cn('kbd-group inline-flex items-center gap-1', validated.class)}
  style:--kbd-separator="'{separator}'"
>
  {@render allProps.children?.()}
</span>

<style>
  .kbd-group > :global(:not(:first-child)[data-slot='kbd'])::before {
    content: var(--kbd-separator, '+');
    margin-inline: 0.125rem;
    font-size: 0.625rem;
    line-height: 1;
    color: var(--color-muted-foreground);
    opacity: 0.5;
  }

  .kbd-group > :global(:not(:first-child) > [data-slot='kbd'])::before {
    content: var(--kbd-separator, '+');
    margin-inline: 0.125rem;
    font-size: 0.625rem;
    line-height: 1;
    color: var(--color-muted-foreground);
    opacity: 0.5;
  }
</style>
