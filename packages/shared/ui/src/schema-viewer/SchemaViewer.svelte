<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SchemaViewerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SchemaViewer. */
  export type SchemaViewerProps = v.InferOutput<typeof SchemaViewerPropsSchema>;
</script>

<script lang="ts">
  /**
   * SchemaViewer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SchemaViewer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SchemaViewerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SchemaViewerProps = $derived.by(() => {
    const rawProps: SchemaViewerProps = stripSvelteProps(allProps);
    const result = safeParse(SchemaViewerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SchemaViewerProps;
  });
</script>

<div data-slot="schema-viewer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
