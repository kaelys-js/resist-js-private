<script lang="ts">
import Sun from '@lucide/svelte/icons/sun';
import Moon from '@lucide/svelte/icons/moon';
import Monitor from '@lucide/svelte/icons/monitor';
import Check from '@lucide/svelte/icons/check';
import { Button } from '../button/index.js';
import * as DropdownMenu from '../dropdown-menu/index.js';
import * as Tooltip from '../tooltip/index.js';
import type { Str } from '@/schemas/common';

/**
 * Props for the shared ModeToggle component.
 *
 * Each product editor provides its own mode state, setter, and locale labels.
 */
type ModeToggleProps = {
	/** Current color mode. */
	mode: Str;
	/** Callback to change the color mode. */
	setMode: (mode: Str) => void;
	/** Localized labels for the toggle UI. */
	labels: {
		/** Tooltip label (e.g. "Toggle theme"). */
		toggleTheme: Str;
		/** Accessible aria-label (e.g. "Toggle mode"). */
		toggleMode: Str;
		/** Light mode option label. */
		light: Str;
		/** Dark mode option label. */
		dark: Str;
		/** System mode option label. */
		system: Str;
	};
};

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
