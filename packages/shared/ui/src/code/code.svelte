<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CodePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type CodeProps = v.InferOutput<typeof CodePropsSchema>;
</script>

<script lang="ts">
  /**
   * Code — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Code />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CodeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CodeProps = $derived.by(() => {
    const rawProps: CodeProps = stripSvelteProps(allProps);
    const result = safeParse(CodePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CodeProps;
  });
</script>

<div data-slot="code" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
