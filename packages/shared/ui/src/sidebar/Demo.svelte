<script lang="ts">
import Home from '@lucide/svelte/icons/home';
import Inbox from '@lucide/svelte/icons/inbox';
import Calendar from '@lucide/svelte/icons/calendar';
import * as Sidebar from './index.js';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection
		title="Basic Structure"
		description="Minimal sidebar with Provider, Root, Header, Content, and Footer."
	>
		<div class="h-[400px] overflow-hidden rounded-lg border">
			<Sidebar.Provider>
				<Sidebar.Root>
					<Sidebar.Header>
						<div class="px-2 py-1 text-sm font-semibold">My App</div>
					</Sidebar.Header>
					<Sidebar.Content>
						<Sidebar.Group>
							<Sidebar.GroupLabel>Navigation</Sidebar.GroupLabel>
							<Sidebar.GroupContent>
								<Sidebar.Menu>
									<Sidebar.MenuItem>
										<Sidebar.MenuButton>
											<Home class="size-4" />
											<span>Home</span>
										</Sidebar.MenuButton>
									</Sidebar.MenuItem>
									<Sidebar.MenuItem>
										<Sidebar.MenuButton>
											<Inbox class="size-4" />
											<span>Inbox</span>
										</Sidebar.MenuButton>
									</Sidebar.MenuItem>
									<Sidebar.MenuItem>
										<Sidebar.MenuButton>
											<Calendar class="size-4" />
											<span>Calendar</span>
										</Sidebar.MenuButton>
									</Sidebar.MenuItem>
								</Sidebar.Menu>
							</Sidebar.GroupContent>
						</Sidebar.Group>
					</Sidebar.Content>
					<Sidebar.Footer>
						<div class="px-2 py-1 text-xs text-muted-foreground">Footer area</div>
					</Sidebar.Footer>
				</Sidebar.Root>
				<Sidebar.Inset>
					<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
						Inset content area
					</div>
				</Sidebar.Inset>
			</Sidebar.Provider>
		</div>
	</DemoSection>

	<DemoSection
		title="Inset Variant"
		description="Sidebar with variant='inset' for a recessed content area appearance."
	>
		<div class="h-[360px] overflow-hidden rounded-lg border">
			<Sidebar.Provider>
				<Sidebar.Root variant="inset" collapsible="icon">
					<Sidebar.Header>
						<Sidebar.Menu>
							<Sidebar.MenuItem>
								<Sidebar.MenuButton size="lg">
									<div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
										W
									</div>
									<div class="grid flex-1 text-left leading-tight">
										<span class="truncate text-sm font-semibold">Workspace</span>
										<span class="truncate text-xs text-muted-foreground">Pro Plan</span>
									</div>
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						</Sidebar.Menu>
					</Sidebar.Header>
					<Sidebar.Content>
						<Sidebar.Group>
							<Sidebar.GroupContent>
								<Sidebar.Menu>
									<Sidebar.MenuItem>
										<Sidebar.MenuButton isActive={true}>
											<Home class="size-4" />
											<span>Dashboard</span>
										</Sidebar.MenuButton>
									</Sidebar.MenuItem>
									<Sidebar.MenuItem>
										<Sidebar.MenuButton>
											<Inbox class="size-4" />
											<span>Messages</span>
										</Sidebar.MenuButton>
									</Sidebar.MenuItem>
								</Sidebar.Menu>
							</Sidebar.GroupContent>
						</Sidebar.Group>
					</Sidebar.Content>
					<Sidebar.Footer>
						<div class="px-2 py-1 text-xs text-muted-foreground">v2.0</div>
					</Sidebar.Footer>
				</Sidebar.Root>
				<Sidebar.Inset>
					<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
						Main content
					</div>
				</Sidebar.Inset>
			</Sidebar.Provider>
		</div>
	</DemoSection>

	<DemoSection
		title="Menu Skeleton"
		description="Loading skeleton placeholder for menu items."
	>
		<div class="w-64 rounded-lg border bg-sidebar p-2">
			<Sidebar.Provider>
				<Sidebar.Root collapsible="none">
					<Sidebar.Content>
						<Sidebar.MenuSkeleton />
						<Sidebar.MenuSkeleton />
						<Sidebar.MenuSkeleton />
					</Sidebar.Content>
				</Sidebar.Root>
			</Sidebar.Provider>
		</div>
	</DemoSection>
</div>
