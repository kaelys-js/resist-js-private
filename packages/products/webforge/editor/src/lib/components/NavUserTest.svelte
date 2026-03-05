<script lang="ts">
import TestProviders from './TestProviders.svelte';
import NavUser from './NavUser.svelte';

const project = { id: 'test-1', name: 'Test User', subtitle: '', ownerId: 'user-1' };
</script>

<TestProviders>
	<NavUser {project} />
</TestProviders>
