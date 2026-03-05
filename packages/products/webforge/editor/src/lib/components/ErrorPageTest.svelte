<script lang="ts">
import type { Num, Str } from '@/schemas/common';
import TestProviders from './TestProviders.svelte';
import ErrorPage from './ErrorPage.svelte';

let { status, message, errorId }: { status: Num; message: Str; errorId?: Str } = $props();
</script>

<TestProviders>
	<ErrorPage {status} {message} {errorId} />
</TestProviders>
