<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SocialSharePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SocialShareProps = v.InferOutput<typeof SocialSharePropsSchema>;
</script>

<script lang="ts">
  /**
   * SocialShare — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SocialShare />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SocialShareProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SocialShareProps = $derived.by(() => {
    const rawProps: SocialShareProps = stripSvelteProps(allProps);
    const result = safeParse(SocialSharePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SocialShareProps;
  });
</script>

<div data-slot="social-share" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
