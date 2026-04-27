<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const InplacePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Inplace. */
  export type InplaceProps = v.InferOutput<typeof InplacePropsSchema>;
</script>

<script lang="ts">
  /**
   * Inplace — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Inplace />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = InplaceProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: InplaceProps = $derived.by(() => {
    const rawProps: InplaceProps = stripSvelteProps(allProps);
    const result = safeParse(InplacePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as InplaceProps;
  });
</script>

<div data-slot="inplace" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
