<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TextDividerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TextDividerProps = v.InferOutput<typeof TextDividerPropsSchema>;
</script>

<script lang="ts">
  /**
   * TextDivider — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TextDivider />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TextDividerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TextDividerProps = $derived.by(() => {
    const rawProps: TextDividerProps = stripSvelteProps(allProps);
    const result = safeParse(TextDividerPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TextDividerProps;
  });
</script>

<div data-slot="text-divider" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
