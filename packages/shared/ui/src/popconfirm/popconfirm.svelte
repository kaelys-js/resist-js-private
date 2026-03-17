<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PopconfirmPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PopconfirmProps = v.InferOutput<typeof PopconfirmPropsSchema>;
</script>

<script lang="ts">
  /**
   * Popconfirm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Popconfirm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PopconfirmProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PopconfirmProps = $derived.by(() => {
    const rawProps: PopconfirmProps = stripSvelteProps(allProps);
    const result = safeParse(PopconfirmPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PopconfirmProps;
  });
</script>

<div data-slot="popconfirm" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
