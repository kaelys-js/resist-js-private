<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BuffDebuffIconPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BuffDebuffIconProps = v.InferOutput<typeof BuffDebuffIconPropsSchema>;
</script>

<script lang="ts">
  /**
   * BuffDebuffIcon — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BuffDebuffIcon />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BuffDebuffIconProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BuffDebuffIconProps = $derived.by(() => {
    const rawProps: BuffDebuffIconProps = stripSvelteProps(allProps);
    const result = safeParse(BuffDebuffIconPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BuffDebuffIconProps;
  });
</script>

<div data-slot="buff-debuff-icon" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
