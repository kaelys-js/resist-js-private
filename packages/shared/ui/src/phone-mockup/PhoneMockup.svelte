<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PhoneMockup Svelte component — phone-frame device mockup
   * for showcasing app screenshots. Placeholder shell awaiting
   * full implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PhoneMockupPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PhoneMockup. */
  export type PhoneMockupProps = v.InferOutput<typeof PhoneMockupPropsSchema>;
</script>

<script lang="ts">
  /**
   * PhoneMockup — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PhoneMockup />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PhoneMockupProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PhoneMockupProps = $derived.by(() => {
    const rawProps: PhoneMockupProps = stripSvelteProps(allProps);
    const result = safeParse(PhoneMockupPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PhoneMockupProps;
  });
</script>

<div data-slot="phone-mockup" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
