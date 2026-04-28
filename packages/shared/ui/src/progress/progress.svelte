<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Progress Svelte component — visual indicator showing
   * completion progress of a task; thin wrapper around the
   * Bits UI `Progress` primitive that fills a horizontal bar
   * proportional to `value` / `max`.
   *
   * @module
   */
  import { Progress as ProgressPrimitive } from 'bits-ui';
  import { cn, type WithoutChildrenOrChild } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    /** Maximum value of the progress bar. @values 50, 100, 200, 1000 */
    max = 100,
    /** Current progress value. */
    value,
    ...restProps
  }: WithoutChildrenOrChild<ProgressPrimitive.RootProps> = $props();
</script>

<ProgressPrimitive.Root
  bind:ref
  data-slot="progress"
  class={cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', className)}
  {value}
  {max}
  {...restProps}
>
  <div
    data-slot="progress-indicator"
    class="bg-primary h-full w-full flex-1 transition-all"
    style="transform: translateX(-{100 - (100 * (value ?? 0)) / (max ?? 1)}%)"
  ></div>
</ProgressPrimitive.Root>
