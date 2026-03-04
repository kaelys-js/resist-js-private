import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import { defineConfig } from 'vite';
import { templateErrorHtml } from './vite-plugin-template-html.js';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson(), templateErrorHtml()],
	ssr: {
		noExternal: ['@lucide/svelte'],
	},
});
