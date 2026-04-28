<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * InlineAlert Svelte component — inline contextual alert
   * message rendered within content flow. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const InlineAlertPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for InlineAlert. */
  export type InlineAlertProps = v.InferOutput<typeof InlineAlertPropsSchema>;
</script>

<script lang="ts">
  /**
   * InlineAlert — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <InlineAlert />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = InlineAlertProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: InlineAlertProps = $derived.by(() => {
    const rawProps: InlineAlertProps = stripSvelteProps(allProps);
    const result = safeParse(InlineAlertPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as InlineAlertProps;
  });
</script>

<div data-slot="inline-alert" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
