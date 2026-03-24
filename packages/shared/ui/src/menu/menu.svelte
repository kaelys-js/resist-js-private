<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MenuPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MenuProps = v.InferOutput<typeof MenuPropsSchema>;
</script>

<script lang="ts">
  /**
   * Menu — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Menu />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MenuProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MenuProps = $derived.by(() => {
    const rawProps: MenuProps = stripSvelteProps(allProps);
    const result = safeParse(MenuPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MenuProps;
  });
</script>

<div data-slot="menu" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
