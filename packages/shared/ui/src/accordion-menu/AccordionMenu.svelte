<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AccordionMenuPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AccordionMenuProps = v.InferOutput<typeof AccordionMenuPropsSchema>;
</script>

<script lang="ts">
  /**
   * AccordionMenu — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AccordionMenu />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AccordionMenuProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AccordionMenuProps = $derived.by(() => {
    const rawProps: AccordionMenuProps = stripSvelteProps(allProps);
    const result = safeParse(AccordionMenuPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AccordionMenuProps;
  });
</script>

<div data-slot="accordion-menu" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
