<script lang="ts">
  /**
   * Collapsible trigger — toggle element that opens / closes the
   * surrounding `Collapsible.Root`. Wraps Bits UI's
   * `Collapsible.Trigger` with our `data-slot` convention.
   *
   * @module
   */

  import { Collapsible as CollapsiblePrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: CollapsiblePrimitive.TriggerProps = $props();
</script>

<CollapsiblePrimitive.Trigger bind:ref data-slot="collapsible-trigger" {...restProps} />
