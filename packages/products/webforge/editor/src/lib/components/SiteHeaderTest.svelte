<script lang="ts">
import TestProviders from './TestProviders.svelte';
import SiteHeader from './SiteHeader.svelte';

let { isError = false }: { isError?: boolean } = $props();
</script>

<TestProviders>
	<SiteHeader {isError} />
</TestProviders>
