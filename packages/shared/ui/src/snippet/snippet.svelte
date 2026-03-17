<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Code text to display @values string, string[] */
    text,
    /** Line prefix symbol @values '$' */
    symbol = '$',
    /** Theme color @values 'default' */
    color = 'default',
    /** Visual variant @values 'bordered', 'flat', 'shadow' */
    variant = 'flat',
    /** Hide the prefix symbol */
    hideSymbol = false,
    /** Show copy button */
    copyable = true,
    /** Copy feedback duration (ms) @values 0, 2000, 4000 */
    timeout = 2000,
    children,
  }: {
    /** Code text to display */
    text: Str;
    /** Line prefix symbol */
    symbol?: Str;
    /** Theme color */
    color?: Str;
    /** Visual variant */
    variant?: Str;
    /** Hide the prefix symbol */
    hideSymbol?: Bool;
    /** Show copy button */
    copyable?: Bool;
    /** Copy feedback duration (ms) */
    timeout?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
