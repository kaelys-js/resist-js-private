<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TitleBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TitleBarProps = v.InferOutput<typeof TitleBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * TitleBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TitleBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TitleBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TitleBarProps = $derived.by(() => {
    const rawProps: TitleBarProps = stripSvelteProps(allProps);
    const result = safeParse(TitleBarPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TitleBarProps;
  });
</script>

<div data-slot="title-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
