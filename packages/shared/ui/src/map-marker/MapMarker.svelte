<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MapMarkerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MapMarkerProps = v.InferOutput<typeof MapMarkerPropsSchema>;
</script>

<script lang="ts">
  /**
   * MapMarker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MapMarker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MapMarkerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MapMarkerProps = $derived.by(() => {
    const rawProps: MapMarkerProps = stripSvelteProps(allProps);
    const result = safeParse(MapMarkerPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MapMarkerProps;
  });
</script>

<div data-slot="map-marker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
