<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TextInputPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TextInputProps = v.InferOutput<typeof TextInputPropsSchema>;
</script>

<script lang="ts">
  /**
   * TextInput — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TextInput />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TextInputProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TextInputProps = $derived.by(() => {
    const rawProps: TextInputProps = stripSvelteProps(allProps);
    const result = safeParse(TextInputPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TextInputProps;
  });
</script>

<div data-slot="text-input" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
