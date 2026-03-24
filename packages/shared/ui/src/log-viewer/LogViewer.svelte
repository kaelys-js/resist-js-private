<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LogViewerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type LogViewerProps = v.InferOutput<typeof LogViewerPropsSchema>;
</script>

<script lang="ts">
  /**
   * LogViewer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LogViewer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LogViewerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LogViewerProps = $derived.by(() => {
    const rawProps: LogViewerProps = stripSvelteProps(allProps);
    const result = safeParse(LogViewerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LogViewerProps;
  });
</script>

<div data-slot="log-viewer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
