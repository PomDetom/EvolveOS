import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  server: { port: 5173, strictPort: true },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
});
