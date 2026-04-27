<!--
  Client-side error beacon test.

  Triggers a client-side error that flows through the full reporting pipeline:
  1. `throw` → global error handler → `setupGlobalErrorHandling` captures it
  2. `onError` callback → `logErrorToConsole()` (console output)
  3. `onError` callback → `beaconError()` → `navigator.sendBeacon('/api/errors')`
  4. Server receives POST at `/api/errors` → validates → `log.error()` (Workers Logs)

  After triggering, check:
  - **Browser console** — colored error group with source map resolution
  - **Network tab** — POST to `/api/errors` with PII-stripped JSON payload
  - **Server logs** — `[client-beacon]` tagged log entry

  Guarded by `browser` so the throw only happens during client-side hydration,
  not during SSR.
-->
<script lang="ts">
  /**
   * Client-side error beacon test page — throws a deliberate domain
   * error during hydration so the global error handler exercises the
   * console logger and the `/api/errors` beacon round-trip.
   *
   * @module
   */

  import { browser } from '$app/environment';
  import { ERRORS, err } from '@/schemas/result/result';

  /**
   * Triggers a deliberate client error to exercise the full beacon pipeline.
   *
   * Uses a domain error (HTTP.SERVER_ERROR) so the beacon payload contains
   * a meaningful code rather than INTERNAL.UNEXPECTED. The error is thrown
   * (not returned) to simulate an uncaught exception flowing through
   * window.onerror → setupGlobalErrorHandling → onError → beaconError.
   */
  if (browser) {
    const result = err(
      ERRORS.HTTP.SERVER_ERROR,
      'Simulated beacon test — verifies full error reporting pipeline',
    );
    if (!result.ok) {
      throw result.error;
    }
  }
</script>

<p>Loading error beacon test...</p>
