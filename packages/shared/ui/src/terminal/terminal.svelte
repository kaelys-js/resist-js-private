<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TerminalPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TerminalProps = v.InferOutput<typeof TerminalPropsSchema>;
</script>

<script lang="ts">
  /**
   * Terminal — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Terminal />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TerminalProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TerminalProps = $derived.by(() => {
    const rawProps: TerminalProps = stripSvelteProps(allProps);
    const result = safeParse(TerminalPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TerminalProps;
  });
</script>

<div data-slot="terminal" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
