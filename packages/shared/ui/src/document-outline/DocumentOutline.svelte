<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DocumentOutlinePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DocumentOutline. */
  export type DocumentOutlineProps = v.InferOutput<typeof DocumentOutlinePropsSchema>;
</script>

<script lang="ts">
  /**
   * DocumentOutline — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DocumentOutline />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DocumentOutlineProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DocumentOutlineProps = $derived.by(() => {
    const rawProps: DocumentOutlineProps = stripSvelteProps(allProps);
    const result = safeParse(DocumentOutlinePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DocumentOutlineProps;
  });
</script>

<div data-slot="document-outline" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
