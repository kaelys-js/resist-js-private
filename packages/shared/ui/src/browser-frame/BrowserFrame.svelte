<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BrowserFrame — decorative wrapper rendering content inside a
   * realistic browser window frame with address bar, tabs, and
   * window controls. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BrowserFramePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BrowserFrame. */
  export type BrowserFrameProps = v.InferOutput<typeof BrowserFramePropsSchema>;
</script>

<script lang="ts">
  /**
   * BrowserFrame — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BrowserFrame />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BrowserFrameProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BrowserFrameProps = $derived.by(() => {
    const rawProps: BrowserFrameProps = stripSvelteProps(allProps);
    const result = safeParse(BrowserFramePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BrowserFrameProps;
  });
</script>

<div data-slot="browser-frame" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
