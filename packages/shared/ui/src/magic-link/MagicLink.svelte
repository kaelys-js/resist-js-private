<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MagicLinkPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MagicLinkProps = v.InferOutput<typeof MagicLinkPropsSchema>;
</script>

<script lang="ts">
  /**
   * MagicLink — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MagicLink />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MagicLinkProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MagicLinkProps = $derived.by(() => {
    const rawProps: MagicLinkProps = stripSvelteProps(allProps);
    const result = safeParse(MagicLinkPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MagicLinkProps;
  });
</script>

<div data-slot="magic-link" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
