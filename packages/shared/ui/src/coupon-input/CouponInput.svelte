<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CouponInputPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type CouponInputProps = v.InferOutput<typeof CouponInputPropsSchema>;
</script>

<script lang="ts">
  /**
   * CouponInput — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CouponInput />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CouponInputProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CouponInputProps = $derived.by(() => {
    const rawProps: CouponInputProps = stripSvelteProps(allProps);
    const result = safeParse(CouponInputPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CouponInputProps;
  });
</script>

<div data-slot="coupon-input" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
