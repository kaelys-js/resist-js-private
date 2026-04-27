<script lang="ts">
  /**
   * Accordion trigger — clickable heading that toggles its
   * `Accordion.Item` open/closed. Wraps the Bits UI `Header` +
   * `Trigger` primitives, exposes a `level` prop to set the
   * underlying heading level, and renders a rotating chevron
   * indicator.
   *
   * @module
   */

  import { Accordion as AccordionPrimitive } from 'bits-ui';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import { cn, type WithoutChild } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    /** Heading level for the trigger wrapper. @values 1, 2, 3, 4, 5, 6 */
    level = 3,
    children,
    ...restProps
  }: WithoutChild<AccordionPrimitive.TriggerProps> & {
    level?: AccordionPrimitive.HeaderProps['level'];
  } = $props();
</script>

<AccordionPrimitive.Header {level} class="flex">
  <AccordionPrimitive.Trigger
    data-slot="accordion-trigger"
    bind:ref
    class={cn(
      'focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-start text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180',
      className,
    )}
    {...restProps}
  >
    {@render children?.()}
    <ChevronDownIcon
      class="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200"
    />
  </AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>
