<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DropZonePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DropZone. */
  export type DropZoneProps = v.InferOutput<typeof DropZonePropsSchema>;
</script>

<script lang="ts">
  /**
   * DropZone — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DropZone />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DropZoneProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DropZoneProps = $derived.by(() => {
    const rawProps: DropZoneProps = stripSvelteProps(allProps);
    const result = safeParse(DropZonePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DropZoneProps;
  });
</script>

<div data-slot="drop-zone" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
