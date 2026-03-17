<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Section content definitions */
    sections,
    /** Text position @values 'left', 'center', 'right' */
    contentAlignment = 'left',
    /** Background gradient effect */
    linearGradient = true,
    children,
  }: {
    /** Section content definitions */
    sections: Str[];
    /** Text position */
    contentAlignment?: Str;
    /** Background gradient effect */
    linearGradient?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
