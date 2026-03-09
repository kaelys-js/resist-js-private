<script lang="ts">
import SettingsIcon from '@lucide/svelte/icons/settings';
import LifeBuoy from '@lucide/svelte/icons/life-buoy';
import Send from '@lucide/svelte/icons/send';
import AppSidebar from './AppSidebar.svelte';
import * as Sidebar from '../sidebar/index.js';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection
		title="Full AppSidebar"
		description="Complete sidebar with header, content, secondary nav, and footer. Wrapped in Sidebar.Provider."
	>
		<div class="h-[480px] overflow-hidden rounded-lg border">
			<Sidebar.Provider>
				<AppSidebar
					appName="WebForge"
					tagline="RPG Creation Suite"
					sidebarLabel="Main navigation"
					showIcon={true}
					showName={true}
					navItems={[
						{ title: 'Settings', url: '/settings', icon: SettingsIcon },
						{ title: 'Support', url: '/support', icon: LifeBuoy },
						{ title: 'Feedback', url: '/feedback', icon: Send },
					]}
				>
					{#snippet content()}
						<Sidebar.Group>
							<Sidebar.GroupLabel>Scenes</Sidebar.GroupLabel>
							<Sidebar.GroupContent>
								<Sidebar.Menu>
									<Sidebar.MenuItem>
										<Sidebar.MenuButton>Town Square</Sidebar.MenuButton>
									</Sidebar.MenuItem>
									<Sidebar.MenuItem>
										<Sidebar.MenuButton>Dark Forest</Sidebar.MenuButton>
									</Sidebar.MenuItem>
									<Sidebar.MenuItem>
										<Sidebar.MenuButton>Castle Entrance</Sidebar.MenuButton>
									</Sidebar.MenuItem>
								</Sidebar.Menu>
							</Sidebar.GroupContent>
						</Sidebar.Group>
					{/snippet}
					{#snippet footer()}
						<div class="p-2 text-xs text-muted-foreground">v1.0.0</div>
					{/snippet}
				</AppSidebar>
				<Sidebar.Inset>
					<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
						Main content area
					</div>
				</Sidebar.Inset>
			</Sidebar.Provider>
		</div>
	</DemoSection>

	<DemoSection
		title="Without Icon"
		description="Sidebar header showing only the app name, no logo icon."
	>
		<div class="h-[240px] overflow-hidden rounded-lg border">
			<Sidebar.Provider>
				<AppSidebar
					appName="WebForge"
					tagline="Editor"
					sidebarLabel="Navigation"
					showIcon={false}
					showName={true}
					navItems={[{ title: 'Settings', url: '/settings', icon: SettingsIcon }]}
				>
					{#snippet content()}
						<div></div>
					{/snippet}
					{#snippet footer()}
						<div></div>
					{/snippet}
				</AppSidebar>
				<Sidebar.Inset>
					<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
						Content
					</div>
				</Sidebar.Inset>
			</Sidebar.Provider>
		</div>
	</DemoSection>
</div>
