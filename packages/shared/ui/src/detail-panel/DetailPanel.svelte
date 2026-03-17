<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DetailPanelPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DetailPanelProps = v.InferOutput<typeof DetailPanelPropsSchema>;
</script>

<script lang="ts">
  /**
   * DetailPanel — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DetailPanel />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DetailPanelProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DetailPanelProps = $derived.by(() => {
    const rawProps: DetailPanelProps = stripSvelteProps(allProps);
    const result = safeParse(DetailPanelPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DetailPanelProps;
  });
</script>

<div data-slot="detail-panel" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
