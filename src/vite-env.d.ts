/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Required environment variables
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly ADMIN_EMAIL: string;
  
  // Optional environment variables
  readonly RESEND_API_KEY?: string;
  readonly NOTIFICATION_EMAIL?: string;
  readonly SITE_NAME?: string;
  readonly SITE?: string;
  readonly RATE_LIMIT_WINDOW_MS?: string;
  readonly RATE_LIMIT_MAX_REQUESTS?: string;
  
  // Add index signature to allow any string key
  [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
