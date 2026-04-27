<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Root container for a command palette with fuzzy search and keyboard navigation.
   *
   * Provides the search context and styling wrapper for CommandInput, CommandList, CommandGroup, and CommandItem children.
   *
   * @module
   */
  import { cn } from '../utils.js';
  import { Command as CommandPrimitive } from 'bits-ui';

  /** Bits UI Command root API instance type — exposed for external control. */
  export type CommandRootApi = CommandPrimitive.Root;

  let {
    /** Command menu API instance for external control. */
    api = $bindable(null),
    ref = $bindable(null),
    /** The current input search value. @values search, filter, find */
    value = $bindable(''),
    class: className,
    ...restProps
  }: CommandPrimitive.RootProps & {
    api?: CommandRootApi | null;
  } = $props();
</script>

<CommandPrimitive.Root
  bind:this={api}
  bind:value
  bind:ref
  data-slot="command"
  class={cn(
    'bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md',
    className,
  )}
  {...restProps}
/>
