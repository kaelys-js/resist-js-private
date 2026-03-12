<script lang="ts" generics="T extends Record<string, unknown>, U extends FormPath<T>">
  import * as FormPrimitive from 'formsnap';

  import type { FormPath } from 'sveltekit-superforms';

  import { cn, type WithoutChild } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    /** SuperForm instance for form state management. */
    form,
    /** The fieldset name in the form schema. */
    name,
    ...restProps
  }: WithoutChild<FormPrimitive.FieldsetProps<T, U>> = $props();
</script>

<FormPrimitive.Fieldset bind:ref {form} {name} class={cn('space-y-2', className)} {...restProps} />
