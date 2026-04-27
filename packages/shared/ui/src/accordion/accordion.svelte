<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Accordion root — wraps Bits UI's `Accordion.Root` with our
   * `data-slot` convention and bindable `ref` / `value` props.
   * Use together with the `accordion-item`, `accordion-trigger`,
   * and `accordion-content` sub-components.
   *
   * @module
   */

  import { Accordion as AccordionPrimitive } from 'bits-ui';

  let {
    ref = $bindable(null),
    /** The currently expanded item value(s). */
    value = $bindable(),
    ...restProps
  }: AccordionPrimitive.RootProps = $props();
</script>

<AccordionPrimitive.Root
  bind:ref
  bind:value={value as never}
  data-slot="accordion"
  {...restProps}
/>
