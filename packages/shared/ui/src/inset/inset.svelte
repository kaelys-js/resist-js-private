<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const InsetPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Inset. */
  export type InsetProps = v.InferOutput<typeof InsetPropsSchema>;
</script>

<script lang="ts">
  /**
   * Inset — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Inset />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = InsetProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: InsetProps = $derived.by(() => {
    const rawProps: InsetProps = stripSvelteProps(allProps);
    const result = safeParse(InsetPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as InsetProps;
  });
</script>

<div data-slot="inset" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
