<script lang="ts">
import { Separator } from '$lib/components/ui/separator/index.js';
import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import ModeToggle from './ModeToggle.svelte';
import { localeStore, t } from '$lib/i18n.svelte';
</script>

<header
	class="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
>
	<div class="flex w-full items-center gap-1 px-4">
		<Sidebar.Trigger class="-ml-1" />
		<Separator orientation="vertical" class="mx-2 data-[orientation=vertical]:h-4" />
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item class="hidden md:block">
					<Breadcrumb.Link href="#">{t(localeStore.t.header.editor, 'Editor')}</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator class="hidden md:block" />
				<Breadcrumb.Item>
					<Breadcrumb.Page>{t(localeStore.t.header.scene, 'Scene')}</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
		<div class="ml-auto flex items-center gap-2">
			<ModeToggle />
		</div>
	</div>
</header>
