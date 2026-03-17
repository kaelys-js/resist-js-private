<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LinkPreviewPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type LinkPreviewProps = v.InferOutput<typeof LinkPreviewPropsSchema>;
</script>

<script lang="ts">
  /**
   * LinkPreview — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LinkPreview />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LinkPreviewProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LinkPreviewProps = $derived.by(() => {
    const rawProps: LinkPreviewProps = stripSvelteProps(allProps);
    const result = safeParse(LinkPreviewPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LinkPreviewProps;
  });
</script>

<div data-slot="link-preview" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
