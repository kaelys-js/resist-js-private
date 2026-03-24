<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AgendaViewPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AgendaViewProps = v.InferOutput<typeof AgendaViewPropsSchema>;
</script>

<script lang="ts">
  /**
   * AgendaView — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AgendaView />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AgendaViewProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AgendaViewProps = $derived.by(() => {
    const rawProps: AgendaViewProps = stripSvelteProps(allProps);
    const result = safeParse(AgendaViewPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AgendaViewProps;
  });
</script>

<div data-slot="agenda-view" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
