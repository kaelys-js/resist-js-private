/** Vite environment types for import.meta.env access. */
interface ImportMetaEnv {
  DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
