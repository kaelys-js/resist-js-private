<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SpotlightPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Spotlight. */
  export type SpotlightProps = v.InferOutput<typeof SpotlightPropsSchema>;
</script>

<script lang="ts">
  /**
   * Spotlight — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Spotlight />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SpotlightProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SpotlightProps = $derived.by(() => {
    const rawProps: SpotlightProps = stripSvelteProps(allProps);
    const result = safeParse(SpotlightPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SpotlightProps;
  });
</script>

<div data-slot="spotlight" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
