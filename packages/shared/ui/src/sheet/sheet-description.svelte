<script lang="ts">
  /**
   * Sheet description text rendered in a muted style below the sheet title.
   */
  import { Dialog as SheetPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: SheetPrimitive.DescriptionProps = $props();
</script>

<SheetPrimitive.Description
  bind:ref
  data-slot="sheet-description"
  class={cn('text-muted-foreground text-sm', className)}
  {...restProps}
/>
