<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Active theme name @values theme */
    theme,
    /** Available themes @values string[] */
    themes,
    /** Theme application method @values 'attribute', 'class' */
    strategy = 'attribute',
    /** localStorage key @values 'theme' */
    storageKey = 'theme',
    children,
  }: {
    /** Active theme name */
    theme: Str;
    /** Available themes */
    themes: Str;
    /** Theme application method */
    strategy?: Str;
    /** localStorage key */
    storageKey?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
