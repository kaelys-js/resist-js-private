/**
 * Ambient type declarations for SvelteKit route types.
 *
 * SvelteKit generates `$types.d.ts` modules per route directory via `svelte-kit sync`.
 * When running `tsgo` from the workspace root without the `.svelte-kit` generated
 * output, those imports are unresolved. This wildcard ambient declaration provides
 * the types so that `tsgo --noEmit` passes without requiring a full SvelteKit build.
 *
 * The wildcard pattern `*\/$types` matches any relative `./$types` import regardless
 * of the importing file's directory.
 *
 * @module
 */

declare module '*/$types' {
  import type { RequestEvent } from '@sveltejs/kit';

  /** SvelteKit server-side request handler. */
  export type RequestHandler = (event: RequestEvent) => Response | Promise<Response>;

  /** SvelteKit layout server load function. */
  export type LayoutServerLoad = (
    event: RequestEvent,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;

  /** SvelteKit page server load function. */
  export type PageServerLoad = (
    event: RequestEvent,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
}
