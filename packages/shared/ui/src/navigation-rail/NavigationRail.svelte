<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NavigationRailPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type NavigationRailProps = v.InferOutput<typeof NavigationRailPropsSchema>;
</script>

<script lang="ts">
  /**
   * NavigationRail — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <NavigationRail />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NavigationRailProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NavigationRailProps = $derived.by(() => {
    const rawProps: NavigationRailProps = stripSvelteProps(allProps);
    const result = safeParse(NavigationRailPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NavigationRailProps;
  });
</script>

<div data-slot="navigation-rail" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
