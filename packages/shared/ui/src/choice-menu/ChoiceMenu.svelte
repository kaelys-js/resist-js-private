<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ChoiceMenuPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ChoiceMenuProps = v.InferOutput<typeof ChoiceMenuPropsSchema>;
</script>

<script lang="ts">
  /**
   * ChoiceMenu — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ChoiceMenu />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ChoiceMenuProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ChoiceMenuProps = $derived.by(() => {
    const rawProps: ChoiceMenuProps = stripSvelteProps(allProps);
    const result = safeParse(ChoiceMenuPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ChoiceMenuProps;
  });
</script>

<div data-slot="choice-menu" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
