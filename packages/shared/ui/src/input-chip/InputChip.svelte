<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const InputChipPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for InputChip. */
  export type InputChipProps = v.InferOutput<typeof InputChipPropsSchema>;
</script>

<script lang="ts">
  /**
   * InputChip — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <InputChip />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = InputChipProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: InputChipProps = $derived.by(() => {
    const rawProps: InputChipProps = stripSvelteProps(allProps);
    const result = safeParse(InputChipPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as InputChipProps;
  });
</script>

<div data-slot="input-chip" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
