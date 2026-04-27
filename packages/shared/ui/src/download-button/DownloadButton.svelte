<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DownloadButtonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DownloadButton. */
  export type DownloadButtonProps = v.InferOutput<typeof DownloadButtonPropsSchema>;
</script>

<script lang="ts">
  /**
   * DownloadButton — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DownloadButton />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DownloadButtonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DownloadButtonProps = $derived.by(() => {
    const rawProps: DownloadButtonProps = stripSvelteProps(allProps);
    const result = safeParse(DownloadButtonPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DownloadButtonProps;
  });
</script>

<div data-slot="download-button" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
