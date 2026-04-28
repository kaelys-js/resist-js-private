<script lang="ts">
  /**
   * SheetTitle Svelte component — heading text rendered with
   * semibold foreground styling at the top of the sheet
   * panel.
   *
   * @module
   */
  import { Dialog as SheetPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: SheetPrimitive.TitleProps = $props();
</script>

<SheetPrimitive.Title
  bind:ref
  data-slot="sheet-title"
  class={cn('text-foreground font-semibold', className)}
  {...restProps}
/>
