<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ClipboardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Clipboard. */
  export type ClipboardProps = v.InferOutput<typeof ClipboardPropsSchema>;
</script>

<script lang="ts">
  /**
   * Clipboard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Clipboard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ClipboardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ClipboardProps = $derived.by(() => {
    const rawProps: ClipboardProps = stripSvelteProps(allProps);
    const result = safeParse(ClipboardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ClipboardProps;
  });
</script>

<div data-slot="clipboard" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
