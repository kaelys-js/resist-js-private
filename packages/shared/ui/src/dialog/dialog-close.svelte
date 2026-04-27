<script lang="ts">
  /**
   * Dialog close — element that closes the surrounding
   * `Dialog.Root`. Wraps Bits UI's `Dialog.Close` with our
   * `data-slot` convention.
   *
   * @module
   */

  import { Dialog as DialogPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: DialogPrimitive.CloseProps = $props();
</script>

<DialogPrimitive.Close bind:ref data-slot="dialog-close" {...restProps} />
