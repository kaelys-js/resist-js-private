<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const WorldMapPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type WorldMapProps = v.InferOutput<typeof WorldMapPropsSchema>;
</script>

<script lang="ts">
  /**
   * WorldMap — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <WorldMap />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = WorldMapProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: WorldMapProps = $derived.by(() => {
    const rawProps: WorldMapProps = stripSvelteProps(allProps);
    const result = safeParse(WorldMapPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as WorldMapProps;
  });
</script>

<div data-slot="world-map" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
