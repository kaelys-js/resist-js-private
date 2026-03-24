<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CascadeSelectPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type CascadeSelectProps = v.InferOutput<typeof CascadeSelectPropsSchema>;
</script>

<script lang="ts">
  /**
   * CascadeSelect — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CascadeSelect />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CascadeSelectProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CascadeSelectProps = $derived.by(() => {
    const rawProps: CascadeSelectProps = stripSvelteProps(allProps);
    const result = safeParse(CascadeSelectPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CascadeSelectProps;
  });
</script>

<div data-slot="cascade-select" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
