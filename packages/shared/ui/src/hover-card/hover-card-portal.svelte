<script lang="ts">
  /**
   * HoverCard.Portal — mounts a HoverCard's content into the
   * document body so it escapes overflow / z-index traps.
   *
   * @module
   */
  import { LinkPreview as HoverCardPrimitive } from 'bits-ui';

  let { ...restProps }: HoverCardPrimitive.PortalProps = $props();
</script>

<HoverCardPrimitive.Portal {...restProps} />
