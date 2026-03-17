<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Page title @values title */
    title,
    /** Subtitle text @values subtitle */
    subtitle,
    /** Breadcrumb config */
    breadcrumb,
    /** Title avatar */
    avatar,
    children,
  }: {
    /** Page title */
    title: Str;
    /** Subtitle text */
    subtitle: Str;
    /** Breadcrumb config */
    breadcrumb: Record<Str, unknown>;
    /** Title avatar */
    avatar: Record<Str, unknown>;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
