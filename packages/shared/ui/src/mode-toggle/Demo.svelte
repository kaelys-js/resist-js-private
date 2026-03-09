<script lang="ts">
import type { Str } from '@/schemas/common';
import ModeToggle from './ModeToggle.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';

let currentMode: Str = $state('system');
</script>

<div class="flex flex-col gap-6">
	<DemoSection
		title="Default"
		description="Color mode toggle with light, dark, and system options. Click the sun/moon icon to open the dropdown."
	>
		<div class="flex items-center gap-4">
			<ModeToggle
				mode={currentMode}
				setMode={(m: Str) => {
					currentMode = m;
				}}
				labels={{
					toggleTheme: 'Toggle theme',
					toggleMode: 'Toggle mode',
					light: 'Light',
					dark: 'Dark',
					system: 'System',
				}}
			/>
			<span class="text-sm text-muted-foreground">
				Current: <code class="rounded bg-muted px-1 py-0.5">{currentMode}</code>
			</span>
		</div>
	</DemoSection>
</div>
