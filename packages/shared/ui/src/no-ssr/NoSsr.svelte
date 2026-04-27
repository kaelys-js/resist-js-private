<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NoSsrPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for NoSsr. */
  export type NoSsrProps = v.InferOutput<typeof NoSsrPropsSchema>;
</script>

<script lang="ts">
  /**
   * NoSsr — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <NoSsr />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NoSsrProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NoSsrProps = $derived.by(() => {
    const rawProps: NoSsrProps = stripSvelteProps(allProps);
    const result = safeParse(NoSsrPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NoSsrProps;
  });
</script>

<div data-slot="no-ssr" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
