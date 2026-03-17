<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TypewriterEffectPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TypewriterEffectProps = v.InferOutput<typeof TypewriterEffectPropsSchema>;
</script>

<script lang="ts">
  /**
   * TypewriterEffect — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TypewriterEffect />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TypewriterEffectProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TypewriterEffectProps = $derived.by(() => {
    const rawProps: TypewriterEffectProps = stripSvelteProps(allProps);
    const result = safeParse(TypewriterEffectPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TypewriterEffectProps;
  });
</script>

<div data-slot="typewriter-effect" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
