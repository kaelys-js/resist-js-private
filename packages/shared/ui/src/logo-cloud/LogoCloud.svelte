<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LogoCloudPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for LogoCloud. */
  export type LogoCloudProps = v.InferOutput<typeof LogoCloudPropsSchema>;
</script>

<script lang="ts">
  /**
   * LogoCloud — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LogoCloud />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LogoCloudProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LogoCloudProps = $derived.by(() => {
    const rawProps: LogoCloudProps = stripSvelteProps(allProps);
    const result = safeParse(LogoCloudPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LogoCloudProps;
  });
</script>

<div data-slot="logo-cloud" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
