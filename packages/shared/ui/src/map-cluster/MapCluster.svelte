<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * MapCluster Svelte component — clustered marker pins for
   * dense map points. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MapClusterPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MapCluster. */
  export type MapClusterProps = v.InferOutput<typeof MapClusterPropsSchema>;
</script>

<script lang="ts">
  /**
   * MapCluster — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MapCluster />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MapClusterProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MapClusterProps = $derived.by(() => {
    const rawProps: MapClusterProps = stripSvelteProps(allProps);
    const result = safeParse(MapClusterPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MapClusterProps;
  });
</script>

<div data-slot="map-cluster" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
