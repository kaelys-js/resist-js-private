<script lang="ts">
  /**
   * InputGroup.Input — text input slot inside an `InputGroup`
   * that strips its own border to integrate with surrounding
   * addons.
   *
   * @module
   */
  import { cn } from '../utils.js';
  import type { ComponentProps } from 'svelte';
  import { Input } from '../input/index.js';

  let {
    ref = $bindable(null),
    /** The input text value. */
    value = $bindable(),
    class: className,
    ...props
  }: ComponentProps<typeof Input> = $props();
</script>

<Input
  bind:ref
  data-slot="input-group-control"
  class={cn(
    'flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent',
    className,
  )}
  bind:value
  {...props}
/>
