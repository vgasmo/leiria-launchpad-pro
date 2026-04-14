import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

function versionJsonPlugin(): Plugin {
  return {
    name: 'version-json',
    closeBundle() {
      const version = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '.');
      const content = JSON.stringify({ version });
      // Write to dist (production) and public (source, so next dev/build starts fresh)
      fs.writeFileSync(path.resolve(__dirname, 'dist/version.json'), content);
      fs.writeFileSync(path.resolve(__dirname, 'public/version.json'), content);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Startup Leiria Portal',
        short_name: 'SL Portal',
        description: 'Startup mentorship and workspace management portal',
        theme_color: '#c82333',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '48x48',
            type: 'image/x-icon'
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // SPA fallback: serve index.html for navigation requests to unknown routes
        navigateFallback: '/index.html',
        // P0 SECURITY: Do NOT cache authenticated Supabase API requests
        // This prevents stale/leaked data between sessions
        navigateFallbackDenylist: [
          // Don't fallback for API/auth requests
          /^\/api\//,
          /\/rest\/v1\//,
          /\/auth\/v1\//,
          /\/storage\/v1\//,
          /\/functions\/v1\//,
          // Don't fallback for asset requests
          /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/,
          // Don't fallback for version check
          /version\.json/,
        ],
        // Increase the size limit to 3 MB to handle large bundles
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Skip waiting for faster updates - ensures new deploys are used immediately
        skipWaiting: true,
        clientsClaim: true,
        // CRITICAL: Remove old cached bundles after deploy to prevent stale JS errors
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Cache only static assets from CDNs, not Supabase API
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    }),
    versionJsonPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      // CRITICAL: Redirect all imports of generated client to production wrapper
      // This ensures detectSessionInUrl: true is used everywhere
      "@/integrations/supabase/client": path.resolve(__dirname, "./src/lib/supabaseClient.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
