<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const InputMaskPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type InputMaskProps = v.InferOutput<typeof InputMaskPropsSchema>;
</script>

<script lang="ts">
  /**
   * InputMask — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <InputMask />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = InputMaskProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: InputMaskProps = $derived.by(() => {
    const rawProps: InputMaskProps = stripSvelteProps(allProps);
    const result = safeParse(InputMaskPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as InputMaskProps;
  });
</script>

<div data-slot="input-mask" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
