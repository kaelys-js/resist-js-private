<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BackgroundLines — animated line-pattern background.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BackgroundLinesPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BackgroundLines. */
  export type BackgroundLinesProps = v.InferOutput<typeof BackgroundLinesPropsSchema>;
</script>

<script lang="ts">
  /**
   * BackgroundLines — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BackgroundLines />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BackgroundLinesProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BackgroundLinesProps = $derived.by(() => {
    const rawProps: BackgroundLinesProps = stripSvelteProps(allProps);
    const result = safeParse(BackgroundLinesPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BackgroundLinesProps;
  });
</script>

<div data-slot="background-lines" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
