<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ZStackPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ZStackProps = v.InferOutput<typeof ZStackPropsSchema>;
</script>

<script lang="ts">
  /**
   * ZStack — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ZStack />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ZStackProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ZStackProps = $derived.by(() => {
    const rawProps: ZStackProps = stripSvelteProps(allProps);
    const result = safeParse(ZStackPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ZStackProps;
  });
</script>

<div data-slot="z-stack" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
