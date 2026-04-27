<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CsatWidgetPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CsatWidget. */
  export type CsatWidgetProps = v.InferOutput<typeof CsatWidgetPropsSchema>;
</script>

<script lang="ts">
  /**
   * CsatWidget — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CsatWidget />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CsatWidgetProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CsatWidgetProps = $derived.by(() => {
    const rawProps: CsatWidgetProps = stripSvelteProps(allProps);
    const result = safeParse(CsatWidgetPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CsatWidgetProps;
  });
</script>

<div data-slot="csat-widget" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
