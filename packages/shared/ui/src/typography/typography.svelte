<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Text variant @values 'h1', 'h2', 'h3', 'h4', 'body1', 'body2', 'caption', 'overline' */
    variant = 'body1',
    /** Rendered HTML element @values as */
    as,
    /** Text color @values 'inherit' */
    color = 'inherit',
    /** Text alignment @values 'left', 'center', 'right', 'justify' */
    align = 'inherit',
    /** Bottom margin */
    gutterBottom = false,
    /** Truncate with ellipsis */
    noWrap = false,
    /** Gradient text effect */
    gradient,
    /** Line clamp truncation @values boolean, number */
    truncate = false,
    /** Heading hierarchy order @values 0, 50, 100 */
    order,
    children,
  }: {
    /** Text variant */
    variant?: Str;
    /** Rendered HTML element */
    as: Str;
    /** Text color */
    color?: Str;
    /** Text alignment */
    align?: Str;
    /** Bottom margin */
    gutterBottom?: Bool;
    /** Truncate with ellipsis */
    noWrap?: Bool;
    /** Gradient text effect */
    gradient: Record<Str, unknown>;
    /** Line clamp truncation */
    truncate?: Bool;
    /** Heading hierarchy order */
    order: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
