<script lang="ts">
import TestProviders from './TestProviders.svelte';
import AppSidebar from './AppSidebar.svelte';

const user = {
	id: 'user-1',
	displayName: 'Test User',
	email: 'test@example.com',
	avatarUrl: '',
};
</script>

<TestProviders>
	<AppSidebar {user} />
</TestProviders>
