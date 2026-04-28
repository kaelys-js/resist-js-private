<script lang="ts">
  /**
   * Form.FieldErrors — renders the validation error messages
   * for a `Form.Field`, with a customisable per-error class
   * applied to each line.
   *
   * @module
   */
  import * as FormPrimitive from 'formsnap';
  import { cn, type WithoutChild } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    /** CSS class applied to each error message. */
    errorClasses,
    children: childrenProp,
    ...restProps
  }: WithoutChild<FormPrimitive.FieldErrorsProps> & {
    errorClasses?: string | undefined | null;
  } = $props();
</script>

<FormPrimitive.FieldErrors
  bind:ref
  class={cn('text-destructive text-sm font-medium', className)}
  {...restProps}
>
  {#snippet children({ errors, errorProps })}
    {#if childrenProp}
      {@render childrenProp({ errors, errorProps })}
    {:else}
      {#each errors as error, i (error ?? i)}
        <div {...errorProps} class={cn(errorClasses)}>{error}</div>
      {/each}
    {/if}
  {/snippet}
</FormPrimitive.FieldErrors>
