interface ImportMetaEnv {
  readonly VITE_TAURI_DEV_HOST?: string;
  // ... add more env variables if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
