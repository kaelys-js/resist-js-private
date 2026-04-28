<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * JsonViewer Svelte component — collapsible tree display of
   * JSON / object data for devtools panels. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const JsonViewerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for JsonViewer. */
  export type JsonViewerProps = v.InferOutput<typeof JsonViewerPropsSchema>;
</script>

<script lang="ts">
  /**
   * JsonViewer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <JsonViewer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = JsonViewerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: JsonViewerProps = $derived.by(() => {
    const rawProps: JsonViewerProps = stripSvelteProps(allProps);
    const result = safeParse(JsonViewerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as JsonViewerProps;
  });
</script>

<div data-slot="json-viewer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
