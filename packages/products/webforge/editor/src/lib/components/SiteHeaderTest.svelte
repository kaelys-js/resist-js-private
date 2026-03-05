<script lang="ts">
import TestProviders from './TestProviders.svelte';
import SiteHeader from './SiteHeader.svelte';

let { isError = false, activeSceneName = '' }: { isError?: boolean; activeSceneName?: string } =
	$props();

const user = {
	id: 'user-1',
	displayName: 'Test User',
	email: 'test@example.com',
	avatarUrl: '',
};
</script>

<TestProviders>
	<SiteHeader {isError} {user} {activeSceneName} />
</TestProviders>
