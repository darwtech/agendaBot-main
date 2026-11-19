/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DATA_SOURCE?: 'local' | 'api';
  readonly VITE_DEFAULT_TENANT?: string;
}
