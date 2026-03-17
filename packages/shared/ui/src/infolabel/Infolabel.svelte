<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const InfolabelPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type InfolabelProps = v.InferOutput<typeof InfolabelPropsSchema>;
</script>

<script lang="ts">
  /**
   * Infolabel — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Infolabel />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = InfolabelProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: InfolabelProps = $derived.by(() => {
    const rawProps: InfolabelProps = stripSvelteProps(allProps);
    const result = safeParse(InfolabelPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as InfolabelProps;
  });
</script>

<div data-slot="infolabel" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
