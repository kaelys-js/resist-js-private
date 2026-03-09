<script lang="ts">
import type { Num, Str } from '@/schemas/common';
import CircleHelp from '@lucide/svelte/icons/circle-help';
import * as Tooltip from '../tooltip/index.js';

/**
 * A help icon (`CircleHelp`) wrapped in a tooltip.
 *
 * Self-contained — includes its own `Tooltip.Provider`, so it works both
 * standalone and inside an existing Provider (bits-ui providers nest safely).
 */
type HelpTooltipProps = {
	/** The tooltip text displayed on hover. */
	text: Str;
	/** Which side of the icon the tooltip appears on. */
	side?: 'top' | 'bottom' | 'left' | 'right';
	/** Additional CSS classes for the icon element. */
	class?: Str;
	/** Icon size in pixels. */
	size?: Num;
};

const { text, side = 'top', class: className = '', size = 16 }: HelpTooltipProps = $props();
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
