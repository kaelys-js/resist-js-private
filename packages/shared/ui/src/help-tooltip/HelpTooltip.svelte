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

const allProps = $props();
const rawProps: Record<Str, unknown> = stripSvelteProps(allProps);
const validated = safeParse(HelpTooltipPropsSchema, rawProps);
if (!validated.ok) throw validated.error;
const { text, side = 'top', class: className = '', size = 16 }: HelpTooltipProps = validated.data;
</script>

<Tooltip.Provider>
	<Tooltip.Root>
		<Tooltip.Trigger
			class="inline-flex cursor-help"
			aria-label={text}
		>
			<CircleHelp class="text-muted-foreground {className}" {size} />
		</Tooltip.Trigger>
		<Tooltip.Content {side}>
			{text}
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
