/**
 * Quadtree spatial index for object instances.
 *
 * Generic 2D quadtree supporting insert, remove, and AABB queries.
 * Used by the thin-instance object renderer for fast frustum culling
 * when the map contains thousands of placed objects.
 *
 * @example
 * ```typescript
 * import { createQuadtree, insertItem, queryRect } from './object-quadtree';
 *
 * const tree = createQuadtree({
 *   bounds: { minX: 0, minZ: 0, maxX: 1000, maxZ: 1000 },
 *   maxDepth: 8, maxItemsPerNode: 32,
 * });
 * insertItem(tree, { id: 'torch-1', bounds: { minX: 10, minZ: 20, maxX: 11, maxZ: 21 } });
 * const visible = queryRect(tree, { minX: 0, minZ: 0, maxX: 50, maxZ: 50 });
 * ```
 *
 * @module
 */

import type { Num } from '@/schemas/common';

// =============================================================================
// Types
// =============================================================================

/** Axis-aligned bounding box (2D: X/Z plane). */
export type AABB = {
  readonly minX: Num;
  readonly minZ: Num;
  readonly maxX: Num;
  readonly maxZ: Num;
};

/** An item stored in the quadtree. */
export type QuadtreeItem = {
  /** Unique identifier. */
  readonly id: string;
  /** Item's spatial bounds. */
  readonly bounds: AABB;
};

/**
 * A 2D frustum clipping plane (half-space test in X/Z).
 *
 * Points satisfy the plane when: `normalX * x + normalZ * z >= distance`.
 * For orthographic cameras, use 4 planes (left, right, near, far).
 */
export type FrustumPlane = {
  /** Normal X component. */
  readonly normalX: Num;
  /** Normal Z component. */
  readonly normalZ: Num;
  /** Signed distance from origin. */
  readonly distance: Num;
};

/** A quadtree node. */
export type Quadtree = {
  /** Node's spatial bounds. */
  bounds: AABB;
  /** Items stored directly in this node. */
  items: QuadtreeItem[];
  /** Four child nodes (NW, NE, SW, SE), or null if leaf. */
  children: [Quadtree, Quadtree, Quadtree, Quadtree] | null;
  /** Current depth in the tree. */
  depth: Num;
  /** Maximum tree depth. */
  maxDepth: Num;
  /** Maximum items per node before subdivision. */
  maxItemsPerNode: Num;
};

/** Options for {@link createQuadtree}. */
type CreateQuadtreeOptions = {
  /** World bounds of the quadtree. */
  readonly bounds: AABB;
  /** Maximum tree depth (default 8). */
  readonly maxDepth?: Num;
  /** Maximum items per node before subdivision (default 32). */
  readonly maxItemsPerNode?: Num;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Tests whether two AABBs overlap.
 *
 * @param a - First AABB
 * @param b - Second AABB
 * @returns True if the AABBs overlap
 */
function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

/**
 * Subdivides a node into four children.
 *
 * @param node - The node to subdivide
 */
function subdivide(node: Quadtree): void {
  const { minX, minZ, maxX, maxZ } = node.bounds;
  const midX: Num = (minX + maxX) / 2;
  const midZ: Num = (minZ + maxZ) / 2;
  const childDepth: Num = node.depth + 1;

  node.children = [
    // NW
    createNode(
      { minX, minZ, maxX: midX, maxZ: midZ },
      childDepth,
      node.maxDepth,
      node.maxItemsPerNode,
    ),
    // NE
    createNode(
      { minX: midX, minZ, maxX, maxZ: midZ },
      childDepth,
      node.maxDepth,
      node.maxItemsPerNode,
    ),
    // SW
    createNode(
      { minX, minZ: midZ, maxX: midX, maxZ },
      childDepth,
      node.maxDepth,
      node.maxItemsPerNode,
    ),
    // SE
    createNode(
      { minX: midX, minZ: midZ, maxX, maxZ },
      childDepth,
      node.maxDepth,
      node.maxItemsPerNode,
    ),
  ];

  // Re-insert items into children
  const existingItems: QuadtreeItem[] = node.items;
  node.items = [];
  for (const item of existingItems) {
    insertIntoChildren(node, item);
  }
}

/**
 * Creates a quadtree node (internal helper).
 *
 * @param bounds - Node bounds
 * @param depth - Current depth
 * @param maxDepth - Max depth
 * @param maxItemsPerNode - Max items per node
 * @returns A new quadtree node
 */
function createNode(bounds: AABB, depth: Num, maxDepth: Num, maxItemsPerNode: Num): Quadtree {
  return {
    bounds,
    items: [],
    children: null,
    depth,
    maxDepth,
    maxItemsPerNode,
  };
}

/**
 * Inserts an item into the appropriate child nodes.
 *
 * An item may be inserted into multiple children if it spans the boundary.
 *
 * @param node - The parent node with children
 * @param item - The item to insert
 */
function insertIntoChildren(node: Quadtree, item: QuadtreeItem): void {
  if (!node.children) return;
  for (const child of node.children) {
    if (aabbOverlap(child.bounds, item.bounds)) {
      insertItem(child, item);
    }
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Creates a new empty quadtree.
 *
 * @param options - World bounds, max depth, max items per node
 * @returns An empty quadtree root node
 *
 * @example
 * ```typescript
 * const tree = createQuadtree({
 *   bounds: { minX: 0, minZ: 0, maxX: 1000, maxZ: 1000 },
 *   maxDepth: 8,
 *   maxItemsPerNode: 32,
 * });
 * ```
 */
export function createQuadtree(options: CreateQuadtreeOptions): Quadtree {
  return createNode(options.bounds, 0, options.maxDepth ?? 8, options.maxItemsPerNode ?? 32);
}

/**
 * Inserts an item into the quadtree.
 *
 * If the node exceeds maxItemsPerNode and hasn't reached maxDepth,
 * it subdivides and redistributes items to children.
 *
 * @param tree - The quadtree or node to insert into
 * @param item - The item to insert
 *
 * @example
 * ```typescript
 * insertItem(tree, { id: 'torch-1', bounds: { minX: 10, minZ: 20, maxX: 11, maxZ: 21 } });
 * ```
 */
export function insertItem(tree: Quadtree, item: QuadtreeItem): void {
  // If subdivided, insert into children
  if (tree.children) {
    insertIntoChildren(tree, item);
    return;
  }

  // Add to this node
  tree.items.push(item);

  // Subdivide if needed
  if (tree.items.length > tree.maxItemsPerNode && tree.depth < tree.maxDepth) {
    subdivide(tree);
  }
}

/**
 * Removes an item from the quadtree by ID.
 *
 * Searches the tree recursively and removes the first item with the given ID.
 *
 * @param tree - The quadtree to remove from
 * @param id - The item ID to remove
 * @returns True if an item was removed, false if not found
 *
 * @example
 * ```typescript
 * const removed = removeItem(tree, 'torch-1');
 * ```
 */
export function removeItem(tree: Quadtree, id: string): boolean {
  // Check this node's items
  const idx: Num = tree.items.findIndex((item) => item.id === id);
  if (idx >= 0) {
    tree.items.splice(idx, 1);
    return true;
  }

  // Check children
  if (tree.children) {
    for (const child of tree.children) {
      if (removeItem(child, id)) return true;
    }
  }

  return false;
}

/**
 * Queries the quadtree for items overlapping a rectangle.
 *
 * @param tree - The quadtree to query
 * @param rect - The query AABB
 * @returns Array of items whose bounds overlap the query rect
 *
 * @example
 * ```typescript
 * const visible = queryRect(tree, { minX: 0, minZ: 0, maxX: 50, maxZ: 50 });
 * ```
 */
export function queryRect(tree: Quadtree, rect: AABB): QuadtreeItem[] {
  const results: QuadtreeItem[] = [];
  queryRectInternal(tree, rect, results, new Set());
  return results;
}

/**
 * Queries the quadtree for items inside a set of frustum clipping planes.
 *
 * Each plane defines a half-space: `normalX * x + normalZ * z >= distance`.
 * An item is included only if it's on the inside of ALL planes.
 *
 * For orthographic cameras, use 4 planes defining the viewport rectangle.
 * For perspective cameras, extract 6 frustum planes from the view-projection matrix.
 *
 * @param tree - The quadtree to query
 * @param planes - Array of frustum clipping planes
 * @returns Array of items inside the frustum
 *
 * @example
 * ```typescript
 * // Orthographic camera frustum: viewport [0,0]→[100,100]
 * const visible = queryFrustum(tree, [
 *   { normalX: 1, normalZ: 0, distance: 0 },    // left: x >= 0
 *   { normalX: -1, normalZ: 0, distance: -100 }, // right: x <= 100
 *   { normalX: 0, normalZ: 1, distance: 0 },     // near: z >= 0
 *   { normalX: 0, normalZ: -1, distance: -100 },  // far: z <= 100
 * ]);
 * ```
 */
export function queryFrustum(tree: Quadtree, planes: readonly FrustumPlane[]): QuadtreeItem[] {
  const results: QuadtreeItem[] = [];
  queryFrustumInternal(tree, planes, results, new Set());
  return results;
}

/**
 * Internal recursive query — collects items into results array.
 * Uses a seen set to avoid duplicates from items spanning multiple children.
 *
 * @param node - Current node
 * @param rect - Query AABB
 * @param results - Accumulator
 * @param seen - Set of already-collected item IDs
 */
function queryRectInternal(
  node: Quadtree,
  rect: AABB,
  results: QuadtreeItem[],
  seen: Set<string>,
): void {
  if (!aabbOverlap(node.bounds, rect)) return;

  // Check this node's items
  for (const item of node.items) {
    if (!seen.has(item.id) && aabbOverlap(item.bounds, rect)) {
      seen.add(item.id);
      results.push(item);
    }
  }

  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      queryRectInternal(child, rect, results, seen);
    }
  }
}

/**
 * Tests whether an AABB is entirely outside a frustum plane.
 *
 * The plane is defined as normalX*x + normalZ*z >= distance.
 * If the maximum signed distance of the AABB from the plane is negative,
 * the AABB is entirely outside.
 *
 * @param aabb - The AABB to test
 * @param plane - The frustum plane
 * @returns True if the AABB is entirely outside the plane (culled)
 */
function aabbOutsidePlane(aabb: AABB, plane: FrustumPlane): boolean {
  // Find the AABB corner most in the direction of the plane normal
  const testX: Num = plane.normalX >= 0 ? aabb.maxX : aabb.minX;
  const testZ: Num = plane.normalZ >= 0 ? aabb.maxZ : aabb.minZ;

  // If the farthest corner is still behind the plane, the entire AABB is outside
  return plane.normalX * testX + plane.normalZ * testZ < plane.distance;
}

/**
 * Internal recursive frustum query — collects items into results array.
 *
 * @param node - Current node
 * @param planes - Frustum planes
 * @param results - Accumulator
 * @param seen - Set of already-collected item IDs
 */
function queryFrustumInternal(
  node: Quadtree,
  planes: readonly FrustumPlane[],
  results: QuadtreeItem[],
  seen: Set<string>,
): void {
  // Test node bounds against all frustum planes
  for (const plane of planes) {
    if (aabbOutsidePlane(node.bounds, plane)) return;
  }

  // Check this node's items
  for (const item of node.items) {
    if (seen.has(item.id)) continue;

    let inside = true;
    for (const plane of planes) {
      if (aabbOutsidePlane(item.bounds, plane)) {
        inside = false;
        break;
      }
    }
    if (inside) {
      seen.add(item.id);
      results.push(item);
    }
  }

  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      queryFrustumInternal(child, planes, results, seen);
    }
  }
}
