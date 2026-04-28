<script lang="ts">
  /**
   * DropdownMenu portal — renders content into the document body
   * (or a configured target) so the menu escapes overflow / z-index
   * traps imposed by ancestor containers.
   *
   * @module
   */
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

  let { ...restProps }: DropdownMenuPrimitive.PortalProps = $props();
</script>

<DropdownMenuPrimitive.Portal {...restProps} />
