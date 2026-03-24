<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const UploadProgressPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type UploadProgressProps = v.InferOutput<typeof UploadProgressPropsSchema>;
</script>

<script lang="ts">
  /**
   * UploadProgress — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <UploadProgress />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = UploadProgressProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: UploadProgressProps = $derived.by(() => {
    const rawProps: UploadProgressProps = stripSvelteProps(allProps);
    const result = safeParse(UploadProgressPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as UploadProgressProps;
  });
</script>

<div data-slot="upload-progress" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
