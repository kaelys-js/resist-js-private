<script lang="ts">
  /**
   * ContextMenu radio group — exclusive-selection grouping for a
   * set of `ContextMenu.RadioItem` children. Wraps Bits UI's
   * `ContextMenu.RadioGroup` with a bindable `value`.
   *
   * @module
   */

  import { ContextMenu as ContextMenuPrimitive } from 'bits-ui';

  let {
    ref = $bindable(null),
    /** The selected radio item value. @values option-1, option-2, option-3 */
    value = $bindable(''),
    ...restProps
  }: ContextMenuPrimitive.RadioGroupProps = $props();
</script>

<ContextMenuPrimitive.RadioGroup
  bind:ref
  bind:value
  data-slot="context-menu-radio-group"
  {...restProps}
/>
