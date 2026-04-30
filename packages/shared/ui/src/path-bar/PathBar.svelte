<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PathBar Svelte component — file-system style path
   * breadcrumb bar. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PathBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PathBar. */
  export type PathBarProps = v.InferOutput<typeof PathBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * PathBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PathBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PathBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PathBarProps = $derived.by(() => {
    const rawProps: PathBarProps = stripSvelteProps(allProps);
    const result = safeParse(PathBarPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PathBarProps;
  });
</script>

<div data-slot="path-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
