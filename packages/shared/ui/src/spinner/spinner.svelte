<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SpinnerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SpinnerProps = v.InferOutput<typeof SpinnerPropsSchema>;
</script>

<script lang="ts">
  /**
   * Spinner — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Spinner />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SpinnerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SpinnerProps = $derived.by(() => {
    const rawProps: SpinnerProps = stripSvelteProps(allProps);
    const result = safeParse(SpinnerPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SpinnerProps;
  });
</script>

<div data-slot="spinner" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
