<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BodyMapPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BodyMapProps = v.InferOutput<typeof BodyMapPropsSchema>;
</script>

<script lang="ts">
  /**
   * BodyMap — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BodyMap />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BodyMapProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BodyMapProps = $derived.by(() => {
    const rawProps: BodyMapProps = stripSvelteProps(allProps);
    const result = safeParse(BodyMapPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BodyMapProps;
  });
</script>

<div data-slot="body-map" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
