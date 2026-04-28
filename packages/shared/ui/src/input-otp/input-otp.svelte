<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * InputOTP — root for an OTP / one-time-password input
   * composed of `Group`, `Slot`, and `Separator` sub-components.
   * Wraps Bits UI's `PinInput` primitive.
   *
   * @module
   */
  import { PinInput as InputOTPPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    /** The current OTP input value. @values 1234, 567890, ABCDEF */
    value = $bindable(''),
    ...restProps
  }: InputOTPPrimitive.RootProps = $props();
</script>

<InputOTPPrimitive.Root
  bind:ref
  bind:value
  data-slot="input-otp"
  class={cn(
    'flex items-center gap-2 has-disabled:opacity-50 [&_input]:disabled:cursor-not-allowed',
    className,
  )}
  {...restProps}
/>
