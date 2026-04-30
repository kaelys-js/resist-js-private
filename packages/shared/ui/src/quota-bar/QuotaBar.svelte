<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * QuotaBar Svelte component — labelled progress bar showing
   * usage against an account/plan quota limit. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const QuotaBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for QuotaBar. */
  export type QuotaBarProps = v.InferOutput<typeof QuotaBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * QuotaBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <QuotaBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = QuotaBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: QuotaBarProps = $derived.by(() => {
    const rawProps: QuotaBarProps = stripSvelteProps(allProps);
    const result = safeParse(QuotaBarPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as QuotaBarProps;
  });
</script>

<div data-slot="quota-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
