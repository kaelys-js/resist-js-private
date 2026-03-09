<script lang="ts">
import SiteHeader from './SiteHeader.svelte';
import * as Sidebar from '../sidebar/index.js';
import * as Breadcrumb from '../breadcrumb/index.js';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection
		title="Full Header"
		description="Site header with sidebar toggle, breadcrumbs, and action area. Wrapped in sidebar context."
	>
		<div class="overflow-hidden rounded-lg border" style="--header-height: 3rem;">
			<Sidebar.Provider>
				<Sidebar.Root collapsible="none">
					<SiteHeader
						showSidebarToggle={true}
						sidebarToggleLabel="Toggle Sidebar"
						sidebarToggleShortcut="⌘B"
						showBreadcrumb={true}
					>
						{#snippet breadcrumbs()}
							<Breadcrumb.Item>
								<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
							</Breadcrumb.Item>
							<Breadcrumb.Separator />
							<Breadcrumb.Item>
								<Breadcrumb.Link href="/scenes">Scenes</Breadcrumb.Link>
							</Breadcrumb.Item>
							<Breadcrumb.Separator />
							<Breadcrumb.Item>
								<Breadcrumb.Page>Town Square</Breadcrumb.Page>
							</Breadcrumb.Item>
						{/snippet}
						{#snippet actions()}
							<button
								class="inline-flex h-8 items-center rounded-md border px-3 text-xs"
							>
								Action
							</button>
						{/snippet}
					</SiteHeader>
				</Sidebar.Root>
			</Sidebar.Provider>
		</div>
	</DemoSection>

	<DemoSection
		title="No Sidebar Toggle"
		description="Header without the sidebar toggle, showing only breadcrumbs and actions."
	>
		<div class="overflow-hidden rounded-lg border" style="--header-height: 3rem;">
			<Sidebar.Provider>
				<Sidebar.Root collapsible="none">
					<SiteHeader
						showSidebarToggle={false}
						sidebarToggleLabel=""
						sidebarToggleShortcut=""
						showBreadcrumb={true}
					>
						{#snippet breadcrumbs()}
							<Breadcrumb.Item>
								<Breadcrumb.Page>Dashboard</Breadcrumb.Page>
							</Breadcrumb.Item>
						{/snippet}
						{#snippet actions()}
							<span class="text-xs text-muted-foreground">Welcome back</span>
						{/snippet}
					</SiteHeader>
				</Sidebar.Root>
			</Sidebar.Provider>
		</div>
	</DemoSection>

	<DemoSection
		title="No Breadcrumb"
		description="Header with sidebar toggle but no breadcrumb navigation."
	>
		<div class="overflow-hidden rounded-lg border" style="--header-height: 3rem;">
			<Sidebar.Provider>
				<Sidebar.Root collapsible="none">
					<SiteHeader
						showSidebarToggle={true}
						sidebarToggleLabel="Toggle Sidebar"
						sidebarToggleShortcut="⌘B"
						showBreadcrumb={false}
					>
						{#snippet breadcrumbs()}
							<!-- empty -->
						{/snippet}
						{#snippet actions()}
							<span class="text-xs text-muted-foreground">Actions only</span>
						{/snippet}
					</SiteHeader>
				</Sidebar.Root>
			</Sidebar.Provider>
		</div>
	</DemoSection>
</div>
