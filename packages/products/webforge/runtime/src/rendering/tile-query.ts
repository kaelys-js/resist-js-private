/**
 * Tile Property Query
 *
 * Resolves a global tile ID to its per-tile metadata (bush, counter,
 * damageFloor, ladder, passability, terrainTag, height) from the
 * tileset configuration's `tileProperties` record.
 *
 * Used by game logic systems (movement, interaction, rendering effects)
 * to query tile flags without direct access to tileset internals.
 *
 * @example
 * ```typescript
 * import { getTileProperties } from './tile-query';
 *
 * const result = getTileProperties({ tilesets, globalTileId: 5 });
 * if (result.ok && result.data.bush) {
 *   // Apply bush rendering effect (hide lower half of character)
 * }
 * ```
 *
 * @module
 */

import { okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import type { Num } from '@/schemas/common';

import { TilePropertiesSchema, type TileProperties } from '../schemas/map-data';
import { resolveGlobalTileId, type LoadedTileset } from './tileset-loader';
import type { BabylonResult } from '../core/babylon-result';

// =============================================================================
// Default Properties
// =============================================================================

/**
 * Default tile properties returned when no per-tile entry exists
 * or the tile ID is invalid/empty (ID 0).
 */
const DEFAULT_PROPERTIES_RESULT: Result<TileProperties> = safeParse(TilePropertiesSchema, {});

// =============================================================================
// Options
// =============================================================================

/** Options for {@link getTileProperties}. */
type GetTilePropertiesOptions = {
	/** Loaded tilesets from a RenderedTilemap. */
	readonly tilesets: readonly LoadedTileset[];
	/** Global tile ID to look up. */
	readonly globalTileId: Num;
};

// =============================================================================
// getTileProperties
// =============================================================================

/**
 * Looks up per-tile metadata for a global tile ID.
 *
 * Resolves the global ID to its owning tileset and local index, then
 * returns the tile's properties from the tileset config. Returns
 * default properties (all flags false, passability all true) when:
 * - The tile ID is 0 (empty tile)
 * - The tile ID is out of range for all tilesets
 * - No tileProperties entry exists for the local index
 *
 * @param options - Tilesets and global tile ID to query.
 * @returns `Result<TileProperties>` — the tile's metadata, or defaults.
 *
 * @example
 * ```typescript
 * const result = getTileProperties({ tilesets, globalTileId: 5 });
 * if (result.ok) {
 *   result.data.bush;    // false (default)
 *   result.data.counter; // false (default)
 * }
 * ```
 */
export function getTileProperties(options: GetTilePropertiesOptions): Result<TileProperties> {
	const { tilesets, globalTileId } = options;

	// Resolve global ID → tileset + local index
	const resolved: BabylonResult<{ tileset: LoadedTileset; localIndex: Num } | null> =
		resolveGlobalTileId({ globalId: globalTileId, tilesets });
	if (!resolved.ok) return resolved;

	// Empty tile (ID 0) or out-of-range → defaults
	if (resolved.data === null) return DEFAULT_PROPERTIES_RESULT;

	// Look up per-tile properties from tileset config
	const localKey: string = String(resolved.data.localIndex);
	const entry: TileProperties | undefined = resolved.data.tileset.config.tileProperties[localKey];

	if (entry === undefined) return DEFAULT_PROPERTIES_RESULT;

	// Validate and return the entry (ensures defaults for missing optional fields)
	return safeParse(TilePropertiesSchema, entry);
}
