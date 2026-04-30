/**
 * Vite build-time environment-variable type declarations for
 * the web-vitals package — augments `import.meta` with the
 * subset of fields we read at runtime.
 *
 * @module
 */

interface ImportMeta {
  readonly env: {
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly MODE: string;
    readonly SSR: boolean;
  };
}
