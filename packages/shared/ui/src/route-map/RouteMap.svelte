<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RouteMapPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for RouteMap. */
  export type RouteMapProps = v.InferOutput<typeof RouteMapPropsSchema>;
</script>

<script lang="ts">
  /**
   * RouteMap — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RouteMap />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RouteMapProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RouteMapProps = $derived.by(() => {
    const rawProps: RouteMapProps = stripSvelteProps(allProps);
    const result = safeParse(RouteMapPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RouteMapProps;
  });
</script>

<div data-slot="route-map" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
