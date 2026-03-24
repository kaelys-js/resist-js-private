<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StackPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type StackProps = v.InferOutput<typeof StackPropsSchema>;
</script>

<script lang="ts">
  /**
   * Stack — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Stack />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StackProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StackProps = $derived.by(() => {
    const rawProps: StackProps = stripSvelteProps(allProps);
    const result = safeParse(StackPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StackProps;
  });
</script>

<div data-slot="stack" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
