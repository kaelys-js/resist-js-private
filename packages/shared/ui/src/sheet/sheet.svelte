<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Sheet root Svelte component — Bits UI `Dialog.Root`
   * wrapper that manages open/close state for a slide-in
   * panel overlay (drawer).
   *
   * @module
   */
  import { Dialog as SheetPrimitive } from 'bits-ui';

  let {
    /** Whether the sheet is open. */
    open = $bindable(false),
    ...restProps
  }: SheetPrimitive.RootProps = $props();
</script>

<SheetPrimitive.Root bind:open {...restProps} />
