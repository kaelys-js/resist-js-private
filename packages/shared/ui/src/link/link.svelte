<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LinkPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type LinkProps = v.InferOutput<typeof LinkPropsSchema>;
</script>

<script lang="ts">
  /**
   * Link — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Link />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LinkProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LinkProps = $derived.by(() => {
    const rawProps: LinkProps = stripSvelteProps(allProps);
    const result = safeParse(LinkPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LinkProps;
  });
</script>

<div data-slot="link" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
