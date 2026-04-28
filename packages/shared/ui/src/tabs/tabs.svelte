<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Tabs root Svelte component — Bits UI `Tabs.Root` wrapper
   * managing the active tab value across triggers and
   * content panels.
   *
   * @module
   */
  import { Tabs as TabsPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    /** The active tab value. @values tab-1, tab-2, tab-3 */
    value = $bindable(''),
    class: className,
    ...restProps
  }: TabsPrimitive.RootProps = $props();
</script>

<TabsPrimitive.Root
  bind:ref
  bind:value
  data-slot="tabs"
  class={cn('flex flex-col gap-2', className)}
  {...restProps}
/>
