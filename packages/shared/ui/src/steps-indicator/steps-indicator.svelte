<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Active step index @values 0, 0, 10 */
    current = 0,
    /** Step definitions (title, description, icon, status) */
    items,
    /** Layout @values 'horizontal', 'vertical' */
    direction = 'horizontal',
    /** Step size @values 'small', 'default' */
    size = 'default',
    /** Dot style instead of numbers */
    progressDot = false,
    /** Visual variant @values 'default', 'navigation' */
    type = 'default',
    /** Current step status @values 'wait', 'process', 'finish', 'error' */
    status = 'process',
    children,
  }: {
    /** Active step index */
    current?: Num;
    /** Step definitions (title, description, icon, status) */
    items: Str[];
    /** Layout */
    direction?: Str;
    /** Step size */
    size?: Str;
    /** Dot style instead of numbers */
    progressDot?: Bool;
    /** Visual variant */
    type?: Str;
    /** Current step status */
    status?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
