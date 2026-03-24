<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GeolocationPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type GeolocationProps = v.InferOutput<typeof GeolocationPropsSchema>;
</script>

<script lang="ts">
  /**
   * Geolocation — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Geolocation />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GeolocationProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GeolocationProps = $derived.by(() => {
    const rawProps: GeolocationProps = stripSvelteProps(allProps);
    const result = safeParse(GeolocationPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GeolocationProps;
  });
</script>

<div data-slot="geolocation" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
