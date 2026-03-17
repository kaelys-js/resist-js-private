<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Show/hide overlay */
    visible,
    /** Background opacity @values 0, 50, 100 */
    overlayOpacity = 0.75,
    /** Background color @values overlayColor */
    overlayColor,
    /** Backdrop blur (px) @values 0, 50, 100 */
    overlayBlur,
    /** Fade duration (ms) @values 0, 200, 400 */
    transitionDuration = 200,
    /** Props passed to loader */
    loaderProps,
    /** Stack order @values 0, 400, 800 */
    zIndex = 400,
    children,
  }: {
    /** Show/hide overlay */
    visible: Bool;
    /** Background opacity */
    overlayOpacity?: Num;
    /** Background color */
    overlayColor: Str;
    /** Backdrop blur (px) */
    overlayBlur: Num;
    /** Fade duration (ms) */
    transitionDuration?: Num;
    /** Props passed to loader */
    loaderProps: Record<Str, unknown>;
    /** Stack order */
    zIndex?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
