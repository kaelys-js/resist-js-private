<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AutoLayoutPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AutoLayoutProps = v.InferOutput<typeof AutoLayoutPropsSchema>;
</script>

<script lang="ts">
  /**
   * AutoLayout — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AutoLayout />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AutoLayoutProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AutoLayoutProps = $derived.by(() => {
    const rawProps: AutoLayoutProps = stripSvelteProps(allProps);
    const result = safeParse(AutoLayoutPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AutoLayoutProps;
  });
</script>

<div data-slot="auto-layout" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
