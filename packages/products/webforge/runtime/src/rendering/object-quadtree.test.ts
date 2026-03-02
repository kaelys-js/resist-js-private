/**
 * Quadtree spatial index tests.
 *
 * Tests for generic quadtree: insertion, removal, rect query,
 * subdivision, boundary items, and large dataset performance.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type { Num } from '@/schemas/common';

import {
	createQuadtree,
	insertItem,
	removeItem,
	queryRect,
	queryFrustum,
	type Quadtree,
	type QuadtreeItem,
	type FrustumPlane,
} from './object-quadtree';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Creates a simple item at a position with 1×1 bounds.
 *
 * @param id - Item identifier
 * @param x - X position
 * @param z - Z position
 * @returns A QuadtreeItem with 1×1 bounds at (x, z)
 */
function makeItem(id: string, x: Num, z: Num): QuadtreeItem {
	return { id, bounds: { minX: x, minZ: z, maxX: x + 1, maxZ: z + 1 } };
}

// =============================================================================
// createQuadtree
// =============================================================================

describe('createQuadtree', () => {
	it('creates an empty quadtree', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 1000, maxZ: 1000 },
			maxDepth: 8,
			maxItemsPerNode: 32,
		});
		expect(tree.items.length).toBe(0);
		expect(tree.children).toBeNull();
	});
});

// =============================================================================
// insertItem
// =============================================================================

describe('insertItem', () => {
	it('inserts an item into the tree', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
			maxDepth: 4,
			maxItemsPerNode: 4,
		});

		insertItem(tree, makeItem('a', 10, 10));
		const results: QuadtreeItem[] = queryRect(tree, {
			minX: 0,
			minZ: 0,
			maxX: 100,
			maxZ: 100,
		});
		expect(results.length).toBe(1);
		expect(results[0]?.id).toBe('a');
	});

	it('inserts multiple items', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
			maxDepth: 4,
			maxItemsPerNode: 32,
		});

		insertItem(tree, makeItem('a', 10, 10));
		insertItem(tree, makeItem('b', 50, 50));
		insertItem(tree, makeItem('c', 90, 90));

		const results: QuadtreeItem[] = queryRect(tree, {
			minX: 0,
			minZ: 0,
			maxX: 100,
			maxZ: 100,
		});
		expect(results.length).toBe(3);
	});

	it('subdivides when max items exceeded', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
			maxDepth: 4,
			maxItemsPerNode: 2,
		});

		insertItem(tree, makeItem('a', 10, 10));
		insertItem(tree, makeItem('b', 60, 60));
		insertItem(tree, makeItem('c', 80, 80));

		// Should have subdivided
		expect(tree.children).not.toBeNull();
	});
});

// =============================================================================
// removeItem
// =============================================================================

describe('removeItem', () => {
	it('removes an item by id', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
			maxDepth: 4,
			maxItemsPerNode: 32,
		});

		insertItem(tree, makeItem('a', 10, 10));
		insertItem(tree, makeItem('b', 50, 50));

		const removed: boolean = removeItem(tree, 'a');
		expect(removed).toBe(true);

		const results: QuadtreeItem[] = queryRect(tree, {
			minX: 0,
			minZ: 0,
			maxX: 100,
			maxZ: 100,
		});
		expect(results.length).toBe(1);
		expect(results[0]?.id).toBe('b');
	});

	it('returns false for non-existent item', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
			maxDepth: 4,
			maxItemsPerNode: 32,
		});

		const removed: boolean = removeItem(tree, 'nonexistent');
		expect(removed).toBe(false);
	});

	it('removes from subdivided tree', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
			maxDepth: 4,
			maxItemsPerNode: 2,
		});

		insertItem(tree, makeItem('a', 10, 10));
		insertItem(tree, makeItem('b', 60, 60));
		insertItem(tree, makeItem('c', 80, 80));

		expect(tree.children).not.toBeNull();

		const removed: boolean = removeItem(tree, 'b');
		expect(removed).toBe(true);

		const results: QuadtreeItem[] = queryRect(tree, {
			minX: 0,
			minZ: 0,
			maxX: 100,
			maxZ: 100,
		});
		expect(results.length).toBe(2);
	});
});

// =============================================================================
// queryRect
// =============================================================================

describe('queryRect', () => {
	it('returns items within query rect', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
			maxDepth: 4,
			maxItemsPerNode: 32,
		});

		insertItem(tree, makeItem('a', 10, 10));
		insertItem(tree, makeItem('b', 50, 50));
		insertItem(tree, makeItem('c', 90, 90));

		// Query only bottom-left quadrant
		const results: QuadtreeItem[] = queryRect(tree, {
			minX: 0,
			minZ: 0,
			maxX: 30,
			maxZ: 30,
		});
		expect(results.length).toBe(1);
		expect(results[0]?.id).toBe('a');
	});

	it('returns empty for non-overlapping rect', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
			maxDepth: 4,
			maxItemsPerNode: 32,
		});

		insertItem(tree, makeItem('a', 10, 10));

		const results: QuadtreeItem[] = queryRect(tree, {
			minX: 50,
			minZ: 50,
			maxX: 60,
			maxZ: 60,
		});
		expect(results.length).toBe(0);
	});

	it('finds items at boundary', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
			maxDepth: 4,
			maxItemsPerNode: 32,
		});

		// Item at (49, 49) with bounds [49,49]→[50,50] — sits on center boundary
		insertItem(tree, makeItem('boundary', 49, 49));

		// Query that just overlaps
		const results: QuadtreeItem[] = queryRect(tree, {
			minX: 49,
			minZ: 49,
			maxX: 51,
			maxZ: 51,
		});
		expect(results.length).toBe(1);
	});

	it('handles subdivided trees correctly', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
			maxDepth: 4,
			maxItemsPerNode: 2,
		});

		// Force subdivision
		insertItem(tree, makeItem('a', 10, 10));
		insertItem(tree, makeItem('b', 60, 60));
		insertItem(tree, makeItem('c', 80, 80));

		// Query entire tree
		const allResults: QuadtreeItem[] = queryRect(tree, {
			minX: 0,
			minZ: 0,
			maxX: 100,
			maxZ: 100,
		});
		expect(allResults.length).toBe(3);

		// Query only top-right area
		const trResults: QuadtreeItem[] = queryRect(tree, {
			minX: 55,
			minZ: 55,
			maxX: 100,
			maxZ: 100,
		});
		expect(trResults.length).toBe(2);
	});
});

// =============================================================================
// Performance
// =============================================================================

// =============================================================================
// queryFrustum
// =============================================================================

describe('queryFrustum', () => {
	it('returns items within ortho-style frustum planes', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
			maxDepth: 4,
			maxItemsPerNode: 32,
		});

		insertItem(tree, makeItem('a', 10, 10));
		insertItem(tree, makeItem('b', 50, 50));
		insertItem(tree, makeItem('c', 90, 90));

		// Frustum planes forming a box [0,0]→[30,30] in X/Z
		// For ortho camera: 4 planes (left, right, near, far mapped to minX, maxX, minZ, maxZ)
		const planes: FrustumPlane[] = [
			{ normalX: 1, normalZ: 0, distance: 0 }, // left: x >= 0
			{ normalX: -1, normalZ: 0, distance: -30 }, // right: x <= 30
			{ normalX: 0, normalZ: 1, distance: 0 }, // near: z >= 0
			{ normalX: 0, normalZ: -1, distance: -30 }, // far: z <= 30
		];

		const results: QuadtreeItem[] = queryFrustum(tree, planes);
		expect(results.length).toBe(1);
		expect(results[0]?.id).toBe('a');
	});

	it('returns empty when no items in frustum', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
			maxDepth: 4,
			maxItemsPerNode: 32,
		});

		insertItem(tree, makeItem('a', 10, 10));

		// Frustum excluding all items: box [50,50]→[60,60]
		const planes: FrustumPlane[] = [
			{ normalX: 1, normalZ: 0, distance: 50 },
			{ normalX: -1, normalZ: 0, distance: -60 },
			{ normalX: 0, normalZ: 1, distance: 50 },
			{ normalX: 0, normalZ: -1, distance: -60 },
		];

		const results: QuadtreeItem[] = queryFrustum(tree, planes);
		expect(results.length).toBe(0);
	});

	it('handles empty planes array (returns all items)', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
			maxDepth: 4,
			maxItemsPerNode: 32,
		});

		insertItem(tree, makeItem('a', 10, 10));
		insertItem(tree, makeItem('b', 50, 50));

		// No clipping planes → everything is inside
		const results: QuadtreeItem[] = queryFrustum(tree, []);
		expect(results.length).toBe(2);
	});

	it('works with subdivided tree', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
			maxDepth: 4,
			maxItemsPerNode: 2,
		});

		insertItem(tree, makeItem('a', 10, 10));
		insertItem(tree, makeItem('b', 60, 60));
		insertItem(tree, makeItem('c', 80, 80));

		expect(tree.children).not.toBeNull();

		// Frustum covering [55,55]→[100,100]
		const planes: FrustumPlane[] = [
			{ normalX: 1, normalZ: 0, distance: 55 },
			{ normalX: -1, normalZ: 0, distance: -100 },
			{ normalX: 0, normalZ: 1, distance: 55 },
			{ normalX: 0, normalZ: -1, distance: -100 },
		];

		const results: QuadtreeItem[] = queryFrustum(tree, planes);
		expect(results.length).toBe(2);
		const ids: string[] = results.map((r) => r.id).toSorted();
		expect(ids).toEqual(['b', 'c']);
	});

	it('deduplicates items spanning multiple children', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
			maxDepth: 4,
			maxItemsPerNode: 2,
		});

		// Large item spanning center boundary
		insertItem(tree, { id: 'big', bounds: { minX: 40, minZ: 40, maxX: 60, maxZ: 60 } });
		insertItem(tree, makeItem('a', 10, 10));
		insertItem(tree, makeItem('b', 80, 80));

		// Frustum covering entire area
		const planes: FrustumPlane[] = [
			{ normalX: 1, normalZ: 0, distance: 0 },
			{ normalX: -1, normalZ: 0, distance: -100 },
			{ normalX: 0, normalZ: 1, distance: 0 },
			{ normalX: 0, normalZ: -1, distance: -100 },
		];

		const results: QuadtreeItem[] = queryFrustum(tree, planes);
		expect(results.length).toBe(3);
	});
});

describe('queryRect — performance', () => {
	it('handles 100K items with fast query', () => {
		const tree: Quadtree = createQuadtree({
			bounds: { minX: 0, minZ: 0, maxX: 10_000, maxZ: 10_000 },
			maxDepth: 8,
			maxItemsPerNode: 32,
		});

		// Insert 100K items spread across the space
		for (let i: Num = 0; i < 100_000; i++) {
			const x: Num = (i * 97) % 10_000;
			const z: Num = (i * 131) % 10_000;
			insertItem(tree, {
				id: `item-${String(i)}`,
				bounds: { minX: x, minZ: z, maxX: x + 1, maxZ: z + 1 },
			});
		}

		// Query a small area — should be fast
		const start: Num = performance.now();
		const results: QuadtreeItem[] = queryRect(tree, {
			minX: 0,
			minZ: 0,
			maxX: 100,
			maxZ: 100,
		});
		const elapsed: Num = performance.now() - start;

		expect(results.length).toBeGreaterThan(0);
		expect(elapsed).toBeLessThan(5); // Should be < 1ms, allow 5ms for CI
	});
});
