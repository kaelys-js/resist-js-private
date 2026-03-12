<script lang="ts">
  import { page } from '$app/state';
  import ErrorPage from '$lib/components/ErrorPage.svelte';
  import type { Num, Str } from '@/schemas/common';

  const status: Num = $derived(page.status);
  const message: Str = $derived(page.error?.message ?? '');
</script>

<ErrorPage {status} {message} errorId={page.error?.errorId} />
