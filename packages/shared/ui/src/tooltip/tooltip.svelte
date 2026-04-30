<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Tooltip root Svelte component — Bits UI `Tooltip.Root`
   * wrapper that manages open / close state and anchors
   * content to its trigger.
   *
   * @module
   */
  import { Tooltip as TooltipPrimitive } from 'bits-ui';

  let {
    /** Whether the tooltip is visible. */
    open = $bindable(false),
    ...restProps
  }: TooltipPrimitive.RootProps = $props();
</script>

<TooltipPrimitive.Root bind:open {...restProps} />
