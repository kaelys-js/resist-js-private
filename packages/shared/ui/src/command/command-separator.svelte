<script lang="ts">
  /**
   * A horizontal rule used to visually separate groups within a command palette.
   */
  import { Command as CommandPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: CommandPrimitive.SeparatorProps = $props();
</script>

<CommandPrimitive.Separator
  bind:ref
  data-slot="command-separator"
  class={cn('bg-border -mx-1 h-px', className)}
  {...restProps}
/>
