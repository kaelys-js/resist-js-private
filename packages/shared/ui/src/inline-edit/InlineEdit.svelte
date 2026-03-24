<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const InlineEditPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type InlineEditProps = v.InferOutput<typeof InlineEditPropsSchema>;
</script>

<script lang="ts">
  /**
   * InlineEdit — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <InlineEdit />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = InlineEditProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: InlineEditProps = $derived.by(() => {
    const rawProps: InlineEditProps = stripSvelteProps(allProps);
    const result = safeParse(InlineEditPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as InlineEditProps;
  });
</script>

<div data-slot="inline-edit" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
