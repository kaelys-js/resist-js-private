<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * EquipmentSlot Svelte component — RPG-style inventory
   * equipment slot for placing weapons / armor / consumables.
   * Placeholder shell awaiting full implementation; ships with a
   * class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const EquipmentSlotPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for EquipmentSlot. */
  export type EquipmentSlotProps = v.InferOutput<typeof EquipmentSlotPropsSchema>;
</script>

<script lang="ts">
  /**
   * EquipmentSlot — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <EquipmentSlot />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = EquipmentSlotProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: EquipmentSlotProps = $derived.by(() => {
    const rawProps: EquipmentSlotProps = stripSvelteProps(allProps);
    const result = safeParse(EquipmentSlotPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as EquipmentSlotProps;
  });
</script>

<div data-slot="equipment-slot" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
