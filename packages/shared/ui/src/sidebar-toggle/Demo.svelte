<script lang="ts">
import SidebarToggle from './SidebarToggle.svelte';
import * as Sidebar from '../sidebar/index.js';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection
		title="Default"
		description="Sidebar toggle button with tooltip showing label and keyboard shortcut. Requires sidebar context."
	>
		<Sidebar.Provider>
			<Sidebar.Root collapsible="none">
				<div class="flex items-center gap-2 p-4">
					<SidebarToggle label="Toggle Sidebar" shortcutLabel="⌘B" />
					<span class="text-sm text-muted-foreground">Click to toggle</span>
				</div>
			</Sidebar.Root>
		</Sidebar.Provider>
	</DemoSection>

	<DemoSection
		title="Custom Shortcut Label"
		description="Toggle with a different keyboard shortcut display string."
	>
		<Sidebar.Provider>
			<Sidebar.Root collapsible="none">
				<div class="flex items-center gap-2 p-4">
					<SidebarToggle label="Sidebar ein-/ausblenden" shortcutLabel="Ctrl+B" />
					<span class="text-sm text-muted-foreground">German locale example</span>
				</div>
			</Sidebar.Root>
		</Sidebar.Provider>
	</DemoSection>
</div>
