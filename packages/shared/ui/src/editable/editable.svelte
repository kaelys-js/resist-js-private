<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const EditablePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type EditableProps = v.InferOutput<typeof EditablePropsSchema>;
</script>

<script lang="ts">
  /**
   * Editable — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Editable />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = EditableProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: EditableProps = $derived.by(() => {
    const rawProps: EditableProps = stripSvelteProps(allProps);
    const result = safeParse(EditablePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as EditableProps;
  });
</script>

<div data-slot="editable" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
