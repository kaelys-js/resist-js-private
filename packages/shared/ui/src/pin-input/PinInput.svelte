<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PinInputPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PinInputProps = v.InferOutput<typeof PinInputPropsSchema>;
</script>

<script lang="ts">
  /**
   * PinInput — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PinInput />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PinInputProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PinInputProps = $derived.by(() => {
    const rawProps: PinInputProps = stripSvelteProps(allProps);
    const result = safeParse(PinInputPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PinInputProps;
  });
</script>

<div data-slot="pin-input" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
