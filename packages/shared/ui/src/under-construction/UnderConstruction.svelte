<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * UnderConstruction Svelte component — placeholder page for
   * features that are not yet implemented (icon + heading +
   * optional ETA). Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const UnderConstructionPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for UnderConstruction. */
  export type UnderConstructionProps = v.InferOutput<typeof UnderConstructionPropsSchema>;
</script>

<script lang="ts">
  /**
   * UnderConstruction — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <UnderConstruction />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = UnderConstructionProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: UnderConstructionProps = $derived.by(() => {
    const rawProps: UnderConstructionProps = stripSvelteProps(allProps);
    const result = safeParse(UnderConstructionPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as UnderConstructionProps;
  });
</script>

<div data-slot="under-construction" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
