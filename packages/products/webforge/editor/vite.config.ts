import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import { defineConfig } from 'vite';
import { templateAppHtml, templateErrorHtml } from './vite-plugin-template-html.js';

export default defineConfig({
	plugins: [templateAppHtml(), templateErrorHtml(), tailwindcss(), sveltekit(), devtoolsJson()],
	ssr: {
		noExternal: ['@lucide/svelte'],
	},
});
