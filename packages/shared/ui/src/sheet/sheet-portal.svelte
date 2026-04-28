<script lang="ts">
  /**
   * SheetPortal Svelte component — renders sheet content into
   * a body-level portal so the panel escapes any clipped or
   * transformed parent.
   *
   * @module
   */
  import { Dialog as SheetPrimitive } from 'bits-ui';

  let { ...restProps }: SheetPrimitive.PortalProps = $props();
</script>

<SheetPrimitive.Portal {...restProps} />
