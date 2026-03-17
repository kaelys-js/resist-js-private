<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Spotlight radius @values 0, 200, 400 */
    size = 200,
    /** Spotlight color @values color */
    color,
    /** Effect opacity @values 0, 50, 100 */
    opacity = 0.15,
    /** Background fill @values fill */
    fill,
    children,
  }: {
    /** Spotlight radius */
    size?: Num;
    /** Spotlight color */
    color: Str;
    /** Effect opacity */
    opacity?: Num;
    /** Background fill */
    fill: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
