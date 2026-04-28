<script lang="ts">
  /**
   * InputOTP.Group — wraps a contiguous run of `InputOTP.Slot`
   * components for visual grouping inside an OTP input.
   *
   * @module
   */
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
  bind:this={ref}
  data-slot="input-otp-group"
  class={cn('flex items-center', className)}
  {...restProps}
>
  {@render children?.()}
</div>
