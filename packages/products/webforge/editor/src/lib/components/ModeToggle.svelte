<script lang="ts">
import Sun from '@lucide/svelte/icons/sun';
import Moon from '@lucide/svelte/icons/moon';
import Monitor from '@lucide/svelte/icons/monitor';
import Check from '@lucide/svelte/icons/check';
import { Button } from '$lib/components/ui/button/index.js';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import * as Tooltip from '$lib/components/ui/tooltip/index.js';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';

const store = useEditorStore();

const toggleThemeLabel: string = $derived(t(localeStore.t.settings.toggleTheme, 'Toggle theme'));
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
							aria-label={t(localeStore.t.common.toggleMode, 'Toggle mode')}
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
			{toggleThemeLabel}
		</Tooltip.Content>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Item onclick={() => store.setMode('light')}>
				<Sun class="mr-2 size-4" />
				{t(localeStore.t.settings.light, 'Light')}
				{#if store.app.mode === 'light'}
					<Check class="ml-auto size-4 text-muted-foreground" />
				{/if}
			</DropdownMenu.Item>
			<DropdownMenu.Item onclick={() => store.setMode('dark')}>
				<Moon class="mr-2 size-4" />
				{t(localeStore.t.settings.dark, 'Dark')}
				{#if store.app.mode === 'dark'}
					<Check class="ml-auto size-4 text-muted-foreground" />
				{/if}
			</DropdownMenu.Item>
			<DropdownMenu.Item onclick={() => store.setMode('system')}>
				<Monitor class="mr-2 size-4" />
				{t(localeStore.t.settings.system, 'System')}
				{#if store.app.mode === 'system'}
					<Check class="ml-auto size-4 text-muted-foreground" />
				{/if}
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</Tooltip.Root>
