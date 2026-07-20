import { defineConfig } from 'vite'
// base './' => wzgledne sciezki assetow. Dziala na GitHub Pages (podkatalog /dziki-zachod/),
// pod wlasna domena i lokalnie (pnpm dev / preview).
export default defineConfig({ base: './' })
