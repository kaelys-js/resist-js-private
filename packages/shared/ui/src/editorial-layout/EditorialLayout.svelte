<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * EditorialLayout Svelte component — multi-column editorial
   * layout for long-form content. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level styling
   * overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const EditorialLayoutPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for EditorialLayout. */
  export type EditorialLayoutProps = v.InferOutput<typeof EditorialLayoutPropsSchema>;
</script>

<script lang="ts">
  /**
   * EditorialLayout — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <EditorialLayout />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = EditorialLayoutProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: EditorialLayoutProps = $derived.by(() => {
    const rawProps: EditorialLayoutProps = stripSvelteProps(allProps);
    const result = safeParse(EditorialLayoutPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as EditorialLayoutProps;
  });
</script>

<div data-slot="editorial-layout" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
