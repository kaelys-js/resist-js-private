<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FooterNavigationPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FooterNavigation. */
  export type FooterNavigationProps = v.InferOutput<typeof FooterNavigationPropsSchema>;
</script>

<script lang="ts">
  /**
   * FooterNavigation — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FooterNavigation />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FooterNavigationProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FooterNavigationProps = $derived.by(() => {
    const rawProps: FooterNavigationProps = stripSvelteProps(allProps);
    const result = safeParse(FooterNavigationPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FooterNavigationProps;
  });
</script>

<div data-slot="footer-navigation" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
