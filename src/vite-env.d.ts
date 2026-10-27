/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;

// Injected into the service worker bundle by scripts/pwa/serviceWorkerPlugin.ts
declare const __SW_CACHE_NAME__: string;
declare const __SW_PRECACHE__: readonly string[];
