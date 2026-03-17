<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CoolModePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type CoolModeProps = v.InferOutput<typeof CoolModePropsSchema>;
</script>

<script lang="ts">
  /**
   * CoolMode — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CoolMode />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CoolModeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CoolModeProps = $derived.by(() => {
    const rawProps: CoolModeProps = stripSvelteProps(allProps);
    const result = safeParse(CoolModePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CoolModeProps;
  });
</script>

<div data-slot="cool-mode" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
