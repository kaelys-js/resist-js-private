/** Vite build-time environment variables (subset used by web-vitals). */
interface ImportMeta {
  readonly env: {
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly MODE: string;
    readonly SSR: boolean;
  };
}
