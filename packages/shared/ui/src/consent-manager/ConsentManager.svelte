<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ConsentManagerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ConsentManager. */
  export type ConsentManagerProps = v.InferOutput<typeof ConsentManagerPropsSchema>;
</script>

<script lang="ts">
  /**
   * ConsentManager — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ConsentManager />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ConsentManagerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ConsentManagerProps = $derived.by(() => {
    const rawProps: ConsentManagerProps = stripSvelteProps(allProps);
    const result = safeParse(ConsentManagerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ConsentManagerProps;
  });
</script>

<div data-slot="consent-manager" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
