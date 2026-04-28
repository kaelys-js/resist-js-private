<script lang="ts">
  /**
   * Form.Description — secondary helper-text line beneath a
   * `Form.Field` label, wired into Formsnap's accessible
   * description association.
   *
   * @module
   */
  import * as FormPrimitive from 'formsnap';
  import { cn, type WithoutChild } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: WithoutChild<FormPrimitive.DescriptionProps> = $props();
</script>

<FormPrimitive.Description
  bind:ref
  data-slot="form-description"
  class={cn('text-muted-foreground text-sm', className)}
  {...restProps}
/>
