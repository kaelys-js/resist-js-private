<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StatusPagePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type StatusPageProps = v.InferOutput<typeof StatusPagePropsSchema>;
</script>

<script lang="ts">
  /**
   * StatusPage — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StatusPage />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StatusPageProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StatusPageProps = $derived.by(() => {
    const rawProps: StatusPageProps = stripSvelteProps(allProps);
    const result = safeParse(StatusPagePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StatusPageProps;
  });
</script>

<div data-slot="status-page" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
