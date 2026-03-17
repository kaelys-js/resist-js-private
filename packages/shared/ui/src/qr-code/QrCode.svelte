<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const QrCodePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type QrCodeProps = v.InferOutput<typeof QrCodePropsSchema>;
</script>

<script lang="ts">
  /**
   * QrCode — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <QrCode />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = QrCodeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: QrCodeProps = $derived.by(() => {
    const rawProps: QrCodeProps = stripSvelteProps(allProps);
    const result = safeParse(QrCodePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as QrCodeProps;
  });
</script>

<div data-slot="qr-code" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
