<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Metric label @values label */
    label,
    /** Metric value @values string, number */
    value,
    /** Supporting description @values helpText */
    helpText,
    children,
  }: {
    /** Metric label */
    label: Str;
    /** Metric value */
    value: Str;
    /** Supporting description */
    helpText: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
