<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * DefinitionList — semantic `<dl>` definition-list rendering
   * term / definition pairs. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DefinitionListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DefinitionList. */
  export type DefinitionListProps = v.InferOutput<typeof DefinitionListPropsSchema>;
</script>

<script lang="ts">
  /**
   * DefinitionList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DefinitionList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DefinitionListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DefinitionListProps = $derived.by(() => {
    const rawProps: DefinitionListProps = stripSvelteProps(allProps);
    const result = safeParse(DefinitionListPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DefinitionListProps;
  });
</script>

<div data-slot="definition-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
