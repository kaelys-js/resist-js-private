<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Text content @values string, string[] */
    text,
    /** Animation type (typewriter, reveal, flip, shimmer, morph, wavy, blur, fade) @values variant */
    variant,
    /** Characters per second @values 0, 50, 100 */
    speed = 50,
    /** Start delay (ms) @values 0, 0, 10 */
    delay = 0,
    /** Repeat animation */
    loop = false,
    /** Show blinking cursor (typewriter) */
    cursor = true,
    /** Words to cycle through (flip/morph) @values string[] */
    words,
    children,
  }: {
    /** Text content */
    text: Str;
    /** Animation type (typewriter, reveal, flip, shimmer, morph, wavy, blur, fade) */
    variant: Str;
    /** Characters per second */
    speed?: Num;
    /** Start delay (ms) */
    delay?: Num;
    /** Repeat animation */
    loop?: Bool;
    /** Show blinking cursor (typewriter) */
    cursor?: Bool;
    /** Words to cycle through (flip/morph) */
    words: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
