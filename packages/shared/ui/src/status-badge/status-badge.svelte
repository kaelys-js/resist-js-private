<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Status value @values 'online', 'offline', 'away', 'busy', 'dnd' */
    status,
    /** Custom color @values color */
    color,
    /** Dot size @values 'xs', 'sm', 'md' */
    size = 'sm',
    /** Status text @values label */
    label,
    /** Pulsing animation */
    pulse = false,
    children,
  }: {
    /** Status value */
    status: Str;
    /** Custom color */
    color: Str;
    /** Dot size */
    size?: Str;
    /** Status text */
    label: Str;
    /** Pulsing animation */
    pulse?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
