<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CameraCapture — webcam photo-capture surface using
   * `getUserMedia`. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CameraCapturePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CameraCapture. */
  export type CameraCaptureProps = v.InferOutput<typeof CameraCapturePropsSchema>;
</script>

<script lang="ts">
  /**
   * CameraCapture — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CameraCapture />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CameraCaptureProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CameraCaptureProps = $derived.by(() => {
    const rawProps: CameraCaptureProps = stripSvelteProps(allProps);
    const result = safeParse(CameraCapturePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CameraCaptureProps;
  });
</script>

<div data-slot="camera-capture" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
