<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * MapView Svelte component — interactive map canvas with
   * pan / zoom and marker overlay support. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MapViewPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MapView. */
  export type MapViewProps = v.InferOutput<typeof MapViewPropsSchema>;
</script>

<script lang="ts">
  /**
   * MapView — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MapView />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MapViewProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MapViewProps = $derived.by(() => {
    const rawProps: MapViewProps = stripSvelteProps(allProps);
    const result = safeParse(MapViewPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MapViewProps;
  });
</script>

<div data-slot="map-view" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
