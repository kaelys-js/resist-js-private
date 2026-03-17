<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const IconBrowserPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type IconBrowserProps = v.InferOutput<typeof IconBrowserPropsSchema>;
</script>

<script lang="ts">
  /**
   * IconBrowser — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <IconBrowser />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = IconBrowserProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: IconBrowserProps = $derived.by(() => {
    const rawProps: IconBrowserProps = stripSvelteProps(allProps);
    const result = safeParse(IconBrowserPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as IconBrowserProps;
  });
</script>

<div data-slot="icon-browser" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
