<script lang="ts">
import TestProviders from './TestProviders.svelte';
import NavUser from './NavUser.svelte';

const user = { name: 'Test User', avatar: '' };
</script>

<TestProviders>
	<NavUser {user} />
</TestProviders>
