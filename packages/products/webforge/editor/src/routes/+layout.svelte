<script lang="ts">
import '../app.css';
import AppSidebar from '$lib/components/AppSidebar.svelte';
import SiteHeader from '$lib/components/SiteHeader.svelte';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';

const { children } = $props();
</script>

<Sidebar.Provider
	style="--sidebar-width: calc(var(--spacing) * 72); --header-height: calc(var(--spacing) * 12);"
>
	<AppSidebar />
	<Sidebar.Inset>
		<SiteHeader />
		<div class="flex flex-1 flex-col">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
