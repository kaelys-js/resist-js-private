<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * MasterDetail Svelte component — split-pane list / detail
   * layout for browsing item collections. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MasterDetailPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MasterDetail. */
  export type MasterDetailProps = v.InferOutput<typeof MasterDetailPropsSchema>;
</script>

<script lang="ts">
  /**
   * MasterDetail — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MasterDetail />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MasterDetailProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MasterDetailProps = $derived.by(() => {
    const rawProps: MasterDetailProps = stripSvelteProps(allProps);
    const result = safeParse(MasterDetailPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MasterDetailProps;
  });
</script>

<div data-slot="master-detail" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
