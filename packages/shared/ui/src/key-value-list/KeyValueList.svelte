<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * KeyValueList Svelte component — key-value property
   * display list. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const KeyValueListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for KeyValueList. */
  export type KeyValueListProps = v.InferOutput<typeof KeyValueListPropsSchema>;
</script>

<script lang="ts">
  /**
   * KeyValueList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <KeyValueList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = KeyValueListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: KeyValueListProps = $derived.by(() => {
    const rawProps: KeyValueListProps = stripSvelteProps(allProps);
    const result = safeParse(KeyValueListPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as KeyValueListProps;
  });
</script>

<div data-slot="key-value-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
