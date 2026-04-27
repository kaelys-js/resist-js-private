<script lang="ts">
  /**
   * Error page for the `(app)` route group — derives `status` and
   * `message` from `$app/state.page` and forwards them to the
   * shared `ErrorPage` component along with the SvelteKit-attached
   * `errorId`.
   *
   * @module
   */

  import { page } from '$app/state';
  import ErrorPage from '$lib/components/ErrorPage.svelte';
  import type { Num, Str } from '@/schemas/common';

  const status: Num = $derived(page.status);
  const message: Str = $derived(page.error?.message ?? '');
</script>

<ErrorPage {status} {message} errorId={page.error?.errorId} />
