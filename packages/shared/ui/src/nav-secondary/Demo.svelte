<script lang="ts">
import SettingsIcon from '@lucide/svelte/icons/settings';
import LifeBuoy from '@lucide/svelte/icons/life-buoy';
import Send from '@lucide/svelte/icons/send';
import BookOpen from '@lucide/svelte/icons/book-open';
import NavSecondary from './NavSecondary.svelte';
import * as Sidebar from '../sidebar/index.js';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection
		title="Default"
		description="Secondary navigation group with icon+label menu items rendered inside a sidebar."
	>
		<div class="w-64 rounded-lg border bg-sidebar p-2">
			<Sidebar.Provider>
				<Sidebar.Root collapsible="none">
					<Sidebar.Content>
						<NavSecondary
							items={[
								{ title: 'Settings', url: '/settings', icon: SettingsIcon },
								{ title: 'Support', url: '/support', icon: LifeBuoy },
								{ title: 'Feedback', url: '/feedback', icon: Send },
							]}
						/>
					</Sidebar.Content>
				</Sidebar.Root>
			</Sidebar.Provider>
		</div>
	</DemoSection>

	<DemoSection
		title="Single Item"
		description="Secondary nav with only one item."
	>
		<div class="w-64 rounded-lg border bg-sidebar p-2">
			<Sidebar.Provider>
				<Sidebar.Root collapsible="none">
					<Sidebar.Content>
						<NavSecondary
							items={[{ title: 'Documentation', url: '/docs', icon: BookOpen }]}
						/>
					</Sidebar.Content>
				</Sidebar.Root>
			</Sidebar.Provider>
		</div>
	</DemoSection>
</div>
