<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * FeatureFlagToggle Svelte component — admin-only on/off
   * switch for runtime feature flags. Placeholder shell awaiting
   * full implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FeatureFlagTogglePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FeatureFlagToggle. */
  export type FeatureFlagToggleProps = v.InferOutput<typeof FeatureFlagTogglePropsSchema>;
</script>

<script lang="ts">
  /**
   * FeatureFlagToggle — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FeatureFlagToggle />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FeatureFlagToggleProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FeatureFlagToggleProps = $derived.by(() => {
    const rawProps: FeatureFlagToggleProps = stripSvelteProps(allProps);
    const result = safeParse(FeatureFlagTogglePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FeatureFlagToggleProps;
  });
</script>

<div data-slot="feature-flag-toggle" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
