<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const KpiCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for KpiCard. */
  export type KpiCardProps = v.InferOutput<typeof KpiCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * KpiCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <KpiCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = KpiCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: KpiCardProps = $derived.by(() => {
    const rawProps: KpiCardProps = stripSvelteProps(allProps);
    const result = safeParse(KpiCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as KpiCardProps;
  });
</script>

<div data-slot="kpi-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
