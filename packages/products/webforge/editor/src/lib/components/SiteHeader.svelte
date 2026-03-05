<script lang="ts">
import { Separator } from '$lib/components/ui/separator/index.js';
import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import * as Tooltip from '$lib/components/ui/tooltip/index.js';
import ModeToggle from './ModeToggle.svelte';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';

let { isError = false }: { isError?: boolean } = $props();

const store = useEditorStore();

const breadcrumbLeaf: string = $derived(
	isError ? t(localeStore.t.header.error, 'Error') : t(localeStore.t.header.scene, 'Scene'),
);

const toggleSidebarLabel: string = $derived(
	t(localeStore.t.header.toggleSidebar, 'Toggle Sidebar'),
);
</script>

<header
	class="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height,color,background-color,border-color] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
>
	<div class="flex w-full items-center gap-1 px-4">
		{#if store.features.sidebarToggle}
			<Tooltip.Root delayDuration={700}>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<Sidebar.Trigger class="-ml-1" {...props} />
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content side="right" sideOffset={4}>
					{toggleSidebarLabel}
				</Tooltip.Content>
			</Tooltip.Root>
			<Separator orientation="vertical" role="separator" class="mx-2 data-[orientation=vertical]:h-4" />
		{/if}
		{#if store.features.breadcrumb}
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item class="hidden md:block">
					<Breadcrumb.Link href="/">{t(localeStore.t.header.home, 'Home')}</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator class="hidden md:block" />
				<Breadcrumb.Item>
					<Breadcrumb.Page>{breadcrumbLeaf}</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
		{/if}
		<div class="ml-auto flex items-center gap-2">
			{#if store.features.modeToggle}
				<ModeToggle />
			{/if}
		</div>
	</div>
</header>
