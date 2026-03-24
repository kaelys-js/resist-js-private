<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CurvedTextPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type CurvedTextProps = v.InferOutput<typeof CurvedTextPropsSchema>;
</script>

<script lang="ts">
  /**
   * CurvedText — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CurvedText />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CurvedTextProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CurvedTextProps = $derived.by(() => {
    const rawProps: CurvedTextProps = stripSvelteProps(allProps);
    const result = safeParse(CurvedTextPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CurvedTextProps;
  });
</script>

<div data-slot="curved-text" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
