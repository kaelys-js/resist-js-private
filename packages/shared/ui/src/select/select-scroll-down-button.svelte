<script lang="ts">
  /**
   * SelectScrollDownButton Svelte component — chevron button
   * shown at the bottom of a long Select content panel
   * scrolling the option list down.
   *
   * @module
   */
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import { Select as SelectPrimitive } from 'bits-ui';
  import { cn, type WithoutChildrenOrChild } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<SelectPrimitive.ScrollDownButtonProps> = $props();
</script>

<SelectPrimitive.ScrollDownButton
  bind:ref
  data-slot="select-scroll-down-button"
  class={cn('flex items-center justify-center py-1', className)}
  {...restProps}
>
  <ChevronDownIcon class="size-4" />
</SelectPrimitive.ScrollDownButton>
