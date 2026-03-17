<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CalloutPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type CalloutProps = v.InferOutput<typeof CalloutPropsSchema>;
</script>

<script lang="ts">
  /**
   * Callout — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Callout />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CalloutProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CalloutProps = $derived.by(() => {
    const rawProps: CalloutProps = stripSvelteProps(allProps);
    const result = safeParse(CalloutPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CalloutProps;
  });
</script>

<div data-slot="callout" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
