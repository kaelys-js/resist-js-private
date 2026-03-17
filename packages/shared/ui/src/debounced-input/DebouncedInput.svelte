<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DebouncedInputPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DebouncedInputProps = v.InferOutput<typeof DebouncedInputPropsSchema>;
</script>

<script lang="ts">
  /**
   * DebouncedInput — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DebouncedInput />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DebouncedInputProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DebouncedInputProps = $derived.by(() => {
    const rawProps: DebouncedInputProps = stripSvelteProps(allProps);
    const result = safeParse(DebouncedInputPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DebouncedInputProps;
  });
</script>

<div data-slot="debounced-input" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
