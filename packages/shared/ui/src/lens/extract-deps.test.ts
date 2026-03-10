/**
 * Tests for extract-deps.ts — dependency extraction from raw Svelte component source.
 */
import { describe, it, expect } from 'vitest';
import type { Str } from '@/schemas/common';
import { extractDeps, extractReverseDeps, type DepTree, type ReverseDep } from './extract-deps.js';

describe('extractDeps', () => {
	it('extracts external npm imports', () => {
		const source: Str = `<script lang="ts">
import * as v from 'valibot';
import { slide } from 'svelte/transition';
</script>`;
		const deps: DepTree = extractDeps(source);
		expect(deps.external).toHaveLength(2);
		expect(deps.external[0]).toEqual({
			path: 'valibot',
			names: ['v'],
			component: '',
			kind: 'namespace',
		});
		expect(deps.external[1]).toEqual({
			path: 'svelte/transition',
			names: ['slide'],
			component: '',
			kind: 'named',
		});
	});

	it('extracts workspace alias imports', () => {
		const source: Str = `<script lang="ts">
import { safeParse } from '@/utils/result/safe';
import type { Str, Bool } from '@/schemas/common';
</script>`;
		const deps: DepTree = extractDeps(source);
		expect(deps.workspace).toHaveLength(2);
		expect(deps.workspace[0]).toEqual({
			path: '@/utils/result/safe',
			names: ['safeParse'],
			component: '',
			kind: 'named',
		});
		expect(deps.workspace[1]).toEqual({
			path: '@/schemas/common',
			names: ['Str', 'Bool'],
			component: '',
			kind: 'type',
		});
	});

	it('extracts internal sibling component imports', () => {
		const source: Str = `<script lang="ts">
import Button from '../button/button.svelte';
import * as DropdownMenu from '../dropdown-menu/index.js';
</script>`;
		const deps: DepTree = extractDeps(source);
		expect(deps.internal).toHaveLength(2);
		expect(deps.internal[0]).toEqual({
			path: '../button/button.svelte',
			names: ['Button'],
			component: 'button',
			kind: 'default',
		});
		expect(deps.internal[1]).toEqual({
			path: '../dropdown-menu/index.js',
			names: ['DropdownMenu'],
			component: 'dropdown-menu',
			kind: 'namespace',
		});
	});

	it('handles named imports with aliases', () => {
		const source: Str = `<script lang="ts">
import { cn as classNames, cva as classVariants } from '../utils.js';
</script>`;
		const deps: DepTree = extractDeps(source);
		expect(deps.internal).toHaveLength(1);
		expect(deps.internal[0].names).toEqual(['classNames', 'classVariants']);
		expect(deps.internal[0].kind).toBe('named');
	});

	it('handles default + named mixed imports', () => {
		const source: Str = `<script lang="ts">
import SearchIcon from '@lucide/svelte/icons/search';
</script>`;
		const deps: DepTree = extractDeps(source);
		expect(deps.external).toHaveLength(1);
		expect(deps.external[0]).toEqual({
			path: '@lucide/svelte/icons/search',
			names: ['SearchIcon'],
			component: '',
			kind: 'default',
		});
	});

	it('handles both script module and instance blocks', () => {
		const source: Str = `<script module lang="ts">
import * as v from 'valibot';
</script>
<script lang="ts">
import { safeParse } from '@/utils/result/safe';
import Badge from '../badge/badge.svelte';
</script>`;
		const deps: DepTree = extractDeps(source);
		expect(deps.external).toHaveLength(1);
		expect(deps.workspace).toHaveLength(1);
		expect(deps.internal).toHaveLength(1);
		expect(deps.internal[0].component).toBe('badge');
		expect(deps.internal[0].kind).toBe('default');
	});

	it('returns empty arrays for source with no imports', () => {
		const source: Str = `<script lang="ts">
const x: number = 42;
</script>`;
		const deps: DepTree = extractDeps(source);
		expect(deps.internal).toEqual([]);
		expect(deps.workspace).toEqual([]);
		expect(deps.external).toEqual([]);
	});

	it('handles type-only imports', () => {
		const source: Str = `<script lang="ts">
import type { Component } from 'svelte';
</script>`;
		const deps: DepTree = extractDeps(source);
		expect(deps.external).toHaveLength(1);
		expect(deps.external[0].names).toEqual(['Component']);
		expect(deps.external[0].kind).toBe('type');
	});

	it('extracts component dir from various relative path formats', () => {
		const source: Str = `<script lang="ts">
import CopyImport from '../copy-import/CopyImport.svelte';
import { toTitle } from '../lens/lens-utils.js';
import Badge from '../badge/badge.svelte';
</script>`;
		const deps: DepTree = extractDeps(source);
		expect(deps.internal).toHaveLength(3);
		expect(deps.internal[0].component).toBe('copy-import');
		expect(deps.internal[1].component).toBe('lens');
		expect(deps.internal[2].component).toBe('badge');
	});

	it('handles current-dir relative imports', () => {
		const source: Str = `<script lang="ts">
import { helper } from './utils.js';
</script>`;
		const deps: DepTree = extractDeps(source);
		// ./utils.js doesn't match the COMPONENT_DIR_RE pattern, so component is ''
		expect(deps.internal).toHaveLength(1);
		expect(deps.internal[0].path).toBe('./utils.js');
		expect(deps.internal[0].component).toBe('');
		expect(deps.internal[0].kind).toBe('named');
	});

	it('detects namespace import kind', () => {
		const source: Str = `<script lang="ts">
import * as Command from '../command/index.js';
</script>`;
		const deps: DepTree = extractDeps(source);
		expect(deps.internal[0].kind).toBe('namespace');
		expect(deps.internal[0].names).toEqual(['Command']);
	});
});

describe('extractReverseDeps', () => {
	/**
	 * Simple directory extractor for tests — mirrors extractDir from lens-utils.
	 *
	 * @param key - Glob key path
	 * @returns Component directory name
	 */
	function extractDir(key: Str): Str {
		const parts: Str[] = key.split('/');
		// Key format: @/ui/<dir>/<file>.svelte — dir is second-to-last segment
		return parts.length >= 2 ? (parts.at(-2) ?? '') : '';
	}

	it('finds components that import the target', () => {
		const allSources: Record<Str, Str> = {
			'@/ui/button/button.svelte': `<script lang="ts">
import Badge from '../badge/badge.svelte';
</script>`,
			'@/ui/dialog/dialog-content.svelte': `<script lang="ts">
import Badge from '../badge/badge.svelte';
</script>`,
			'@/ui/badge/badge.svelte': `<script lang="ts">
import { cn } from '../utils.js';
</script>`,
		};
		const result: ReverseDep[] = extractReverseDeps('badge', allSources, extractDir);
		expect(result).toHaveLength(2);
		expect(result[0].component).toBe('button');
		expect(result[1].component).toBe('dialog');
	});

	it('returns empty array when no one imports the target', () => {
		const allSources: Record<Str, Str> = {
			'@/ui/button/button.svelte': `<script lang="ts">
import { cn } from '../utils.js';
</script>`,
		};
		const result: ReverseDep[] = extractReverseDeps('badge', allSources, extractDir);
		expect(result).toEqual([]);
	});

	it('does not include the target component itself', () => {
		const allSources: Record<Str, Str> = {
			'@/ui/badge/badge.svelte': `<script lang="ts">
import { helper } from './helper.js';
</script>`,
		};
		const result: ReverseDep[] = extractReverseDeps('badge', allSources, extractDir);
		expect(result).toEqual([]);
	});

	it('deduplicates multiple files from the same directory', () => {
		const allSources: Record<Str, Str> = {
			'@/ui/dialog/dialog-content.svelte': `<script lang="ts">
import Badge from '../badge/badge.svelte';
</script>`,
			'@/ui/dialog/dialog-header.svelte': `<script lang="ts">
import Badge from '../badge/badge.svelte';
</script>`,
		};
		const result: ReverseDep[] = extractReverseDeps('badge', allSources, extractDir);
		// Should only have one entry for 'dialog', not two
		expect(result).toHaveLength(1);
		expect(result[0].component).toBe('dialog');
	});

	it('includes import kind in reverse deps', () => {
		const allSources: Record<Str, Str> = {
			'@/ui/card/card.svelte': `<script lang="ts">
import type { ButtonProps } from '../button/button.svelte';
</script>`,
		};
		const result: ReverseDep[] = extractReverseDeps('button', allSources, extractDir);
		expect(result).toHaveLength(1);
		expect(result[0].kind).toBe('type');
	});

	it('returns sorted results', () => {
		const allSources: Record<Str, Str> = {
			'@/ui/dialog/dialog.svelte': `<script lang="ts">
import Badge from '../badge/badge.svelte';
</script>`,
			'@/ui/alert/alert.svelte': `<script lang="ts">
import Badge from '../badge/badge.svelte';
</script>`,
			'@/ui/card/card.svelte': `<script lang="ts">
import Badge from '../badge/badge.svelte';
</script>`,
		};
		const result: ReverseDep[] = extractReverseDeps('badge', allSources, extractDir);
		expect(result.map((r: ReverseDep): Str => r.component)).toEqual(['alert', 'card', 'dialog']);
	});
});
