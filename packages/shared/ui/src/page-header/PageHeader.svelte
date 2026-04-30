<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PageHeader Svelte component — page-level header with
   * title and breadcrumbs / actions. Placeholder shell awaiting
   * full implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PageHeaderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PageHeader. */
  export type PageHeaderProps = v.InferOutput<typeof PageHeaderPropsSchema>;
</script>

<script lang="ts">
  /**
   * PageHeader — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PageHeader />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PageHeaderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PageHeaderProps = $derived.by(() => {
    const rawProps: PageHeaderProps = stripSvelteProps(allProps);
    const result = safeParse(PageHeaderPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PageHeaderProps;
  });
</script>

<div data-slot="page-header" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
