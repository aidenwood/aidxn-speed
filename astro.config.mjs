// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';

// The Netlify adapter's dev middleware blanks every React island in `astro dev`
// (SSR markup arrives intact over the wire, then hydration renders nothing), so
// it is only wired up for builds. `astro dev` renders API routes on demand
// regardless of adapter.
const isDev = process.argv.includes('dev');

// https://astro.build/config
export default defineConfig({
  site: 'https://speed.aidxn.com',
  // Pages prerender; only /api/analyze opts out via `export const prerender = false`.
  output: 'static',
  ...(isDev ? {} : { adapter: netlify() }),
  integrations: [
    react(),
    tailwind(),
  ],
});
