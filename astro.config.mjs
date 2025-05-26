import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  server: {
    port: 3000,
    host: true,
  },
  site: process.env.SITE || 'https://example.com',
  integrations: [
    // ... existing code ...
  ],
  vite: {
    define: {
      'import.meta.vitest': 'undefined',
    },
    ssr: {
      noExternal: ['@supabase/supabase-js'],
    },
    // Load environment variables from .env file
    envPrefix: ['VITE_', 'PUBLIC_'],
  },
});
