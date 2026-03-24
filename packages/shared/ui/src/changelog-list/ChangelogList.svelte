<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ChangelogListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ChangelogListProps = v.InferOutput<typeof ChangelogListPropsSchema>;
</script>

<script lang="ts">
  /**
   * ChangelogList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ChangelogList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ChangelogListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ChangelogListProps = $derived.by(() => {
    const rawProps: ChangelogListProps = stripSvelteProps(allProps);
    const result = safeParse(ChangelogListPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ChangelogListProps;
  });
</script>

<div data-slot="changelog-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
