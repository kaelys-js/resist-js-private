<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AppBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AppBarProps = v.InferOutput<typeof AppBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * AppBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AppBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AppBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AppBarProps = $derived.by(() => {
    const rawProps: AppBarProps = stripSvelteProps(allProps);
    const result = safeParse(AppBarPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AppBarProps;
  });
</script>

<div data-slot="app-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
