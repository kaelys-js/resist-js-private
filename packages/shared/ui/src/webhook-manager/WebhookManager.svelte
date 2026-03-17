<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const WebhookManagerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type WebhookManagerProps = v.InferOutput<typeof WebhookManagerPropsSchema>;
</script>

<script lang="ts">
  /**
   * WebhookManager — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <WebhookManager />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = WebhookManagerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: WebhookManagerProps = $derived.by(() => {
    const rawProps: WebhookManagerProps = stripSvelteProps(allProps);
    const result = safeParse(WebhookManagerPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as WebhookManagerProps;
  });
</script>

<div data-slot="webhook-manager" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
