<script lang="ts">
  /**
   * Dialog trigger — element that opens the surrounding
   * `Dialog.Root`. Wraps Bits UI's `Dialog.Trigger` with our
   * `data-slot` convention.
   *
   * @module
   */

  import { Dialog as DialogPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: DialogPrimitive.TriggerProps = $props();
</script>

<DialogPrimitive.Trigger bind:ref data-slot="dialog-trigger" {...restProps} />
