<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * StatefulButton Svelte component — button that animates
   * through idle/loading/success/error states based on the
   * lifecycle of its action. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StatefulButtonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for StatefulButton. */
  export type StatefulButtonProps = v.InferOutput<typeof StatefulButtonPropsSchema>;
</script>

<script lang="ts">
  /**
   * StatefulButton — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StatefulButton />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StatefulButtonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StatefulButtonProps = $derived.by(() => {
    const rawProps: StatefulButtonProps = stripSvelteProps(allProps);
    const result = safeParse(StatefulButtonPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StatefulButtonProps;
  });
</script>

<div data-slot="stateful-button" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
