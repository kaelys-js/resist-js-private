/**
 * GPU tile renderer — layer quad mesh + StandardMaterial + data texture management.
 *
 * Creates one mesh per tile layer with a StandardMaterial extended by
 * {@link GpuTileMaterialPlugin} that reads tile IDs from a RGBA32F
 * data texture and samples the tileset atlas. This preserves all
 * StandardMaterial features (lighting, shadows, fog, glow, post-FX)
 * while replacing the diffuse color with data-texture tile lookups.
 *
 * @example
 * ```typescript
 * import { createGpuTileLayer, setGpuLayerVisibility } from './gpu-tile-renderer';
 *
 * const result = createGpuTileLayer({ scene, layerName: 'ground', ... });
 * if (result.ok) setGpuLayerVisibility({ layer: result.data, visible: true });
 * ```
 *
 * @module
 */

import * as v from 'valibot';
import * as BABYLON from '@babylonjs/core';

import { ERRORS, err } from '@/schemas/result/result';
import type { Num, Str } from '@/schemas/common';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import { buildLayerData, buildUniformLayerData } from './gpu-tile-data-texture';
import { GpuTileMaterialPlugin } from './gpu-tile-material-plugin';
import { resolveAutotile } from './autotile-resolver';
import type { AutotileType } from '../schemas/map-data';

// =============================================================================
// Schemas
// =============================================================================

/** A GPU-rendered tile layer. */
export const GpuTileLayerSchema = v.strictObject({
  /** The ground-plane mesh for this layer. */
  mesh: v.custom<BABYLON.Mesh>((val): val is BABYLON.Mesh => val instanceof BABYLON.Mesh),
  /** StandardMaterial with GpuTileMaterialPlugin for lighting-compatible tile rendering. */
  material: v.custom<BABYLON.StandardMaterial>(
    (val): val is BABYLON.StandardMaterial => val instanceof BABYLON.StandardMaterial,
  ),
  /** The material plugin that handles data-texture tile lookups. */
  plugin: v.custom<GpuTileMaterialPlugin>(
    (val): val is GpuTileMaterialPlugin => val instanceof GpuTileMaterialPlugin,
  ),
  /** RGBA32F data texture containing tile IDs + visual flags. */
  dataTexture: v.custom<BABYLON.RawTexture>(
    (val): val is BABYLON.RawTexture => val instanceof BABYLON.RawTexture,
  ),
  /** CPU-side copy of the layer data (Float32Array, RGBA32F format). */
  layerData: v.custom<Float32Array<ArrayBufferLike>>(
    (val): val is Float32Array<ArrayBufferLike> => val instanceof Float32Array,
  ),
  /** Layer index in the map. */
  layerIndex: v.number(),
  /** Map width in tiles. */
  mapWidth: v.number(),
  /** Map height in tiles. */
  mapHeight: v.number(),
});

/** A GPU-rendered tile layer. */
export type GpuTileLayer = v.InferOutput<typeof GpuTileLayerSchema>;

// =============================================================================
// Options Schemas
// =============================================================================

/** Options schema for {@link createGpuTileLayer}. */
export const CreateGpuTileLayerOptionsSchema = v.pipe(
  v.strictObject({
    /** The Babylon.js scene. */
    scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
    /** Layer name (used in mesh/material naming). */
    layerName: v.string(),
    /** Layer index in the map. */
    layerIndex: v.number(),
    /** Map width in tiles. */
    mapWidth: v.pipe(v.number(), v.integer(), v.minValue(1)),
    /** Map height in tiles. */
    mapHeight: v.pipe(v.number(), v.integer(), v.minValue(1)),
    /** Flat tile ID array (length = mapWidth × mapHeight). */
    tileIds: v.custom<readonly Num[]>((val): val is readonly Num[] => Array.isArray(val)),
    /** Tileset atlas texture (nullable for testing with NullEngine). */
    atlasTexture: v.nullable(
      v.custom<BABYLON.Texture>((val): val is BABYLON.Texture => val instanceof BABYLON.Texture),
    ),
    /** Tile width in pixels (shader derives atlas grid from textureSize / tilePixelSize). */
    tilePixelWidth: v.pipe(v.number(), v.integer(), v.minValue(1)),
    /** Tile height in pixels (shader derives atlas grid from textureSize / tilePixelSize). */
    tilePixelHeight: v.pipe(v.number(), v.integer(), v.minValue(1)),
    /** Size of one tile in world units. */
    tileWorldSize: v.pipe(v.number(), v.minValue(0.01)),
    /** Optional Y offset for layer stacking (defaults to 0). */
    heightY: v.optional(v.number()),
  }),
  v.readonly(),
);

/** Options for {@link createGpuTileLayer}. */
export type CreateGpuTileLayerOptions = v.InferOutput<typeof CreateGpuTileLayerOptionsSchema>;

/** Options schema for {@link disposeGpuTileLayer}. */
export const DisposeGpuTileLayerOptionsSchema = v.pipe(
  v.strictObject({
    /** The GPU layer to dispose. */
    layer: v.custom<GpuTileLayer>((val): val is GpuTileLayer => typeof val === 'object'),
  }),
  v.readonly(),
);

/** Options for {@link disposeGpuTileLayer}. */
export type DisposeGpuTileLayerOptions = v.InferOutput<typeof DisposeGpuTileLayerOptionsSchema>;

/** Options schema for {@link setGpuLayerVisibility}. */
export const SetGpuLayerVisibilityOptionsSchema = v.pipe(
  v.strictObject({
    /** The GPU layer. */
    layer: v.custom<GpuTileLayer>((val): val is GpuTileLayer => typeof val === 'object'),
    /** Whether the layer is visible. */
    visible: v.boolean(),
  }),
  v.readonly(),
);

/** Options for {@link setGpuLayerVisibility}. */
export type SetGpuLayerVisibilityOptions = v.InferOutput<typeof SetGpuLayerVisibilityOptionsSchema>;

/** Options schema for {@link setGpuLayerOpacity}. */
export const SetGpuLayerOpacityOptionsSchema = v.pipe(
  v.strictObject({
    /** The GPU layer. */
    layer: v.custom<GpuTileLayer>((val): val is GpuTileLayer => typeof val === 'object'),
    /** Opacity value (0.0–1.0). */
    opacity: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  }),
  v.readonly(),
);

/** Options for {@link setGpuLayerOpacity}. */
export type SetGpuLayerOpacityOptions = v.InferOutput<typeof SetGpuLayerOpacityOptionsSchema>;

/** Options schema for {@link setGpuAnimationFrame}. */
export const SetGpuAnimationFrameOptionsSchema = v.pipe(
  v.strictObject({
    /** The GPU layer. */
    layer: v.custom<GpuTileLayer>((val): val is GpuTileLayer => typeof val === 'object'),
    /** Animation frame index. */
    frame: v.pipe(v.number(), v.minValue(0)),
  }),
  v.readonly(),
);

/** Options for {@link setGpuAnimationFrame}. */
export type SetGpuAnimationFrameOptions = v.InferOutput<typeof SetGpuAnimationFrameOptionsSchema>;

/** Options schema for {@link setGpuLayerTint}. */
export const SetGpuLayerTintOptionsSchema = v.pipe(
  v.strictObject({
    /** The GPU layer. */
    layer: v.custom<GpuTileLayer>((val): val is GpuTileLayer => typeof val === 'object'),
    /** Red component (0.0–1.0). */
    r: v.number(),
    /** Green component (0.0–1.0). */
    g: v.number(),
    /** Blue component (0.0–1.0). */
    b: v.number(),
    /** Alpha component (0.0–1.0). */
    a: v.number(),
  }),
  v.readonly(),
);

/** Options for {@link setGpuLayerTint}. */
export type SetGpuLayerTintOptions = v.InferOutput<typeof SetGpuLayerTintOptionsSchema>;

/** Options schema for {@link setGpuLayerBrightness}. */
export const SetGpuLayerBrightnessOptionsSchema = v.pipe(
  v.strictObject({
    /** The GPU layer. */
    layer: v.custom<GpuTileLayer>((val): val is GpuTileLayer => typeof val === 'object'),
    /** Brightness adjustment (additive, typically -1.0 to 1.0). */
    brightness: v.number(),
  }),
  v.readonly(),
);

/** Options for {@link setGpuLayerBrightness}. */
export type SetGpuLayerBrightnessOptions = v.InferOutput<typeof SetGpuLayerBrightnessOptionsSchema>;

/** Options schema for {@link setGpuLayerSaturation}. */
export const SetGpuLayerSaturationOptionsSchema = v.pipe(
  v.strictObject({
    /** The GPU layer. */
    layer: v.custom<GpuTileLayer>((val): val is GpuTileLayer => typeof val === 'object'),
    /** Saturation (0.0 = grayscale, 1.0 = normal, >1.0 = oversaturated). */
    saturation: v.number(),
  }),
  v.readonly(),
);

/** Options for {@link setGpuLayerSaturation}. */
export type SetGpuLayerSaturationOptions = v.InferOutput<typeof SetGpuLayerSaturationOptionsSchema>;

/** Options schema for {@link setGpuLayerContrast}. */
export const SetGpuLayerContrastOptionsSchema = v.pipe(
  v.strictObject({
    /** The GPU layer. */
    layer: v.custom<GpuTileLayer>((val): val is GpuTileLayer => typeof val === 'object'),
    /** Contrast (0.0 = flat, 1.0 = normal, >1.0 = boosted). */
    contrast: v.number(),
  }),
  v.readonly(),
);

/** Options for {@link setGpuLayerContrast}. */
export type SetGpuLayerContrastOptions = v.InferOutput<typeof SetGpuLayerContrastOptionsSchema>;

/** Options schema for {@link setGpuLayerOffset}. */
export const SetGpuLayerOffsetOptionsSchema = v.pipe(
  v.strictObject({
    /** The GPU layer. */
    layer: v.custom<GpuTileLayer>((val): val is GpuTileLayer => typeof val === 'object'),
    /** X offset in UV space. */
    x: v.number(),
    /** Y offset in UV space. */
    y: v.number(),
  }),
  v.readonly(),
);

/** Options for {@link setGpuLayerOffset}. */
export type SetGpuLayerOffsetOptions = v.InferOutput<typeof SetGpuLayerOffsetOptionsSchema>;

/** Options schema for {@link updateGpuTile}. */
export const UpdateGpuTileOptionsSchema = v.pipe(
  v.strictObject({
    /** The GPU layer. */
    layer: v.custom<GpuTileLayer>((val): val is GpuTileLayer => typeof val === 'object'),
    /** Tile X coordinate (column). */
    x: v.number(),
    /** Tile Y coordinate (row). */
    y: v.number(),
    /** New tile ID (0 = empty). */
    tileId: v.pipe(v.number(), v.integer(), v.minValue(0)),
    /** Optional visual flags (packed uint32). Defaults to 0xF0 for non-empty tiles. */
    visualFlags: v.optional(v.number()),
  }),
  v.readonly(),
);

/** Options for {@link updateGpuTile}. */
export type UpdateGpuTileOptions = v.InferOutput<typeof UpdateGpuTileOptionsSchema>;

/** Options schema for {@link updateGpuTileAutotile}. */
export const UpdateGpuTileAutotileOptionsSchema = v.pipe(
  v.strictObject({
    /** The GPU layer. */
    layer: v.custom<GpuTileLayer>((val): val is GpuTileLayer => typeof val === 'object'),
    /** Tile X coordinate (column). */
    x: v.number(),
    /** Tile Y coordinate (row). */
    y: v.number(),
    /** Tile ID to place (the base autotile terrain ID). */
    tileId: v.pipe(v.number(), v.integer(), v.minValue(0)),
    /** Flat row-major layer data for neighbor analysis. */
    layerData: v.custom<readonly Num[]>((val): val is readonly Num[] => Array.isArray(val)),
    /** Autotile type for pattern resolution. */
    autotileType: v.custom<AutotileType>(
      (val): val is AutotileType =>
        val === 'none' || val === 'terrain_48' || val === 'wall_16' || val === 'animated_terrain',
    ),
  }),
  v.readonly(),
);

/** Options for {@link updateGpuTileAutotile}. */
export type UpdateGpuTileAutotileOptions = v.InferOutput<typeof UpdateGpuTileAutotileOptionsSchema>;

// =============================================================================
// createGpuTileLayer
// =============================================================================

/**
 * Creates a GPU-rendered tile layer with a ground mesh and StandardMaterial.
 *
 * The mesh is a single ground plane sized to cover the full map.
 * A {@link GpuTileMaterialPlugin} is registered on the StandardMaterial
 * to override the diffuse color with data-texture tile lookups.
 * All StandardMaterial features (lighting, shadows, fog, glow, post-FX)
 * are preserved.
 *
 * @param options - Scene, layer info, tile data, atlas config
 * @returns BabylonResult containing the GPU tile layer
 *
 * @example
 * ```typescript
 * const result = createGpuTileLayer({
 *   scene, layerName: 'ground', layerIndex: 0,
 *   mapWidth: 32, mapHeight: 32, tileIds, atlasTexture,
 *   tilePixelWidth: 32, tilePixelHeight: 32, tileWorldSize: 1,
 * });
 * ```
 */
export function createGpuTileLayer(
  options: CreateGpuTileLayerOptions,
): BabylonResult<GpuTileLayer> {
  const {
    scene,
    layerName,
    layerIndex,
    mapWidth,
    mapHeight,
    tileIds,
    atlasTexture,
    tilePixelWidth,
    tilePixelHeight,
    tileWorldSize,
    heightY,
  } = options;

  try {
    // Build RGBA32F layer data
    const dataResult = buildLayerData({ tileIds, width: mapWidth, height: mapHeight });
    if (!dataResult.ok) return dataResult;

    const layerData: Float32Array<ArrayBufferLike> = dataResult.data;

    // Create RGBA32F data texture (float format — Babylon.js cannot reliably create integer textures)
    const dataTexture: BABYLON.RawTexture = new BABYLON.RawTexture(
      layerData,
      mapWidth,
      mapHeight,
      BABYLON.Constants.TEXTUREFORMAT_RGBA,
      scene,
      false, // generateMipMaps
      false, // invertY
      BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
      BABYLON.Constants.TEXTURETYPE_FLOAT,
    );
    dataTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    dataTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

    // Create ground mesh sized to cover the map
    const worldWidth: Num = mapWidth * tileWorldSize;
    const worldHeight: Num = mapHeight * tileWorldSize;
    const meshName: Str = `gpu-layer-${layerName}-${String(layerIndex)}` as Str;

    const mesh: BABYLON.Mesh = BABYLON.MeshBuilder.CreateGround(
      meshName,
      {
        width: worldWidth,
        height: worldHeight,
        subdivisions: 1,
      },
      scene,
    );

    // Position at map center
    mesh.position.x = worldWidth / 2;
    mesh.position.y = heightY ?? 0;
    mesh.position.z = worldHeight / 2;

    // Create StandardMaterial — preserves lighting, shadows, fog, glow, post-FX
    const materialName: Str = `gpu-mat-${layerName}-${String(layerIndex)}` as Str;
    const material: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(materialName, scene);

    // Disable specular so tiles appear flat unless user adds specular
    material.specularColor = new BABYLON.Color3(0, 0, 0);
    material.backFaceCulling = false;
    material.alphaMode = BABYLON.Constants.ALPHA_COMBINE;

    // Register the GPU tile material plugin
    const plugin: GpuTileMaterialPlugin = new GpuTileMaterialPlugin(material);
    plugin.isEnabled = true;

    // Set plugin uniforms
    plugin.mapSize = new BABYLON.Vector2(mapWidth, mapHeight);
    plugin.tilePixelSize = new BABYLON.Vector2(tilePixelWidth, tilePixelHeight);
    plugin.layerOpacity = 1;
    plugin.animationFrame = 0;
    plugin.layerTint = new BABYLON.Color4(1, 1, 1, 1);
    plugin.layerBrightness = 0;
    plugin.layerSaturation = 1;
    plugin.layerContrast = 1;
    plugin.layerOffset = new BABYLON.Vector2(0, 0);
    plugin.invWorldSize = new BABYLON.Vector2(mapWidth / worldWidth, mapHeight / worldHeight);

    // Set textures
    plugin.tileDataTexture = dataTexture;
    if (atlasTexture) {
      plugin.tileAtlas = atlasTexture;
    }

    mesh.material = material;

    const gpuLayer: GpuTileLayer = {
      mesh,
      material,
      plugin,
      dataTexture,
      layerData,
      layerIndex,
      mapWidth,
      mapHeight,
    };

    return okShallow(gpuLayer);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// createGpuTileLayerUniform
// =============================================================================

/**
 * Creates a GPU tile layer where every tile has the same ID.
 *
 * Optimized fast path for blank/uniform maps — avoids creating intermediate
 * JS tile ID arrays. Directly fills the Float32Array data texture.
 *
 * @param options - Scene, layer info, map dimensions, fill tile ID, atlas texture.
 * @returns Result containing the GPU tile layer.
 *
 * @example
 * ```typescript
 * const result = createGpuTileLayerUniform({
 *   scene, layerName: 'ground', layerIndex: 0,
 *   mapWidth: 1000, mapHeight: 1000, fillTileId: 1,
 *   atlasTexture: tex, tilePixelWidth: 32, tilePixelHeight: 32,
 *   tileWorldSize: 1,
 * });
 * ```
 */
export function createGpuTileLayerUniform(options: {
  readonly scene: BABYLON.Scene;
  readonly layerName: Str;
  readonly layerIndex: Num;
  readonly mapWidth: Num;
  readonly mapHeight: Num;
  readonly fillTileId: Num;
  readonly atlasTexture: BABYLON.Texture | null;
  readonly tilePixelWidth: Num;
  readonly tilePixelHeight: Num;
  readonly tileWorldSize: Num;
  readonly heightY?: Num;
}): BabylonResult<GpuTileLayer> {
  const {
    scene,
    layerName,
    layerIndex,
    mapWidth,
    mapHeight,
    fillTileId,
    atlasTexture,
    tilePixelWidth,
    tilePixelHeight,
    tileWorldSize,
    heightY,
  } = options;

  try {
    const layerData: Float32Array<ArrayBufferLike> = buildUniformLayerData(
      mapWidth,
      mapHeight,
      fillTileId,
    );

    const dataTexture: BABYLON.RawTexture = new BABYLON.RawTexture(
      layerData,
      mapWidth,
      mapHeight,
      BABYLON.Constants.TEXTUREFORMAT_RGBA,
      scene,
      false,
      false,
      BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
      BABYLON.Constants.TEXTURETYPE_FLOAT,
    );
    dataTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    dataTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

    const worldWidth: Num = mapWidth * tileWorldSize;
    const worldHeight: Num = mapHeight * tileWorldSize;
    const meshName: Str = `gpu-layer-${layerName}-${String(layerIndex)}` as Str;

    const mesh: BABYLON.Mesh = BABYLON.MeshBuilder.CreateGround(
      meshName,
      { width: worldWidth, height: worldHeight, subdivisions: 1 },
      scene,
    );
    mesh.position.x = worldWidth / 2;
    mesh.position.y = heightY ?? 0;
    mesh.position.z = worldHeight / 2;

    const materialName: Str = `gpu-mat-${layerName}-${String(layerIndex)}` as Str;
    const material: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(materialName, scene);
    material.specularColor = new BABYLON.Color3(0, 0, 0);
    material.backFaceCulling = false;
    material.alphaMode = BABYLON.Constants.ALPHA_COMBINE;

    const plugin: GpuTileMaterialPlugin = new GpuTileMaterialPlugin(material);
    plugin.isEnabled = true;
    plugin.mapSize = new BABYLON.Vector2(mapWidth, mapHeight);
    plugin.tilePixelSize = new BABYLON.Vector2(tilePixelWidth, tilePixelHeight);
    plugin.layerOpacity = 1;
    plugin.animationFrame = 0;
    plugin.layerTint = new BABYLON.Color4(1, 1, 1, 1);
    plugin.layerBrightness = 0;
    plugin.layerSaturation = 1;
    plugin.layerContrast = 1;
    plugin.layerOffset = new BABYLON.Vector2(0, 0);
    plugin.invWorldSize = new BABYLON.Vector2(mapWidth / worldWidth, mapHeight / worldHeight);
    plugin.tileDataTexture = dataTexture;
    if (atlasTexture) plugin.tileAtlas = atlasTexture;

    mesh.material = material;

    const gpuLayer: GpuTileLayer = {
      mesh,
      material,
      plugin,
      dataTexture,
      layerData,
      layerIndex,
      mapWidth,
      mapHeight,
    };

    return okShallow(gpuLayer);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// disposeGpuTileLayer
// =============================================================================

/**
 * Disposes a GPU tile layer's mesh, material, and data texture.
 *
 * @param options - The GPU layer to dispose
 *
 * @example
 * ```typescript
 * disposeGpuTileLayer({ layer: gpuLayer });
 * ```
 */
export function disposeGpuTileLayer(options: DisposeGpuTileLayerOptions): void {
  const { layer } = options;

  layer.dataTexture.dispose();
  layer.material.dispose();
  layer.mesh.dispose();
}

// =============================================================================
// setGpuLayerVisibility
// =============================================================================

/**
 * Sets the visibility of a GPU tile layer.
 *
 * @param options - The GPU layer and visibility flag
 *
 * @example
 * ```typescript
 * setGpuLayerVisibility({ layer: gpuLayer, visible: false });
 * ```
 */
export function setGpuLayerVisibility(options: SetGpuLayerVisibilityOptions): void {
  options.layer.mesh.setEnabled(options.visible);
}

// =============================================================================
// setGpuLayerOpacity
// =============================================================================

/**
 * Sets the opacity of a GPU tile layer.
 *
 * Updates both the plugin uniform (for per-pixel alpha) and the
 * mesh visibility property (for Babylon.js alpha sorting).
 *
 * @param options - The GPU layer and opacity value
 *
 * @example
 * ```typescript
 * setGpuLayerOpacity({ layer: gpuLayer, opacity: 0.5 });
 * ```
 */
export function setGpuLayerOpacity(options: SetGpuLayerOpacityOptions): void {
  const { layer, opacity } = options;
  layer.plugin.layerOpacity = opacity;
  layer.mesh.visibility = opacity;
}

// =============================================================================
// setGpuAnimationFrame
// =============================================================================

/**
 * Sets the animation frame for a GPU tile layer.
 *
 * The fragment shader uses this to cycle animated tiles:
 * `finalTileId = tileId + animBase + (uint(animationFrame) % animCount)`
 *
 * @param options - The GPU layer and frame index
 *
 * @example
 * ```typescript
 * setGpuAnimationFrame({ layer: gpuLayer, frame: 3 });
 * ```
 */
export function setGpuAnimationFrame(options: SetGpuAnimationFrameOptions): void {
  options.layer.plugin.animationFrame = options.frame;
}

// =============================================================================
// setGpuLayerTint
// =============================================================================

/**
 * Sets the tint color for a GPU tile layer.
 *
 * The shader multiplies tile colors by this tint. White (1,1,1,1) = no tint.
 *
 * @param options - The GPU layer and RGBA tint values
 *
 * @example
 * ```typescript
 * setGpuLayerTint({ layer: gpuLayer, r: 1, g: 0.8, b: 0.6, a: 1 });
 * ```
 */
export function setGpuLayerTint(options: SetGpuLayerTintOptions): void {
  const { layer, r, g, b, a } = options;
  layer.plugin.layerTint = new BABYLON.Color4(r, g, b, a);
}

// =============================================================================
// setGpuLayerBrightness
// =============================================================================

/**
 * Sets the brightness adjustment for a GPU tile layer.
 *
 * The shader adds this value to all color channels. 0 = no change.
 *
 * @param options - The GPU layer and brightness value
 *
 * @example
 * ```typescript
 * setGpuLayerBrightness({ layer: gpuLayer, brightness: 0.1 });
 * ```
 */
export function setGpuLayerBrightness(options: SetGpuLayerBrightnessOptions): void {
  options.layer.plugin.layerBrightness = options.brightness;
}

// =============================================================================
// setGpuLayerSaturation
// =============================================================================

/**
 * Sets the saturation for a GPU tile layer.
 *
 * 0 = grayscale, 1 = normal, >1 = oversaturated.
 *
 * @param options - The GPU layer and saturation value
 *
 * @example
 * ```typescript
 * setGpuLayerSaturation({ layer: gpuLayer, saturation: 0.5 });
 * ```
 */
export function setGpuLayerSaturation(options: SetGpuLayerSaturationOptions): void {
  options.layer.plugin.layerSaturation = options.saturation;
}

// =============================================================================
// setGpuLayerContrast
// =============================================================================

/**
 * Sets the contrast for a GPU tile layer.
 *
 * 0 = flat gray, 1 = normal, >1 = boosted contrast.
 *
 * @param options - The GPU layer and contrast value
 *
 * @example
 * ```typescript
 * setGpuLayerContrast({ layer: gpuLayer, contrast: 1.2 });
 * ```
 */
export function setGpuLayerContrast(options: SetGpuLayerContrastOptions): void {
  options.layer.plugin.layerContrast = options.contrast;
}

// =============================================================================
// setGpuLayerOffset
// =============================================================================

/**
 * Sets the UV offset for a GPU tile layer (parallax scrolling).
 *
 * @param options - The GPU layer and x/y offset values
 *
 * @example
 * ```typescript
 * setGpuLayerOffset({ layer: gpuLayer, x: 0.1, y: 0 });
 * ```
 */
export function setGpuLayerOffset(options: SetGpuLayerOffsetOptions): void {
  const { layer, x, y } = options;
  layer.plugin.layerOffset = new BABYLON.Vector2(x, y);
}

// =============================================================================
// updateGpuTile
// =============================================================================

/** Default visual flags value for non-empty tiles (opacity=15, all else off). */
const DEFAULT_FLAGS_VALUE: Num = 0xf0;

/**
 * Updates a single tile in the GPU layer's CPU-side data.
 *
 * Modifies the R (tile ID) and G (visual flags) channels at the
 * specified coordinates. Out-of-bounds coordinates are silently ignored.
 *
 * Note: After calling this function, the caller must upload the
 * updated data to the GPU via `dataTexture.update()`.
 *
 * @param options - The GPU layer, tile coordinates, new tile ID, and optional flags
 *
 * @example
 * ```typescript
 * updateGpuTile({ layer: gpuLayer, x: 5, y: 3, tileId: 42 });
 * gpuLayer.dataTexture.update(gpuLayer.layerData);
 * ```
 */
export function updateGpuTile(options: UpdateGpuTileOptions): void {
  const { layer, x, y, tileId, visualFlags } = options;

  // Bounds check
  if (x < 0 || y < 0 || x >= layer.mapWidth || y >= layer.mapHeight) return;

  const index: Num = y * layer.mapWidth + x;
  const offset: Num = index * 4;

  layer.layerData[offset] = tileId; // R = tile ID

  if (tileId === 0) {
    layer.layerData[offset + 1] = 0; // G = 0 for empty
  } else {
    layer.layerData[offset + 1] = visualFlags ?? DEFAULT_FLAGS_VALUE; // G = flags
  }

  layer.layerData[offset + 2] = 0; // B = reserved
  layer.layerData[offset + 3] = 0; // A = reserved
}

// =============================================================================
// updateGpuTileAutotile
// =============================================================================

/** 8-neighbor offsets: [dx, dy] pairs for N, NE, E, SE, S, SW, W, NW. */
const NEIGHBOR_OFFSETS: ReadonlyArray<readonly [Num, Num]> = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];

/**
 * Places an autotile and re-resolves the placed tile plus all 8 neighbors.
 *
 * When placing or removing an autotile, the neighbor context changes for
 * the placed tile and all adjacent tiles. This function:
 * 1. Resolves the autotile pattern for the placed tile
 * 2. Re-resolves each of the 8 neighbors (if they have the same tile ID)
 * 3. Updates the GPU layer data via {@link updateGpuTile} for each affected tile
 *
 * The resolved pattern index is stored as `patternIndex + 1` (1-based) so that
 * tile ID 0 remains the "empty" sentinel.
 *
 * For `autotileType: 'none'`, the tile is placed directly without neighbor analysis.
 *
 * @param options - GPU layer, position, tile ID, layer data for neighbor analysis, autotile type
 *
 * @example
 * ```typescript
 * updateGpuTileAutotile({
 *   layer: gpuLayer, x: 5, y: 3, tileId: 1,
 *   layerData: flatTileIdArray, autotileType: 'terrain_48',
 * });
 * gpuLayer.dataTexture.update(gpuLayer.layerData);
 * ```
 */
export function updateGpuTileAutotile(options: UpdateGpuTileAutotileOptions): void {
  const { layer, x, y, tileId, layerData, autotileType } = options;
  const { mapWidth, mapHeight } = layer;

  // For 'none' type, just place the tile directly
  if (autotileType === 'none') {
    updateGpuTile({ layer, x, y, tileId });
    return;
  }

  // Resolve and update the placed tile
  if (tileId === 0) {
    updateGpuTile({ layer, x, y, tileId: 0 });
  } else {
    const result = resolveAutotile({
      x,
      y,
      mapWidth,
      mapHeight,
      layerData: layerData as Num[],
      tileId,
      autotileType,
    });
    if (result.ok) {
      // Store as 1-based: pattern + 1 (so tile ID 0 = empty)
      updateGpuTile({ layer, x, y, tileId: result.data + 1 });
    }
  }

  // Re-resolve each of the 8 neighbors
  for (const [dx, dy] of NEIGHBOR_OFFSETS) {
    const nx: Num = x + dx;
    const ny: Num = y + dy;

    // Skip out-of-bounds
    if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) continue;

    const neighborIdx: Num = ny * mapWidth + nx;
    const neighborTileId: Num = layerData[neighborIdx] ?? 0;

    // Skip empty tiles — they don't need autotile resolution
    if (neighborTileId === 0) continue;

    const neighborResult = resolveAutotile({
      x: nx,
      y: ny,
      mapWidth,
      mapHeight,
      layerData: layerData as Num[],
      tileId: neighborTileId,
      autotileType,
    });
    if (neighborResult.ok) {
      updateGpuTile({ layer, x: nx, y: ny, tileId: neighborResult.data + 1 });
    }
  }
}
