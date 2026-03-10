/**
 * Tests for extract-deps.ts — dependency extraction from raw Svelte component source.
 */
import { describe, it, expect } from 'vitest';
import type { Str } from '@/schemas/common';
import { extractDeps, type DepTree } from './extract-deps.js';

describe('extractDeps', () => {
	it('extracts external npm imports', () => {
		const source: Str = `<script lang="ts">
import * as v from 'valibot';
import { slide } from 'svelte/transition';
</script>`;
		const deps: DepTree = extractDeps(source);
		expect(deps.external).toHaveLength(2);
		expect(deps.external[0]).toEqual({ path: 'valibot', names: ['v'], component: '' });
		expect(deps.external[1]).toEqual({
			path: 'svelte/transition',
			names: ['slide'],
			component: '',
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
		});
		expect(deps.workspace[1]).toEqual({
			path: '@/schemas/common',
			names: ['Str', 'Bool'],
			component: '',
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
		});
		expect(deps.internal[1]).toEqual({
			path: '../dropdown-menu/index.js',
			names: ['DropdownMenu'],
			component: 'dropdown-menu',
		});
	});

	it('handles named imports with aliases', () => {
		const source: Str = `<script lang="ts">
import { cn as classNames, cva as classVariants } from '../utils.js';
</script>`;
		const deps: DepTree = extractDeps(source);
		expect(deps.internal).toHaveLength(1);
		expect(deps.internal[0].names).toEqual(['classNames', 'classVariants']);
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
	});
});
