<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SvgIconPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SvgIcon. */
  export type SvgIconProps = v.InferOutput<typeof SvgIconPropsSchema>;
</script>

<script lang="ts">
  /**
   * SvgIcon — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SvgIcon />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SvgIconProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SvgIconProps = $derived.by(() => {
    const rawProps: SvgIconProps = stripSvelteProps(allProps);
    const result = safeParse(SvgIconPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SvgIconProps;
  });
</script>

<div data-slot="svg-icon" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
