<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Flex Svelte component — layout utility that applies CSS
   * flexbox properties to arrange children. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FlexPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Flex. */
  export type FlexProps = v.InferOutput<typeof FlexPropsSchema>;
</script>

<script lang="ts">
  /**
   * Flex — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Flex />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FlexProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FlexProps = $derived.by(() => {
    const rawProps: FlexProps = stripSvelteProps(allProps);
    const result = safeParse(FlexPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FlexProps;
  });
</script>

<div data-slot="flex" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
