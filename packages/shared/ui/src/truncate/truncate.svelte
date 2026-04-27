<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TruncatePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Truncate. */
  export type TruncateProps = v.InferOutput<typeof TruncatePropsSchema>;
</script>

<script lang="ts">
  /**
   * Truncate — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Truncate />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TruncateProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TruncateProps = $derived.by(() => {
    const rawProps: TruncateProps = stripSvelteProps(allProps);
    const result = safeParse(TruncatePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TruncateProps;
  });
</script>

<div data-slot="truncate" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
