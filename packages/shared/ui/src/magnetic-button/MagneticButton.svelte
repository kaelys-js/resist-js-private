<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MagneticButtonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MagneticButton. */
  export type MagneticButtonProps = v.InferOutput<typeof MagneticButtonPropsSchema>;
</script>

<script lang="ts">
  /**
   * MagneticButton — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MagneticButton />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MagneticButtonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MagneticButtonProps = $derived.by(() => {
    const rawProps: MagneticButtonProps = stripSvelteProps(allProps);
    const result = safeParse(MagneticButtonPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MagneticButtonProps;
  });
</script>

<div data-slot="magnetic-button" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
