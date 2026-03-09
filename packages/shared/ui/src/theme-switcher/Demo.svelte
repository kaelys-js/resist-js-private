<script lang="ts">
import type { Str } from '@/schemas/common';
import ThemeSwitcher from './ThemeSwitcher.svelte';
import * as DropdownMenu from '../dropdown-menu/index.js';
import DemoSection from '../demo-section/DemoSection.svelte';

let currentTheme: Str = $state('');
</script>

<div class="flex flex-col gap-6">
	<DemoSection
		title="Inside Dropdown Menu"
		description="Theme switcher rendered as a sub-menu inside a dropdown. Includes color preview dots and search."
	>
		<div class="flex justify-center">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<button
						class="inline-flex h-9 items-center rounded-md border px-4 text-sm hover:bg-accent"
					>
						Appearance
					</button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start">
					<ThemeSwitcher
						theme={currentTheme}
						setTheme={(id: Str) => {
							currentTheme = id;
						}}
						themes={[
							{
								id: '',
								label: 'Default',
								dots: ['#6366f1', '#8b5cf6', '#1e1b4b', '#4338ca'],
							},
							{
								id: 'emerald',
								label: 'Emerald',
								dots: ['#10b981', '#34d399', '#064e3b', '#059669'],
							},
							{
								id: 'rose',
								label: 'Rose',
								dots: ['#f43f5e', '#fb7185', '#4c0519', '#e11d48'],
							},
							{
								id: 'amber',
								label: 'Amber',
								dots: ['#f59e0b', '#fbbf24', '#451a03', '#d97706'],
							},
							{
								id: 'ocean',
								label: 'Ocean',
								dots: ['#0ea5e9', '#38bdf8', '#0c1e30', '#0284c7'],
							},
						]}
						labels={{
							theme: 'Theme',
							searchThemes: 'Search themes...',
							clearSearch: 'Clear search',
							noThemesFound: 'No themes found',
							noResultsHint: 'Try a different search term',
						}}
					/>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
		<p class="mt-3 text-center text-xs text-muted-foreground">
			Current theme: <code class="rounded bg-muted px-1 py-0.5"
				>{currentTheme || 'default'}</code
			>
		</p>
	</DemoSection>
</div>
