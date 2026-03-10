<script module lang="ts">
import * as v from 'valibot';
import type { Str } from '@/schemas/common';

/** Schema for localized labels in the ModeToggle UI. */
export const ModeToggleLabelsSchema = v.strictObject({
	/** Tooltip label. @values Toggle theme, Switch theme, Change mode */
	toggleTheme: v.string(),
	/** Accessible aria-label. @values Toggle mode, Switch color mode, Change appearance */
	toggleMode: v.string(),
	/** Light mode option label. @values Light, Light Mode, Day */
	light: v.string(),
	/** Dark mode option label. @values Dark, Dark Mode, Night */
	dark: v.string(),
	/** System mode option label. @values System, Auto, Follow System */
	system: v.string(),
});
/** Localized labels for the ModeToggle UI. */
export type ModeToggleLabels = v.InferOutput<typeof ModeToggleLabelsSchema>;

/** Schema for the ModeToggle component props. */
export const ModeTogglePropsSchema = v.strictObject({
	/** Current color mode. @values light, dark, system */
	mode: v.picklist(['light', 'dark', 'system']),
	/** Callback to change the color mode. */
	setMode: v.custom<(mode: Str) => void>((val: unknown): boolean => typeof val === 'function'),
	/** Localized labels for the toggle UI. */
	labels: ModeToggleLabelsSchema,
});
/** Props for the ModeToggle component. */
export type ModeToggleProps = v.InferOutput<typeof ModeTogglePropsSchema>;
</script>

<script lang="ts">
/**
 * Light/dark/system color mode toggle with animated sun/moon icon and dropdown menu.
 */
import Sun from '@lucide/svelte/icons/sun';
import Moon from '@lucide/svelte/icons/moon';
import Monitor from '@lucide/svelte/icons/monitor';
import Check from '@lucide/svelte/icons/check';
import { Button } from '../button/index.js';
import * as DropdownMenu from '../dropdown-menu/index.js';
import * as Tooltip from '../tooltip/index.js';

let { mode, setMode, labels }: ModeToggleProps = $props();
</script>

<Tooltip.Root delayDuration={700}>
	<DropdownMenu.Root>
		<Tooltip.Trigger>
			{#snippet child({ props: tooltipProps })}
				<DropdownMenu.Trigger>
					{#snippet child({ props: menuProps })}
						<Button
							variant="ghost"
							size="icon"
							class="relative"
							{...tooltipProps}
							{...menuProps}
							aria-label={labels.toggleMode}
						>
							<Sun
								aria-hidden="true"
								class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 !transition-all !duration-500 dark:scale-0 dark:-rotate-90"
							/>
							<Moon
								aria-hidden="true"
								class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 !transition-all !duration-500 dark:scale-100 dark:rotate-0"
							/>
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content side="bottom" sideOffset={4}>
			{labels.toggleTheme}
		</Tooltip.Content>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Item onclick={() => setMode('light')}>
				<Sun class="mr-2 size-4" />
				{labels.light}
				{#if mode === 'light'}
					<Check class="ml-auto size-4 text-muted-foreground" />
				{/if}
			</DropdownMenu.Item>
			<DropdownMenu.Item onclick={() => setMode('dark')}>
				<Moon class="mr-2 size-4" />
				{labels.dark}
				{#if mode === 'dark'}
					<Check class="ml-auto size-4 text-muted-foreground" />
				{/if}
			</DropdownMenu.Item>
			<DropdownMenu.Item onclick={() => setMode('system')}>
				<Monitor class="mr-2 size-4" />
				{labels.system}
				{#if mode === 'system'}
					<Check class="ml-auto size-4 text-muted-foreground" />
				{/if}
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</Tooltip.Root>
