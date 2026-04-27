<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ExitIntentPopupPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ExitIntentPopup. */
  export type ExitIntentPopupProps = v.InferOutput<typeof ExitIntentPopupPropsSchema>;
</script>

<script lang="ts">
  /**
   * ExitIntentPopup — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ExitIntentPopup />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ExitIntentPopupProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ExitIntentPopupProps = $derived.by(() => {
    const rawProps: ExitIntentPopupProps = stripSvelteProps(allProps);
    const result = safeParse(ExitIntentPopupPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ExitIntentPopupProps;
  });
</script>

<div data-slot="exit-intent-popup" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
