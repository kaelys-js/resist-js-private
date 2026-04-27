<script lang="ts">
  /**
   * Accordion item — single collapsible section inside an
   * `Accordion.Root`. Wraps Bits UI's `Accordion.Item` with our
   * `data-slot` convention and the bottom-border styling that
   * separates adjacent items.
   *
   * @module
   */

  import { Accordion as AccordionPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: AccordionPrimitive.ItemProps = $props();
</script>

<AccordionPrimitive.Item
  bind:ref
  data-slot="accordion-item"
  class={cn('border-b last:border-b-0', className)}
  {...restProps}
/>
