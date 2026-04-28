<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PushNotificationPreview Svelte component — preview card
   * mocking how a push notification renders on iOS/Android.
   * Placeholder shell awaiting full implementation; ships with
   * a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PushNotificationPreviewPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PushNotificationPreview. */
  export type PushNotificationPreviewProps = v.InferOutput<
    typeof PushNotificationPreviewPropsSchema
  >;
</script>

<script lang="ts">
  /**
   * PushNotificationPreview — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PushNotificationPreview />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PushNotificationPreviewProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PushNotificationPreviewProps = $derived.by(() => {
    const rawProps: PushNotificationPreviewProps = stripSvelteProps(allProps);
    const result = safeParse(PushNotificationPreviewPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PushNotificationPreviewProps;
  });
</script>

<div data-slot="push-notification-preview" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
