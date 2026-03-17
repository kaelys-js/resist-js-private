<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Badge content @values number, string */
    value,
    /** Badge color @values 'primary' */
    color = 'primary',
    /** Corner position @values 'top-right' */
    position = 'top-right',
    /** Pulsing animation */
    processing = false,
    /** Show as dot (no content) */
    dot = false,
    /** Show when value is 0 */
    showZero = false,
    /** Max displayed count @values 0, 99, 198 */
    overflowCount = 99,
    children,
  }: {
    /** Badge content */
    value: Str;
    /** Badge color */
    color?: Str;
    /** Corner position */
    position?: Str;
    /** Pulsing animation */
    processing?: Bool;
    /** Show as dot (no content) */
    dot?: Bool;
    /** Show when value is 0 */
    showZero?: Bool;
    /** Max displayed count */
    overflowCount?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
