<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Terminal output lines */
    lines,
    /** Window title @values 'Terminal' */
    title = 'Terminal',
    /** Command prompt symbol @values '$' */
    prompt = '$',
    /** Typing animation */
    animated = false,
    /** Color theme @values 'dark', 'light' */
    theme = 'dark',
    children,
  }: {
    /** Terminal output lines */
    lines: Str[];
    /** Window title */
    title?: Str;
    /** Command prompt symbol */
    prompt?: Str;
    /** Typing animation */
    animated?: Bool;
    /** Color theme */
    theme?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
