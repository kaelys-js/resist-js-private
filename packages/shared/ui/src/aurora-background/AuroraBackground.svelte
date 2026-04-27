<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AuroraBackgroundPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AuroraBackground. */
  export type AuroraBackgroundProps = v.InferOutput<typeof AuroraBackgroundPropsSchema>;
</script>

<script lang="ts">
  /**
   * AuroraBackground — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AuroraBackground />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AuroraBackgroundProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AuroraBackgroundProps = $derived.by(() => {
    const rawProps: AuroraBackgroundProps = stripSvelteProps(allProps);
    const result = safeParse(AuroraBackgroundPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AuroraBackgroundProps;
  });
</script>

<div data-slot="aurora-background" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
