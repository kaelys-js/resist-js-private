<script lang="ts">
  /**
   * HoverCard.Trigger — anchor element that activates the
   * HoverCard preview on pointer hover or keyboard focus.
   *
   * @module
   */
  import { LinkPreview as HoverCardPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: HoverCardPrimitive.TriggerProps = $props();
</script>

<HoverCardPrimitive.Trigger bind:ref data-slot="hover-card-trigger" {...restProps} />
