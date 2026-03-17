<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SpacerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SpacerProps = v.InferOutput<typeof SpacerPropsSchema>;
</script>

<script lang="ts">
  /**
   * Spacer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Spacer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SpacerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SpacerProps = $derived.by(() => {
    const rawProps: SpacerProps = stripSvelteProps(allProps);
    const result = safeParse(SpacerPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SpacerProps;
  });
</script>

<div data-slot="spacer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
