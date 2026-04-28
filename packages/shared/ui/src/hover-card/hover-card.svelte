<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * HoverCard root — manages the open state for a card that
   * appears on hover with a preview of linked content. Wraps
   * Bits UI's `LinkPreview` primitive.
   *
   * @module
   */
  import { LinkPreview as HoverCardPrimitive } from 'bits-ui';

  let {
    /** Whether the hover card is visible. */
    open = $bindable(false),
    ...restProps
  }: HoverCardPrimitive.RootProps = $props();
</script>

<HoverCardPrimitive.Root bind:open {...restProps} />
