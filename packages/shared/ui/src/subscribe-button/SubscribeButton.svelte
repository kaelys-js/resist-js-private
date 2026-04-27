<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SubscribeButtonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SubscribeButton. */
  export type SubscribeButtonProps = v.InferOutput<typeof SubscribeButtonPropsSchema>;
</script>

<script lang="ts">
  /**
   * SubscribeButton — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SubscribeButton />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SubscribeButtonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SubscribeButtonProps = $derived.by(() => {
    const rawProps: SubscribeButtonProps = stripSvelteProps(allProps);
    const result = safeParse(SubscribeButtonPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SubscribeButtonProps;
  });
</script>

<div data-slot="subscribe-button" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
