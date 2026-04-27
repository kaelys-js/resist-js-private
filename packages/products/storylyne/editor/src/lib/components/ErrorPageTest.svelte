<script lang="ts">
  /**
   * Test harness for ErrorPage that forwards `status`, `message`, and
   * `errorId` props through TestProviders so unit tests can drive every
   * error variant against a stable mount.
   *
   * @module
   */
  import type { Num, Str } from '@/schemas/common';
  import TestProviders from './TestProviders.svelte';
  import ErrorPage from './ErrorPage.svelte';

  let { status, message, errorId }: { status: Num; message: Str; errorId?: Str } = $props();
</script>

<TestProviders>
  <ErrorPage {status} {message} {errorId} />
</TestProviders>
