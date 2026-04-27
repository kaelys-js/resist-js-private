<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const InAppMessagePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for InAppMessage. */
  export type InAppMessageProps = v.InferOutput<typeof InAppMessagePropsSchema>;
</script>

<script lang="ts">
  /**
   * InAppMessage — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <InAppMessage />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = InAppMessageProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: InAppMessageProps = $derived.by(() => {
    const rawProps: InAppMessageProps = stripSvelteProps(allProps);
    const result = safeParse(InAppMessagePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as InAppMessageProps;
  });
</script>

<div data-slot="in-app-message" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
