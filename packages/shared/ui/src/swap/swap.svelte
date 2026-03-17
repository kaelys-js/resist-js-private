<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Current state */
    active = false,
    /** Transition animation @values 'rotate', 'flip', 'none' */
    effect = 'rotate',
    children,
  }: {
    /** Current state */
    active?: Bool;
    /** Transition animation */
    effect?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
