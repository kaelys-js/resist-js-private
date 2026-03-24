<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AboutDialogPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AboutDialogProps = v.InferOutput<typeof AboutDialogPropsSchema>;
</script>

<script lang="ts">
  /**
   * AboutDialog — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AboutDialog />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AboutDialogProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AboutDialogProps = $derived.by(() => {
    const rawProps: AboutDialogProps = stripSvelteProps(allProps);
    const result = safeParse(AboutDialogPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AboutDialogProps;
  });
</script>

<div data-slot="about-dialog" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
