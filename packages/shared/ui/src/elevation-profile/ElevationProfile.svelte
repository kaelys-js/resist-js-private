<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ElevationProfilePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ElevationProfile. */
  export type ElevationProfileProps = v.InferOutput<typeof ElevationProfilePropsSchema>;
</script>

<script lang="ts">
  /**
   * ElevationProfile — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ElevationProfile />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ElevationProfileProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ElevationProfileProps = $derived.by(() => {
    const rawProps: ElevationProfileProps = stripSvelteProps(allProps);
    const result = safeParse(ElevationProfilePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ElevationProfileProps;
  });
</script>

<div data-slot="elevation-profile" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
