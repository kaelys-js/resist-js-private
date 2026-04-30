<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Container — max-width content container for centering page
   * content. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ContainerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Container. */
  export type ContainerProps = v.InferOutput<typeof ContainerPropsSchema>;
</script>

<script lang="ts">
  /**
   * Container — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Container />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ContainerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ContainerProps = $derived.by(() => {
    const rawProps: ContainerProps = stripSvelteProps(allProps);
    const result = safeParse(ContainerPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ContainerProps;
  });
</script>

<div data-slot="container" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
