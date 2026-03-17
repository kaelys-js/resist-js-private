<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TagPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TagProps = v.InferOutput<typeof TagPropsSchema>;
</script>

<script lang="ts">
  /**
   * Tag — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Tag />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TagProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TagProps = $derived.by(() => {
    const rawProps: TagProps = stripSvelteProps(allProps);
    const result = safeParse(TagPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TagProps;
  });
</script>

<div data-slot="tag" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
