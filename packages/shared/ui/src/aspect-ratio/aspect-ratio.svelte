<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * AspectRatio — wraps Bits UI's `AspectRatio.Root` so child
   * content maintains a consistent width-to-height ratio. Adds
   * the `data-slot="aspect-ratio"` selector and a bindable `ref`.
   *
   * @module
   */

  import { AspectRatio as AspectRatioPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: AspectRatioPrimitive.RootProps = $props();
</script>

<AspectRatioPrimitive.Root bind:ref data-slot="aspect-ratio" {...restProps} />
