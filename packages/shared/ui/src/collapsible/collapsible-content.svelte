<script lang="ts">
  /**
   * Collapsible content — animated content panel that expands /
   * collapses with the parent `Collapsible.Root`. Wraps Bits UI's
   * `Collapsible.Content` with the open/close height animation.
   *
   * @module
   */

  import { Collapsible as CollapsiblePrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: CollapsiblePrimitive.ContentProps = $props();
</script>

<CollapsiblePrimitive.Content
  bind:ref
  data-slot="collapsible-content"
  class={cn(
    'overflow-hidden transition-all duration-200 ease-in-out data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
    className,
  )}
  {...restProps}
/>
