<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema, NumSchema } from '@/schemas/common';

  /**
   * A help icon (`CircleHelp`) wrapped in a tooltip.
   *
   * Self-contained — includes its own `Tooltip.Provider`, so it works both
   * standalone and inside an existing Provider (bits-ui providers nest safely).
   */
  export const HelpTooltipPropsSchema = v.strictObject({
    /** The tooltip text displayed on hover. @values Click to edit, Required field, More information */
    text: StrSchema,
    /** Which side of the icon the tooltip appears on. @values top, bottom, left, right */
    side: v.optional(v.picklist(['top', 'bottom', 'left', 'right'])),
    /** Additional CSS classes for the icon element. */
    class: v.optional(StrSchema),
    /** Icon size in pixels. @values 14, 16, 20, 24 */
    size: v.optional(NumSchema),
  });
  export type HelpTooltipProps = v.InferOutput<typeof HelpTooltipPropsSchema>;
</script>

<script lang="ts">
  /**
   * Help icon with a tooltip that displays explanatory text on hover.
   *
   * Self-contained with its own Tooltip.Provider, so it works both standalone and nested.
   */
  import type { Str } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import CircleHelp from '@lucide/svelte/icons/circle-help';
  import * as Tooltip from '../tooltip/index.js';
  import { stripSvelteProps } from '../lens/lens-utils.js';

  const allProps: HelpTooltipProps = $props();
  const validated: HelpTooltipProps = $derived.by(() => {
    const rawProps: HelpTooltipProps = stripSvelteProps(allProps);
    const result = safeParse(HelpTooltipPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HelpTooltipProps;
  });
</script>

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger class="inline-flex cursor-help" aria-label={validated.text}>
      <CircleHelp
        class="text-muted-foreground {validated.class ?? ''}"
        size={validated.size ?? 16}
      />
    </Tooltip.Trigger>
    <Tooltip.Content side={validated.side ?? 'top'}>
      {validated.text}
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
