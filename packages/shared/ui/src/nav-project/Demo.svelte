<script lang="ts">
import Sparkles from '@lucide/svelte/icons/sparkles';
import Trash2 from '@lucide/svelte/icons/trash-2';
import FolderOpen from '@lucide/svelte/icons/folder-open';
import NavProject from './NavProject.svelte';
import NavProjectSkeleton from './NavProjectSkeleton.svelte';
import * as Sidebar from '../sidebar/index.js';
import * as DropdownMenu from '../dropdown-menu/index.js';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection
		title="With Avatar"
		description="Project selector with avatar image, name, and subtitle. Includes dropdown menu items."
	>
		<div class="w-64 rounded-lg border bg-sidebar p-2">
			<Sidebar.Provider>
				<Sidebar.Root collapsible="none">
					<NavProject
						name="My RPG Project"
						subtitle="Last edited 2h ago"
						avatarSrc="https://github.com/shadcn.png"
						showIcon={true}
					>
						{#snippet menuItems()}
							<DropdownMenu.Item>
								<FolderOpen class="mr-2 size-4" />
								Open Project
							</DropdownMenu.Item>
							<DropdownMenu.Item>
								<Sparkles class="mr-2 size-4" />
								Upgrade Plan
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item variant="destructive">
								<Trash2 class="mr-2 size-4" />
								Delete Project
							</DropdownMenu.Item>
						{/snippet}
					</NavProject>
				</Sidebar.Root>
			</Sidebar.Provider>
		</div>
	</DemoSection>

	<DemoSection
		title="Monogram Fallback"
		description="No avatar image; the component renders initials as a monogram."
	>
		<div class="w-64 rounded-lg border bg-sidebar p-2">
			<Sidebar.Provider>
				<Sidebar.Root collapsible="none">
					<NavProject
						name="Dark Forest"
						subtitle="Personal project"
						avatarSrc=""
						showIcon={true}
					>
						{#snippet menuItems()}
							<DropdownMenu.Item>
								<FolderOpen class="mr-2 size-4" />
								Open
							</DropdownMenu.Item>
						{/snippet}
					</NavProject>
				</Sidebar.Root>
			</Sidebar.Provider>
		</div>
	</DemoSection>

	<DemoSection
		title="Loading Skeleton"
		description="Skeleton placeholder shown while project data is loading."
	>
		<div class="w-64 rounded-lg border bg-sidebar p-2">
			<Sidebar.Provider>
				<Sidebar.Root collapsible="none">
					<NavProjectSkeleton />
				</Sidebar.Root>
			</Sidebar.Provider>
		</div>
	</DemoSection>
</div>
