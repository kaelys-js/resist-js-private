<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Search query to highlight @values query */
    query,
    /** Text to search within @values text */
    text,
    /** Highlight all occurrences */
    matchAll = false,
    /** Case-insensitive matching */
    ignoreCase = false,
    children,
  }: {
    /** Search query to highlight */
    query: Str;
    /** Text to search within */
    text: Str;
    /** Highlight all occurrences */
    matchAll?: Bool;
    /** Case-insensitive matching */
    ignoreCase?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
