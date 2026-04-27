/**
 * Vite configuration for the Storylyne editor.
 *
 * Uses the shared factory from `@/config/tooling/vite` for git metadata,
 * server watch config, and SSR settings. Editor-specific plugins (tailwind,
 * template HTML, preview WS, devtools) are added here.
 *
 * @module
 */

import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import { createViteConfig } from '@/config/tooling/vite';
import { createLazyPlugin } from '@/config/tooling/vite/lazy-plugin';
import { templateAppHtml, templateErrorHtml } from '@/config/tooling/vite/template-html';
import { TEMPLATE_PATHS } from '@/config/tooling/svelte';
import {
  APP_NAME,
  FONT_FACES,
  FONT_FAMILIES,
  STORAGE_PREFIX,
} from '@/products/storylyne/editor/src/lib/config/app-meta';
import { en } from '@/products/storylyne/editor/src/lib/locales/en';

export default createViteConfig({
  plugins: [
    templateAppHtml({
      appName: APP_NAME,
      templatePath: TEMPLATE_PATHS.appHtml,
      storagePrefix: STORAGE_PREFIX,
    }),
    templateErrorHtml({
      appName: APP_NAME,
      fontFamilies: FONT_FAMILIES,
      fontFaces: [...FONT_FACES],
      locale: en.errors,
      templatePath: TEMPLATE_PATHS.errorHtml,
    }),
    tailwindcss(),
    createLazyPlugin({
      name: 'lens-preview-ws',
      modulePath: './src/lib/server/preview/vite-plugin-preview-ws.ts',
      setupFn: 'setupPreviewWs',
    }),
    sveltekit(),
    devtoolsJson(),
  ],
});
