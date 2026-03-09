<script lang="ts">
import type { Bool, Str } from '@/schemas/common';
import { cn } from '../utils.js';

/**
 * Syntax-highlighted code block powered by Shiki.
 *
 * Lazily loads Shiki (highlighter, grammar, themes) on first render.
 * Automatically switches between light and dark themes based on
 * the document's current color scheme class.
 *
 * @example
 * ```svelte
 * <CodeBlock code={rawSource} lang="svelte" />
 * ```
 */
type CodeBlockProps = {
	/** Raw source code to highlight. @values console.log('hello'), const x = 42, <div>Hello</div> */
	code: Str;
	/** Language grammar to use. @values svelte, typescript, javascript, html, css, json, markdown, bash */
	lang?: Str;
	/** Additional CSS classes for the root element. */
	class?: Str;
};

const { code, lang = 'svelte', class: className }: CodeBlockProps = $props();

/** Whether we're currently in dark mode. */
const isDark: Bool = $derived(
	typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
);

/** The highlighted HTML output. Empty while loading. */
let highlightedHtml: Str = $state('');

/** Whether the highlighter is still loading. */
let loading: Bool = $state(true);

/**
 * Lazy-load Shiki and produce highlighted HTML.
 *
 * Uses `codeToHtml` from shiki with dual theme support.
 * Runs whenever `code`, `lang`, or `isDark` change.
 */
$effect(() => {
	const currentCode: Str = code;
	const currentLang: Str = lang;
	const currentDark: Bool = isDark;
	let cancelled: Bool = false;

	loading = true;

	(async (): Promise<void> => {
		try {
			const { codeToHtml } = await import('shiki');
			if (cancelled) return;

			const html: Str = await codeToHtml(currentCode, {
				lang: currentLang,
				theme: currentDark ? 'github-dark' : 'github-light',
			});
			if (cancelled) return;

			highlightedHtml = html;
		} catch {
			/* Shiki load failed — show plain text fallback */
			if (!cancelled) {
				highlightedHtml = '';
			}
		} finally {
			if (!cancelled) loading = false;
		}
	})();

	return (): void => {
		cancelled = true;
	};
});
</script>

<div class={cn('max-w-full overflow-x-auto rounded-md text-sm [&_pre]:overflow-x-auto [&_pre]:p-4', className)}>
	{#if loading}
		<pre class="p-4"><code>{code}</code></pre>
	{:else if highlightedHtml}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- Shiki produces trusted HTML -->
		{@html highlightedHtml}
	{:else}
		<pre class="p-4"><code>{code}</code></pre>
	{/if}
</div>
