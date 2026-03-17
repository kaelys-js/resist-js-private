<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Current value @values 0, 0, 10 */
    value = 0,
    /** Minimum value @values 0, 0, 10 */
    min = 0,
    /** Maximum value @values 0, 100, 200 */
    max = 100,
    /** Component size @values 'sm', 'md', 'lg' */
    size = 'md',
    /** Display numeric value */
    showValue = true,
    /** Fill color @values 'primary' */
    color = 'primary',
    /** Background track color @values 'muted' */
    trackColor = 'muted',
    /** Stroke width @values 0, 50, 100 */
    thickness,
    children,
  }: {
    /** Current value */
    value?: Num;
    /** Minimum value */
    min?: Num;
    /** Maximum value */
    max?: Num;
    /** Component size */
    size?: Str;
    /** Display numeric value */
    showValue?: Bool;
    /** Fill color */
    color?: Str;
    /** Background track color */
    trackColor?: Str;
    /** Stroke width */
    thickness: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
