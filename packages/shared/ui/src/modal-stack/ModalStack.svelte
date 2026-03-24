<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ModalStackPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ModalStackProps = v.InferOutput<typeof ModalStackPropsSchema>;
</script>

<script lang="ts">
  /**
   * ModalStack — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ModalStack />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ModalStackProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ModalStackProps = $derived.by(() => {
    const rawProps: ModalStackProps = stripSvelteProps(allProps);
    const result = safeParse(ModalStackPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ModalStackProps;
  });
</script>

<div data-slot="modal-stack" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
