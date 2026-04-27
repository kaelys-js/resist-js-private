<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Countdown — countdown timer displaying days / hours /
   * minutes / seconds remaining. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CountdownPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Countdown. */
  export type CountdownProps = v.InferOutput<typeof CountdownPropsSchema>;
</script>

<script lang="ts">
  /**
   * Countdown — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Countdown />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CountdownProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CountdownProps = $derived.by(() => {
    const rawProps: CountdownProps = stripSvelteProps(allProps);
    const result = safeParse(CountdownPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CountdownProps;
  });
</script>

<div data-slot="countdown" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
