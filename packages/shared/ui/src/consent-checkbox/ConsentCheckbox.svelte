<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ConsentCheckbox — checkbox for capturing user consent (GDPR /
   * terms-of-service). Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ConsentCheckboxPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ConsentCheckbox. */
  export type ConsentCheckboxProps = v.InferOutput<typeof ConsentCheckboxPropsSchema>;
</script>

<script lang="ts">
  /**
   * ConsentCheckbox — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ConsentCheckbox />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ConsentCheckboxProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ConsentCheckboxProps = $derived.by(() => {
    const rawProps: ConsentCheckboxProps = stripSvelteProps(allProps);
    const result = safeParse(ConsentCheckboxPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ConsentCheckboxProps;
  });
</script>

<div data-slot="consent-checkbox" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
