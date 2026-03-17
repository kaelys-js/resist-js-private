<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SnowEffectPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SnowEffectProps = v.InferOutput<typeof SnowEffectPropsSchema>;
</script>

<script lang="ts">
  /**
   * SnowEffect — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SnowEffect />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SnowEffectProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SnowEffectProps = $derived.by(() => {
    const rawProps: SnowEffectProps = stripSvelteProps(allProps);
    const result = safeParse(SnowEffectPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SnowEffectProps;
  });
</script>

<div data-slot="snow-effect" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
