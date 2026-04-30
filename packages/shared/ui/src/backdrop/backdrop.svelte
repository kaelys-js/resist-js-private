<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Backdrop — dimming scrim layer placed behind modals and
   * popovers. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BackdropPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Backdrop. */
  export type BackdropProps = v.InferOutput<typeof BackdropPropsSchema>;
</script>

<script lang="ts">
  /**
   * Backdrop — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Backdrop />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BackdropProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BackdropProps = $derived.by(() => {
    const rawProps: BackdropProps = stripSvelteProps(allProps);
    const result = safeParse(BackdropPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BackdropProps;
  });
</script>

<div data-slot="backdrop" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
