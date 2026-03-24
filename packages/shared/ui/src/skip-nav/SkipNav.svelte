<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SkipNavPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SkipNavProps = v.InferOutput<typeof SkipNavPropsSchema>;
</script>

<script lang="ts">
  /**
   * SkipNav — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SkipNav />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SkipNavProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SkipNavProps = $derived.by(() => {
    const rawProps: SkipNavProps = stripSvelteProps(allProps);
    const result = safeParse(SkipNavPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SkipNavProps;
  });
</script>

<div data-slot="skip-nav" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
