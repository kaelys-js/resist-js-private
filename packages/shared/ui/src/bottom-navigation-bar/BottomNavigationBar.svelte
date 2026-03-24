<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BottomNavigationBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BottomNavigationBarProps = v.InferOutput<typeof BottomNavigationBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * BottomNavigationBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BottomNavigationBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BottomNavigationBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BottomNavigationBarProps = $derived.by(() => {
    const rawProps: BottomNavigationBarProps = stripSvelteProps(allProps);
    const result = safeParse(BottomNavigationBarPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BottomNavigationBarProps;
  });
</script>

<div data-slot="bottom-navigation-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
