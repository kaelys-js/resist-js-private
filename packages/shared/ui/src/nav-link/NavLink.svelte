<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * NavLink Svelte component — navigation link with active
   * state styling. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NavLinkPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for NavLink. */
  export type NavLinkProps = v.InferOutput<typeof NavLinkPropsSchema>;
</script>

<script lang="ts">
  /**
   * NavLink — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <NavLink />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NavLinkProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NavLinkProps = $derived.by(() => {
    const rawProps: NavLinkProps = stripSvelteProps(allProps);
    const result = safeParse(NavLinkPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NavLinkProps;
  });
</script>

<div data-slot="nav-link" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
