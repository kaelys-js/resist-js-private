<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SmoothCursorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SmoothCursorProps = v.InferOutput<typeof SmoothCursorPropsSchema>;
</script>

<script lang="ts">
  /**
   * SmoothCursor — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SmoothCursor />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SmoothCursorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SmoothCursorProps = $derived.by(() => {
    const rawProps: SmoothCursorProps = stripSvelteProps(allProps);
    const result = safeParse(SmoothCursorPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SmoothCursorProps;
  });
</script>

<div data-slot="smooth-cursor" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
