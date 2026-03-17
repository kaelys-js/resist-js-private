<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RecurringEventEditorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type RecurringEventEditorProps = v.InferOutput<typeof RecurringEventEditorPropsSchema>;
</script>

<script lang="ts">
  /**
   * RecurringEventEditor — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RecurringEventEditor />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RecurringEventEditorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RecurringEventEditorProps = $derived.by(() => {
    const rawProps: RecurringEventEditorProps = stripSvelteProps(allProps);
    const result = safeParse(RecurringEventEditorPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RecurringEventEditorProps;
  });
</script>

<div data-slot="recurring-event-editor" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
