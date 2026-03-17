<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const HolyGrailLayoutPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type HolyGrailLayoutProps = v.InferOutput<typeof HolyGrailLayoutPropsSchema>;
</script>

<script lang="ts">
  /**
   * HolyGrailLayout — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <HolyGrailLayout />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = HolyGrailLayoutProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: HolyGrailLayoutProps = $derived.by(() => {
    const rawProps: HolyGrailLayoutProps = stripSvelteProps(allProps);
    const result = safeParse(HolyGrailLayoutPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HolyGrailLayoutProps;
  });
</script>

<div data-slot="holy-grail-layout" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
