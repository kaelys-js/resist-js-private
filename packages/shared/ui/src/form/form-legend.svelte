<script lang="ts">
  /**
   * Form.Legend — `<legend>` slot for a `Form.Fieldset` group
   * wired into Formsnap's accessible association.
   *
   * @module
   */
  import * as FormPrimitive from 'formsnap';
  import { cn, type WithoutChild } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: WithoutChild<FormPrimitive.LegendProps> = $props();
</script>

<FormPrimitive.Legend
  bind:ref
  class={cn('data-[fs-error]:text-destructive text-sm leading-none font-medium', className)}
  {...restProps}
/>
