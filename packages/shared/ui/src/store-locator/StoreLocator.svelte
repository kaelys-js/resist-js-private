<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StoreLocatorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type StoreLocatorProps = v.InferOutput<typeof StoreLocatorPropsSchema>;
</script>

<script lang="ts">
  /**
   * StoreLocator — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StoreLocator />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StoreLocatorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StoreLocatorProps = $derived.by(() => {
    const rawProps: StoreLocatorProps = stripSvelteProps(allProps);
    const result = safeParse(StoreLocatorPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StoreLocatorProps;
  });
</script>

<div data-slot="store-locator" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
