<script lang="ts">
  /**
   * A labeled group of related command items within a command palette.
   *
   * Renders an optional heading above its child items and automatically generates a unique group value for filtering.
   *
   * @module
   */
  import { Command as CommandPrimitive, useId } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    children,
    /** Group heading label text. @values Actions, Settings, Navigation */
    heading,
    /** Additional CSS classes for the heading element. @values text-sm font-semibold, text-xs ps-4 */
    headingClass,
    /** Group value for filtering. @values actions, settings, navigation */
    value,
    ...restProps
  }: CommandPrimitive.GroupProps & {
    heading?: string;
    headingClass?: string;
  } = $props();
</script>

<CommandPrimitive.Group
  bind:ref
  data-slot="command-group"
  class={cn('text-foreground overflow-hidden p-1', className)}
  value={value ?? heading ?? `----${useId()}`}
  {...restProps}
>
  {#if heading}
    <CommandPrimitive.GroupHeading
      class={cn('text-muted-foreground px-2 py-1.5 text-xs font-medium', headingClass)}
    >
      {heading}
    </CommandPrimitive.GroupHeading>
  {/if}
  <CommandPrimitive.GroupItems {children} />
</CommandPrimitive.Group>
