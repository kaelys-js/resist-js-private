<script lang="ts">
  /**
   * SelectPortal Svelte component — renders the Select
   * dropdown content into a body-level portal so it escapes
   * any clipped/transformed parent.
   *
   * @module
   */
  import { Select as SelectPrimitive } from 'bits-ui';

  let { ...restProps }: SelectPrimitive.PortalProps = $props();
</script>

<SelectPrimitive.Portal {...restProps} />
