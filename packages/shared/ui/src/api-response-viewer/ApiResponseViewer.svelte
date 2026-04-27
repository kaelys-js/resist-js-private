<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ApiResponseViewerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ApiResponseViewer. */
  export type ApiResponseViewerProps = v.InferOutput<typeof ApiResponseViewerPropsSchema>;
</script>

<script lang="ts">
  /**
   * ApiResponseViewer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ApiResponseViewer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ApiResponseViewerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ApiResponseViewerProps = $derived.by(() => {
    const rawProps: ApiResponseViewerProps = stripSvelteProps(allProps);
    const result = safeParse(ApiResponseViewerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ApiResponseViewerProps;
  });
</script>

<div data-slot="api-response-viewer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
