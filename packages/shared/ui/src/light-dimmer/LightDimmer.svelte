<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LightDimmerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type LightDimmerProps = v.InferOutput<typeof LightDimmerPropsSchema>;
</script>

<script lang="ts">
  /**
   * LightDimmer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LightDimmer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LightDimmerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LightDimmerProps = $derived.by(() => {
    const rawProps: LightDimmerProps = stripSvelteProps(allProps);
    const result = safeParse(LightDimmerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LightDimmerProps;
  });
</script>

<div data-slot="light-dimmer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
