<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Current value @values 0, 50, 100 */
    value,
    /** Minimum value @values 0, 0, 10 */
    min = 0,
    /** Maximum value @values 0, 100, 200 */
    max = 100,
    /** Step increment @values 0, 1, 2 */
    step = 1,
    /** Knob diameter in pixels @values 0, 100, 200 */
    size = 100,
    /** Track stroke width @values 0, 14, 28 */
    strokeWidth = 14,
    /** Display format template @values valueTemplate */
    valueTemplate,
    /** Value arc color @values valueColor */
    valueColor,
    /** Background arc color @values rangeColor */
    rangeColor,
    /** Display numeric value */
    showValue = true,
    /** Disabled state */
    disabled = false,
    /** Read-only state */
    readOnly = false,
    children,
  }: {
    /** Current value */
    value: Num;
    /** Minimum value */
    min?: Num;
    /** Maximum value */
    max?: Num;
    /** Step increment */
    step?: Num;
    /** Knob diameter in pixels */
    size?: Num;
    /** Track stroke width */
    strokeWidth?: Num;
    /** Display format template */
    valueTemplate: Str;
    /** Value arc color */
    valueColor: Str;
    /** Background arc color */
    rangeColor: Str;
    /** Display numeric value */
    showValue?: Bool;
    /** Disabled state */
    disabled?: Bool;
    /** Read-only state */
    readOnly?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
