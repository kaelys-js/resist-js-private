<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Input value @values value */
    value,
    /** Suggestion items */
    suggestions,
    /** Display field(s) @values string, string[] */
    field,
    /** Trigger character(s) @values string, string[] */
    trigger = '@',
    /** Auto-resize textarea */
    autoResize = false,
    /** Search debounce delay @values 0, 0, 10 */
    delay = 0,
    children,
  }: {
    /** Input value */
    value: Str;
    /** Suggestion items */
    suggestions: Str[];
    /** Display field(s) */
    field: Str;
    /** Trigger character(s) */
    trigger?: Str;
    /** Auto-resize textarea */
    autoResize?: Bool;
    /** Search debounce delay */
    delay?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
