<script lang="ts">
import TestProviders from './TestProviders.svelte';
import NavProject from './NavProject.svelte';

const project = { id: 'test-1', name: 'Test User', subtitle: '', ownerId: 'user-1' };
</script>

<TestProviders>
	<NavProject {project} />
</TestProviders>
