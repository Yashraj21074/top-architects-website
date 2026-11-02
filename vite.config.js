import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Inject the day/night decision into <head> before first paint so there is never a flash of the wrong theme.
// Hours come from src/config/theme.json (the same file the runtime uses).
const themeCfg = JSON.parse(readFileSync(new URL('./src/config/theme.json', import.meta.url), 'utf8'));
const themeInline = () => ({
  name: 'inline-theme',
  transformIndexHtml: () => [{ tag: 'script', injectTo: 'head-prepend',
    children: `(function(){var h=new Date().getHours(),t=(h>=${themeCfg.dayStartHour}&&h<${themeCfg.nightStartHour})?'day':'night';document.documentElement.dataset.theme=t;})();` }],
});
export default defineConfig({ plugins: [react(), themeInline()], build: { chunkSizeWarningLimit: 800 } });
