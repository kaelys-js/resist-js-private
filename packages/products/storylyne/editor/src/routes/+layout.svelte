<script lang="ts">
	/**
	 * Minimal root layout — imports global CSS only.
	 *
	 * The real app shell (sidebar, header, resizable panes) lives in
	 * `(app)/+layout.svelte`. This keeps `(testing)/` routes completely
	 * free of the editor chrome.
	 */
	import '../app.css';

	const { children } = $props();
</script>

{@render children()}
