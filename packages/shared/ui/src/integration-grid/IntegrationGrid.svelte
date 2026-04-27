<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const IntegrationGridPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for IntegrationGrid. */
  export type IntegrationGridProps = v.InferOutput<typeof IntegrationGridPropsSchema>;
</script>

<script lang="ts">
  /**
   * IntegrationGrid — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <IntegrationGrid />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = IntegrationGridProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: IntegrationGridProps = $derived.by(() => {
    const rawProps: IntegrationGridProps = stripSvelteProps(allProps);
    const result = safeParse(IntegrationGridPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as IntegrationGridProps;
  });
</script>

<div data-slot="integration-grid" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
