import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import type {Plugin} from 'vite';
import {
  GOOGLE_SITE_VERIFICATION,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from './config/site';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Fills the __TOKENS__ in index.html (title, description, canonical URL…) from config/site.ts. */
function siteMetaPlugin(): Plugin {
  const tokens: Record<string, string> = {
    __SITE_URL__: escapeHtml(SITE_URL),
    __SITE_NAME__: escapeHtml(SITE_NAME),
    __SITE_TITLE__: escapeHtml(SITE_TITLE),
    __SITE_DESCRIPTION__: escapeHtml(SITE_DESCRIPTION),
    __GOOGLE_SITE_VERIFICATION_TAG__: GOOGLE_SITE_VERIFICATION
      ? `<meta name="google-site-verification" content="${escapeHtml(GOOGLE_SITE_VERIFICATION)}" />`
      : '',
  };
  return {
    name: 'site-meta',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace(/__[A-Z_]+__/g, (t) => (t in tokens ? tokens[t] : t)),
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), siteMetaPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
