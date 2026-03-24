<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const VersionHistoryPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type VersionHistoryProps = v.InferOutput<typeof VersionHistoryPropsSchema>;
</script>

<script lang="ts">
  /**
   * VersionHistory — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <VersionHistory />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = VersionHistoryProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: VersionHistoryProps = $derived.by(() => {
    const rawProps: VersionHistoryProps = stripSvelteProps(allProps);
    const result = safeParse(VersionHistoryPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as VersionHistoryProps;
  });
</script>

<div data-slot="version-history" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
