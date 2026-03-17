<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NavbarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type NavbarProps = v.InferOutput<typeof NavbarPropsSchema>;
</script>

<script lang="ts">
  /**
   * Navbar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Navbar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NavbarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NavbarProps = $derived.by(() => {
    const rawProps: NavbarProps = stripSvelteProps(allProps);
    const result = safeParse(NavbarPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NavbarProps;
  });
</script>

<div data-slot="navbar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
