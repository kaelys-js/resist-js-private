<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DropdownPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Dropdown. */
  export type DropdownProps = v.InferOutput<typeof DropdownPropsSchema>;
</script>

<script lang="ts">
  /**
   * Dropdown — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Dropdown />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DropdownProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DropdownProps = $derived.by(() => {
    const rawProps: DropdownProps = stripSvelteProps(allProps);
    const result = safeParse(DropdownPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DropdownProps;
  });
</script>

<div data-slot="dropdown" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
