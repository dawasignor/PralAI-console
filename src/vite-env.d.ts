/// <reference types="vite/client" />

// Only one env var so far: where execute_node lives.
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
