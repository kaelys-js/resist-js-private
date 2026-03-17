<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CascaderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type CascaderProps = v.InferOutput<typeof CascaderPropsSchema>;
</script>

<script lang="ts">
  /**
   * Cascader — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Cascader />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CascaderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CascaderProps = $derived.by(() => {
    const rawProps: CascaderProps = stripSvelteProps(allProps);
    const result = safeParse(CascaderPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CascaderProps;
  });
</script>

<div data-slot="cascader" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
