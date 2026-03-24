<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SystemTrayPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SystemTrayProps = v.InferOutput<typeof SystemTrayPropsSchema>;
</script>

<script lang="ts">
  /**
   * SystemTray — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SystemTray />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SystemTrayProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SystemTrayProps = $derived.by(() => {
    const rawProps: SystemTrayProps = stripSvelteProps(allProps);
    const result = safeParse(SystemTrayPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SystemTrayProps;
  });
</script>

<div data-slot="system-tray" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
