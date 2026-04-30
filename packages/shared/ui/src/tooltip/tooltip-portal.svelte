<script lang="ts">
  /**
   * TooltipPortal Svelte component — renders Tooltip content
   * into a body-level portal so it escapes any clipped or
   * transformed parent.
   *
   * @module
   */
  import { Tooltip as TooltipPrimitive } from 'bits-ui';

  let { ...restProps }: TooltipPrimitive.PortalProps = $props();
</script>

<TooltipPrimitive.Portal {...restProps} />
