<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PortalPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PortalProps = v.InferOutput<typeof PortalPropsSchema>;
</script>

<script lang="ts">
  /**
   * Portal — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Portal />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PortalProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PortalProps = $derived.by(() => {
    const rawProps: PortalProps = stripSvelteProps(allProps);
    const result = safeParse(PortalPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PortalProps;
  });
</script>

<div data-slot="portal" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
