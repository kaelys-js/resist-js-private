<script lang="ts">
import TestProviders from './TestProviders.svelte';
import ErrorPage from './ErrorPage.svelte';

let { status, message, errorId }: { status: number; message: string; errorId?: string } = $props();
</script>

<TestProviders>
	<ErrorPage {status} {message} {errorId} />
</TestProviders>
