<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const IconButtonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type IconButtonProps = v.InferOutput<typeof IconButtonPropsSchema>;
</script>

<script lang="ts">
  /**
   * IconButton — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <IconButton />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = IconButtonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: IconButtonProps = $derived.by(() => {
    const rawProps: IconButtonProps = stripSvelteProps(allProps);
    const result = safeParse(IconButtonPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as IconButtonProps;
  });
</script>

<div data-slot="icon-button" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
