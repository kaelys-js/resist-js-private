/**
 * Vite environment-type declarations for the beacon package
 * — augments `import.meta.env` so reporter code can read
 * Vite's `DEV` flag without `any` casts.
 *
 * @module
 */

interface ImportMetaEnv {
  DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
