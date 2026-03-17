<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Text to encode @values value */
    value,
    /** Encoding options */
    encoding,
    children,
  }: {
    /** Text to encode */
    value: Str;
    /** Encoding options */
    encoding: Record<Str, unknown>;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
