<script lang="ts">
  /**
   * SidebarInput Svelte component — text input styled for
   * use inside a sidebar (reduced height, no shadow), suited
   * for in-sidebar search.
   *
   * @module
   */
  import type { ComponentProps } from 'svelte';
  import { Input } from '../input/index.js';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    /** The input text value. @values search, filter */
    value = $bindable(''),
    class: className,
    ...restProps
  }: ComponentProps<typeof Input> = $props();
</script>

<Input
  bind:ref
  bind:value
  data-slot="sidebar-input"
  data-sidebar="input"
  class={cn('bg-background h-8 w-full shadow-none', className)}
  {...restProps}
/>
