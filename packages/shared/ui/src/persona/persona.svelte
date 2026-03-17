<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Primary name @values name */
    name,
    /** Secondary text (title/role) @values secondaryText */
    secondaryText,
    /** Third line of text @values tertiaryText */
    tertiaryText,
    /** Fourth line of text @values quaternaryText */
    quaternaryText,
    /** Avatar size @values 0, 50, 100 */
    size,
    /** Text placement @values 'before', 'after', 'below' */
    textPosition = 'after',
    /** Avatar configuration @values slot */
    avatar,
    /** Presence indicator @values slot */
    presence,
    children,
  }: {
    /** Primary name */
    name: Str;
    /** Secondary text (title/role) */
    secondaryText: Str;
    /** Third line of text */
    tertiaryText: Str;
    /** Fourth line of text */
    quaternaryText: Str;
    /** Avatar size */
    size: Num;
    /** Text placement */
    textPosition?: Str;
    /** Avatar configuration */
    avatar: Str;
    /** Presence indicator */
    presence: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
