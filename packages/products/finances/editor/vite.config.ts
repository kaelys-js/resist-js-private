import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import { defineConfig } from 'vite';
import { templateAppHtml, templateErrorHtml } from './vite-plugin-template-html.js';

/**
 * Reads git metadata for build-time injection.
 *
 * @returns Git commit (short + full), branch name, and dirty flag
 */
function getGitInfo(): {
	commit: string;
	commitFull: string;
	branch: string;
	dirty: boolean;
} {
	try {
		return {
			commit: execSync('git rev-parse --short HEAD').toString().trim(),
			commitFull: execSync('git rev-parse HEAD').toString().trim(),
			branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
			dirty: execSync('git status --porcelain').toString().trim().length > 0,
		};
	} catch {
		return { commit: 'unknown', commitFull: 'unknown', branch: 'unknown', dirty: false };
	}
}

const git = getGitInfo();
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

export default defineConfig({
	plugins: [templateAppHtml(), templateErrorHtml(), tailwindcss(), sveltekit(), devtoolsJson()],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
		__GIT_COMMIT__: JSON.stringify(git.commit),
		__GIT_COMMIT_FULL__: JSON.stringify(git.commitFull),
		__GIT_BRANCH__: JSON.stringify(git.branch),
		__GIT_DIRTY__: JSON.stringify(git.dirty),
		__BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
	},
	server: {
		port: 5174,
	},
	preview: {
		port: 4174,
	},
	ssr: {
		noExternal: ['@lucide/svelte'],
	},
});
