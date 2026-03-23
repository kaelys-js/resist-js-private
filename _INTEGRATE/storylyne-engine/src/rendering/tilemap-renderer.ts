/**
 * Tilemap renderer — top-level orchestrator for MapData → scene pipeline.
 *
 * Validates MapData JSON, loads tilesets, creates materials, builds chunk
 * meshes per layer, generates cliff geometry, and sets up tile animation.
 * Returns a RenderedTilemap handle for disposal and live editing.
 *
 * @example
 * ```typescript
 * import { renderTilemap, disposeTilemap } from './tilemap-renderer';
 *
 * const result = renderTilemap({
 *   scene, mapDataInput: mapJson, assetBasePath: '/assets/',
 * });
 * if (result.ok) {
 *   // tilemap is live in the scene
 *   disposeTilemap({ tilemap: result.data }); // cleanup
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';
import * as BABYLON from '@babylonjs/core';

import { ERRORS, err, okUnchecked, type DeepReadonly } from '@/schemas/result/result';
import type { Bool, Num, Str } from '@/schemas/common';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import {
  ChunkConfigSchema,
  MAX_MAP_DIMENSION,
  MapDataSchema,
  type ChunkConfig,
  type MapData,
} from '../schemas/map-data';
import { loadTileset, type LoadedTileset } from './tileset-loader';
import { createTileMaterial } from './tile-material';
import { buildCliffChunk, type ChunkMesh } from './chunk-builder';
import {
  createGpuTileLayer,
  createGpuTileLayerUniform,
  disposeGpuTileLayer,
  setGpuLayerOpacity,
  setGpuLayerVisibility,
  updateGpuTile,
  type GpuTileLayer,
} from './gpu-tile-renderer';
import {
  createTileAnimator,
  disposeTileAnimator,
  type TileAnimationManager,
} from './tile-animator';
import { createLighting, disposeLighting, type LightingInstance } from './light-manager';
import {
  createPostProcessingPipeline,
  disposePostProcessingPipeline,
  type PostProcessingPipeline,
} from './post-processing';
import { resolvePostProcessingConfig } from './post-processing-presets';
import { createSky, createStarField, disposeSky, type SkyInstance } from './sky-system';
import { createParallax, disposeParallax, type ParallaxInstance } from './parallax-manager';
import {
  createStreamingManager,
  disposeStreamingManager,
  type StreamingManager,
} from './tile-streaming';
import {
  createObjectRenderer,
  disposeObjectRenderer,
  type ObjectInstanceRenderer,
} from './object-instance-renderer';
import {
  buildMegaAtlas,
  type MegaAtlasLayout,
  type TilesetEntry,
  type TilesetImageEntry,
} from './tile-mega-atlas';

// =============================================================================
// Schemas
// =============================================================================

/** A rendered tilemap with all meshes and resources. */
export const RenderedTilemapSchema = v.strictObject({
  /** Built chunk meshes (non-null only). */
  chunks: v.custom<ChunkMesh[]>((val): val is ChunkMesh[] => Array.isArray(val)),
  /** Cliff chunk meshes (non-null only). */
  cliffChunks: v.custom<ChunkMesh[]>((val): val is ChunkMesh[] => Array.isArray(val)),
  /** GPU-rendered tile layers (one per tile layer, replaces chunk meshes). */
  gpuLayers: v.custom<GpuTileLayer[]>((val): val is GpuTileLayer[] => Array.isArray(val)),
  /** Loaded tilesets. */
  tilesets: v.custom<LoadedTileset[]>((val): val is LoadedTileset[] => Array.isArray(val)),
  /** Materials per tileset (alpha-tested for decoration/upper layers). */
  materials: v.custom<BABYLON.StandardMaterial[]>((val): val is BABYLON.StandardMaterial[] =>
    Array.isArray(val),
  ),
  /** Opaque materials per tileset (for ground layers, no alpha testing). */
  opaqueMaterials: v.custom<BABYLON.StandardMaterial[]>((val): val is BABYLON.StandardMaterial[] =>
    Array.isArray(val),
  ),
  /** Tile animation manager. */
  animator: v.custom<TileAnimationManager>(
    (val): val is TileAnimationManager => typeof val === 'object',
  ),
  /** Validated map data (readonly from safeParse). */
  mapData: v.custom<DeepReadonly<MapData>>(
    (val): val is DeepReadonly<MapData> => typeof val === 'object',
  ),
  /** Chunk configuration (readonly from safeParse). */
  chunkConfig: v.custom<DeepReadonly<ChunkConfig>>(
    (val): val is DeepReadonly<ChunkConfig> => typeof val === 'object',
  ),
  /** Post-processing pipeline (null if not configured). */
  postProcessing: v.custom<PostProcessingPipeline | null>(
    (val): val is PostProcessingPipeline | null => val === null || typeof val === 'object',
  ),
  /** Lighting system instance (null if not configured). */
  lighting: v.custom<LightingInstance | null>(
    (val): val is LightingInstance | null => val === null || typeof val === 'object',
  ),
  /** Sky system instance (null if not configured). */
  sky: v.custom<SkyInstance | null>(
    (val): val is SkyInstance | null => val === null || typeof val === 'object',
  ),
  /** Parallax background instance (null if not configured). */
  parallax: v.custom<ParallaxInstance | null>(
    (val): val is ParallaxInstance | null => val === null || typeof val === 'object',
  ),
  /** Opaque fill plane behind all tile layers (blocks parallax bleed-through). */
  groundFill: v.nullable(
    v.custom<BABYLON.Mesh>((val): val is BABYLON.Mesh => val instanceof BABYLON.Mesh),
  ),
  /** Mega-atlas layout for multi-tileset maps (null for single-tileset). */
  megaAtlas: v.nullable(
    v.custom<MegaAtlasLayout>((val): val is MegaAtlasLayout => typeof val === 'object'),
  ),
  /** Streaming manager for large maps (null for maps ≤16384). */
  streamingManager: v.nullable(
    v.custom<StreamingManager>((val): val is StreamingManager => typeof val === 'object'),
  ),
  /** Object instance renderer (null if no object layers). */
  objectRenderer: v.nullable(
    v.custom<ObjectInstanceRenderer>(
      (val): val is ObjectInstanceRenderer => typeof val === 'object',
    ),
  ),
  /** The Babylon.js scene. */
  scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
});

/** A rendered tilemap. */
export type RenderedTilemap = v.InferOutput<typeof RenderedTilemapSchema>;

/** Options schema for {@link renderTilemap}. */
export const RenderTilemapOptionsSchema = v.strictObject({
  /** The Babylon.js scene. */
  scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
  /** Raw MapData input (validated internally). */
  mapDataInput: v.unknown(),
  /** Base path for resolving tileset image paths. */
  assetBasePath: v.string(),
  /** Optional chunk configuration (validated internally). */
  chunkConfig: v.optional(v.unknown()),
});

/** Options for {@link renderTilemap}. */
export type RenderTilemapOptions = v.InferOutput<typeof RenderTilemapOptionsSchema>;

/** Options schema for {@link disposeTilemap}. */
export const DisposeTilemapOptionsSchema = v.strictObject({
  /** The tilemap to dispose. */
  tilemap: v.custom<RenderedTilemap>((val): val is RenderedTilemap => typeof val === 'object'),
});

/** Options for {@link disposeTilemap}. */
export type DisposeTilemapOptions = v.InferOutput<typeof DisposeTilemapOptionsSchema>;

/** Options schema for {@link updateTile}. */
export const UpdateTileOptionsSchema = v.strictObject({
  /** The tilemap to update. */
  tilemap: v.custom<RenderedTilemap>((val): val is RenderedTilemap => typeof val === 'object'),
  /** Layer index to update. */
  layerIndex: v.number(),
  /** Tile X position. */
  x: v.number(),
  /** Tile Z position. */
  z: v.number(),
  /** New tile ID to place. */
  newTileId: v.number(),
});

/** Options for {@link updateTile}. */
export type UpdateTileOptions = v.InferOutput<typeof UpdateTileOptionsSchema>;

// =============================================================================
// renderTilemap
// =============================================================================

/**
 * Renders a tilemap from raw MapData JSON into the Babylon.js scene.
 *
 * Validates input, loads tilesets, creates materials, builds chunk meshes
 * per layer, generates cliff geometry, and sets up tile animation.
 *
 * @param options - Scene, raw MapData, asset base path, and optional chunk config
 * @returns BabylonResult containing the rendered tilemap handle
 *
 * @example
 * ```typescript
 * const result = renderTilemap({
 *   scene, mapDataInput: mapJson, assetBasePath: '/assets/',
 * });
 * if (result.ok) result.data.chunks; // ChunkMesh[]
 * ```
 */
export function renderTilemap(options: RenderTilemapOptions): BabylonResult<RenderedTilemap> {
  const { scene, mapDataInput, assetBasePath, chunkConfig: chunkConfigInput } = options;

  try {
    // 1. Validate MapData
    const mapResult = safeParse(MapDataSchema, mapDataInput);
    if (!mapResult.ok) return mapResult;
    const mapData = mapResult.data;

    // 2. Validate ChunkConfig
    const chunkResult = safeParse(ChunkConfigSchema, chunkConfigInput ?? {});
    if (!chunkResult.ok) return chunkResult;
    const chunkConfig = chunkResult.data;

    // 3. Cross-field: layer.data.length === width * height (tile layers only)
    const expectedLength: Num = mapData.width * mapData.height;
    for (const layer of mapData.layers) {
      if (layer.kind === 'tile' && layer.data.length !== expectedLength) {
        return err(
          ERRORS.VALIDATION.SCHEMA_FAILED,
          `Layer "${layer.name}" data length ${layer.data.length} does not match map size ${expectedLength}`,
        );
      }
    }

    // 4. Cross-field: heightMap length
    if (mapData.heightMap && mapData.heightMap.length !== expectedLength) {
      return err(
        ERRORS.VALIDATION.SCHEMA_FAILED,
        `heightMap length ${mapData.heightMap.length} does not match map size ${expectedLength}`,
      );
    }

    // 5. Load all tilesets
    const tilesets: LoadedTileset[] = [];
    for (const tilesetConfig of mapData.tilesets) {
      const loadResult = loadTileset({
        scene,
        config: tilesetConfig,
        basePath: assetBasePath as Str,
      });
      if (!loadResult.ok) return loadResult;
      tilesets.push(loadResult.data);
    }

    // 6. Create materials per tileset
    const materials: BABYLON.StandardMaterial[] = [];
    for (const tileset of tilesets) {
      const matResult = createTileMaterial({
        scene,
        name: `mat-${tileset.config.name}` as Str,
        texture: tileset.texture,
        hasAlpha: true as Bool,
      });
      if (!matResult.ok) return matResult;
      materials.push(matResult.data);
    }

    // 6b. Create opaque materials for ground layers.
    // Ground tiles are fully opaque — disabling alpha testing prevents
    // parallax backgrounds from bleeding through at tile edges.
    const opaqueMaterials: BABYLON.StandardMaterial[] = [];
    for (const tileset of tilesets) {
      const opaqueMatResult = createTileMaterial({
        scene,
        name: `mat-opaque-${tileset.config.name}` as Str,
        texture: tileset.texture,
        hasAlpha: false as Bool,
      });
      if (!opaqueMatResult.ok) return opaqueMatResult;
      opaqueMatResult.data.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
      opaqueMaterials.push(opaqueMatResult.data);
    }

    // 7. Calculate chunk grid
    // oxlint-disable-next-line prefer-destructuring
    const chunkSize: Num = chunkConfig.chunkSize;
    const chunksX: Num = Math.ceil(mapData.width / chunkSize);
    const chunksZ: Num = Math.ceil(mapData.height / chunkSize);

    // 8. Build context
    const buildContext = {
      scene,
      mapData,
      loadedTilesets: tilesets as readonly LoadedTileset[],
      materials: materials as readonly BABYLON.StandardMaterial[],
      tileWorldSize: 1 as Num,
      tileWorldHeight: 0.5 as Num,
      chunkSize,
    };

    // 9. Create GPU tile layers or streaming manager based on map size
    const gpuLayers: GpuTileLayer[] = [];
    // oxlint-disable-next-line prefer-const -- reassigned conditionally at line ~378
    let streamingManager: StreamingManager | null = null;
    const megaAtlas: MegaAtlasLayout | null = null;
    const needsStreaming: Bool =
      mapData.width > MAX_MAP_DIMENSION || mapData.height > MAX_MAP_DIMENSION;

    // oxlint-disable-next-line prefer-destructuring
    const primaryTileset: LoadedTileset | undefined = tilesets[0];

    // Compute atlas grid from primary tileset's effective tile layout.
    // Handles autotile expansion (e.g., terrain_48 compact 2×3 → 8×6 effective).
    //
    // NOTE: calculateMegaAtlasLayout computes grid dimensions for a composited
    // mega-atlas texture (built by buildMegaAtlas). That composited texture is
    // not created here — we use the primary tileset's texture directly. Using
    // mega-atlas grid dimensions (e.g., 32×32) with the primary tileset's texture
    // (e.g., 8×6 at 32px tiles) causes a grid/texture mismatch that makes the
    // shader sample the wrong UV region for every tile.
    //
    // oxlint-disable-next-line no-warning-comments -- Intentional tracking issue
    // TODO: Implement async mega-atlas texture compositing for proper multi-tileset
    // support. Until then, multi-tileset maps fall back to the primary tileset.
    const isCompactAutotile: boolean = primaryTileset
      ? primaryTileset.config.autotileType === 'terrain_48' &&
        primaryTileset.config.columns === 2 &&
        primaryTileset.config.rows === 3
      : false;
    const atlasGridColumns: Num = isCompactAutotile ? 8 : (primaryTileset?.config.columns ?? 1);
    const atlasGridRows: Num = isCompactAutotile ? 6 : (primaryTileset?.config.rows ?? 1);
    const atlasTexture: BABYLON.Texture | undefined = primaryTileset?.texture;
    const tilePixelWidth: Num = primaryTileset?.config.tileWidth ?? 32;
    const tilePixelHeight: Num = primaryTileset?.config.tileHeight ?? 32;
    const maxLocalTileId: Num = atlasGridColumns * atlasGridRows;

    /**
     * Remap global tile IDs to atlas-local IDs using firstGid subtraction.
     *
     * @param data - Array of global tile IDs to remap
     * @returns Array of atlas-local tile IDs
     */
    const remapGlobalIds = (data: readonly Num[]): Num[] => {
      const firstGid: Num = primaryTileset?.config.firstGid ?? 1;
      return data.map((gid: Num) => {
        if (gid === 0) return 0;
        const localId: Num = gid - firstGid + 1;
        // Clamp to valid range for the primary tileset's atlas
        return localId >= 1 && localId <= maxLocalTileId ? localId : 0;
      });
    };

    if (atlasTexture && needsStreaming) {
      // System 2: Region-based streaming for maps > 16384
      // oxlint-disable-next-line prefer-destructuring
      const firstTileLayer = mapData.layers.find((l) => l.kind === 'tile');
      const tileData: Num[] = firstTileLayer ? remapGlobalIds(firstTileLayer.data) : [];

      const streamResult = createStreamingManager({
        scene,
        mapWidth: mapData.width,
        mapHeight: mapData.height,
        tileData,
        config: {
          regionSize: 2048,
          maxLoadedRegions: 16,
          loadRadius: 1,
          unloadDistance: 3,
        },
        atlasTexture,
        tilePixelWidth,
        tilePixelHeight,
        tileWorldSize: 1,
      });
      if (!streamResult.ok) return streamResult;
      streamingManager = streamResult.data;
    } else if (atlasTexture) {
      // System 1: Single data texture per layer (maps ≤ 16384)
      for (let layerIndex: Num = 0; layerIndex < mapData.layers.length; layerIndex++) {
        const layer = mapData.layers[layerIndex];
        if (!layer || layer.kind !== 'tile') continue;

        // Remap global tile IDs to atlas-local via mega-atlas or firstGid
        const atlasIds: Num[] = remapGlobalIds(layer.data);

        const gpuResult = createGpuTileLayer({
          scene,
          layerName: layer.name,
          layerIndex,
          mapWidth: mapData.width,
          mapHeight: mapData.height,
          tileIds: atlasIds,
          atlasTexture,
          tilePixelWidth,
          tilePixelHeight,
          tileWorldSize: 1,
          heightY: layerIndex * 0.01,
        });
        if (!gpuResult.ok) return gpuResult;
        gpuLayers.push(gpuResult.data);
      }
    }

    // Chunk meshes (empty — tile layers use GPU data-texture path)
    const chunks: ChunkMesh[] = [];

    // 10. Build cliff chunks if heightMap exists
    const cliffChunks: ChunkMesh[] = [];
    if (mapData.heightMap) {
      for (let cz: Num = 0; cz < chunksZ; cz++) {
        for (let cx: Num = 0; cx < chunksX; cx++) {
          const cliffResult = buildCliffChunk({
            context: buildContext,
            chunkX: cx,
            chunkZ: cz,
          });
          if (!cliffResult.ok) return cliffResult;
          if (cliffResult.data) {
            cliffChunks.push(cliffResult.data);
          }
        }
      }
    }

    // 10b. Set renderingGroupId = 2 on tilemap meshes so parallax
    // (group 1) renders behind them and sky (group 0) behind both.
    // Disable auto depth/stencil clear for group 2 so depth testing
    // remains continuous from earlier groups.
    scene.setRenderingAutoClearDepthStencil(2, false, false, false);
    for (const gpuLayer of gpuLayers) {
      gpuLayer.mesh.renderingGroupId = 2;
    }
    for (const cliff of cliffChunks) {
      cliff.mesh.renderingGroupId = 2;
    }

    // 10c. Create an opaque fill plane behind all tile layers.
    // This blocks parallax Layer.render() full-screen composites from
    // bleeding through alpha-tested tile edges and empty tile gaps.
    const tileWorldSize: Num = 1;
    const fillWidth: Num = mapData.width * tileWorldSize;
    const fillDepth: Num = mapData.height * tileWorldSize;
    const groundFill: BABYLON.Mesh = BABYLON.MeshBuilder.CreateGround(
      'tilemap-ground-fill',
      { width: fillWidth, height: fillDepth },
      scene,
    );
    groundFill.position.x = fillWidth / 2;
    groundFill.position.z = fillDepth / 2;
    groundFill.position.y = -0.01;
    groundFill.renderingGroupId = 2;
    groundFill.receiveShadows = true;
    const fillMat: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(
      'ground-fill-mat',
      scene,
    );
    fillMat.diffuseColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    fillMat.specularColor = new BABYLON.Color3(0, 0, 0);
    fillMat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
    groundFill.material = fillMat;

    // 11. Create tile animation manager
    const animResult = createTileAnimator({ scene });
    if (!animResult.ok) return animResult;

    // 12. Create post-processing pipeline (non-fatal on failure)
    let postProcessing: PostProcessingPipeline | null = null;
    if (mapData.postProcessing) {
      const resolvedResult = resolvePostProcessingConfig(mapData.postProcessing);
      if (resolvedResult.ok) {
        // oxlint-disable-next-line prefer-destructuring
        const { cameras } = scene;
        if (cameras.length > 0) {
          const ppResult = createPostProcessingPipeline({
            scene,
            cameras,
            config: resolvedResult.data,
          });
          if (ppResult.ok) {
            postProcessing = ppResult.data;
          }
        }
      }
    }

    // 13. Create lighting system (non-fatal on failure)
    let lighting: LightingInstance | null = null;
    if (mapData.lighting) {
      const lightingResult = createLighting({
        scene,
        config: mapData.lighting,
      });
      if (lightingResult.ok) {
        lighting = lightingResult.data;
      }
    }

    // 14. Create sky system (non-fatal on failure)
    let sky: SkyInstance | null = null;
    if (mapData.sky) {
      const skyResult = createSky({ scene, config: mapData.sky });
      if (skyResult.ok) {
        sky = skyResult.data;

        // 14b. Create star field if stars are enabled
        if (mapData.sky.stars?.enabled && sky) {
          const starResult = createStarField({
            sky,
            config: {
              texture: mapData.sky.stars.texture,
              opacity: mapData.sky.stars.opacity,
              twinkleSpeed: mapData.sky.stars.twinkleSpeed,
              fadeInTime: mapData.sky.stars.fadeInTime,
              fadeOutTime: mapData.sky.stars.fadeOutTime,
              scale: mapData.sky.stars.scale,
            },
            assetBasePath,
            getTimeOfDay: () => lighting?.dayNightCycle?.timeOfDay ?? 12,
          });
          if (starResult.ok) {
            sky = starResult.data;
          }
        }
      }
    }

    // 15. Create parallax backgrounds (non-fatal on failure)
    let parallax: ParallaxInstance | null = null;
    if (mapData.sky?.parallaxLayers && mapData.sky.parallaxLayers.length > 0) {
      // Spread to strip DeepReadonly — createParallax stores mutable layer
      // configs that the dev harness can mutate at runtime (scroll speed, etc).
      const mutableLayers = mapData.sky.parallaxLayers.map((l) => ({ ...l }));
      const parallaxResult = createParallax({
        scene,
        layers: mutableLayers,
        assetBasePath,
      });
      if (parallaxResult.ok) {
        parallax = parallaxResult.data;
      }
    }

    // 15b. Create object instance renderer for object layers (non-fatal on failure)
    let objectRenderer: ObjectInstanceRenderer | null = null;
    const objectInstances: Array<{
      readonly id: string;
      readonly meshType: string;
      readonly position: readonly [number, number, number];
    }> = [];
    const tileW: Num = mapData.tileWidth;
    const tileH: Num = mapData.tileHeight;
    for (const layer of mapData.layers) {
      if (layer.kind === 'object') {
        for (const obj of layer.objects) {
          // MapObject uses pixel coords; convert to tile-world space (1 unit = 1 tile)
          // class → meshType; x/tileW → world X; y/tileH → world Z; Y = 0 (ground)
          const meshType: Str = (obj.class || obj.name || 'default') as Str;
          objectInstances.push({
            id: obj.id,
            meshType,
            position: [obj.x / tileW, 0, obj.y / tileH],
          });
        }
      }
    }
    if (objectInstances.length > 0) {
      const objResult = createObjectRenderer({
        scene,
        instances: objectInstances,
        worldBounds: {
          minX: 0,
          minZ: 0,
          maxX: mapData.width * tileWorldSize,
          maxZ: mapData.height * tileWorldSize,
        },
      });
      if (objResult.ok) {
        objectRenderer = objResult.data;
      }
    }

    // 16. Return RenderedTilemap
    const rendered: RenderedTilemap = {
      chunks,
      cliffChunks,
      gpuLayers,
      tilesets,
      materials,
      opaqueMaterials,
      animator: animResult.data,
      mapData,
      chunkConfig,
      postProcessing,
      lighting,
      sky,
      parallax,
      megaAtlas,
      streamingManager,
      objectRenderer,
      groundFill,
      scene,
    };

    return okShallow(rendered);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// renderBlankTilemap
// =============================================================================

/** Options for {@link renderBlankTilemap}. */
type RenderBlankTilemapOptions = {
  /** The Babylon.js scene. */
  readonly scene: BABYLON.Scene;
  /** Map width in tiles. */
  readonly width: Num;
  /** Map height in tiles. */
  readonly height: Num;
  /** Base path for loading tileset images. */
  readonly assetBasePath: Str;
  /** Tileset configs to load (same as MapData.tilesets). */
  readonly tilesets: MapData['tilesets'];
  /** Layer definitions: name, type, and the uniform fill tile ID. */
  readonly layers: ReadonlyArray<{
    readonly name: Str;
    readonly type: Str;
    readonly fillTileId: Num;
    readonly opacity: Num;
  }>;
  /** Optional post-processing config. */
  readonly postProcessing?: MapData['postProcessing'];
  /** Optional lighting config. */
  readonly lighting?: MapData['lighting'];
};

/**
 * Creates a rendered tilemap where every tile in each layer has a uniform ID.
 *
 * Optimized fast path for blank/uniform maps used by the dev harness. Avoids
 * creating huge JS tile data arrays, schema validation of per-tile data, and
 * intermediate remap copies. Directly creates GPU data textures via
 * {@link createGpuTileLayerUniform}.
 *
 * @param options - Scene, dimensions, tilesets, layer fill definitions.
 * @returns Result containing the rendered tilemap.
 *
 * @example
 * ```typescript
 * const result = renderBlankTilemap({
 *   scene, width: 3000, height: 3000, assetBasePath: '/',
 *   tilesets: [...], layers: [{ name: 'ground', type: 'ground', fillTileId: 1, opacity: 1 }],
 * });
 * ```
 */
export function renderBlankTilemap(
  options: RenderBlankTilemapOptions,
): BabylonResult<RenderedTilemap> {
  const { scene, width, height, assetBasePath, layers, postProcessing, lighting } = options;

  try {
    // 1. Load tilesets (same as renderTilemap)
    const tilesets: LoadedTileset[] = [];
    for (const tilesetConfig of options.tilesets) {
      const loadResult = loadTileset({
        scene,
        config: tilesetConfig,
        basePath: assetBasePath,
      });
      if (!loadResult.ok) return loadResult;
      tilesets.push(loadResult.data);
    }

    // 2. Create materials (same as renderTilemap)
    const materials: BABYLON.StandardMaterial[] = [];
    for (const tileset of tilesets) {
      const matResult = createTileMaterial({
        scene,
        name: `mat-${tileset.config.name}` as Str,
        texture: tileset.texture,
        hasAlpha: true as Bool,
      });
      if (!matResult.ok) return matResult;
      materials.push(matResult.data);
    }

    const opaqueMaterials: BABYLON.StandardMaterial[] = [];
    for (const tileset of tilesets) {
      const opaqueMatResult = createTileMaterial({
        scene,
        name: `mat-opaque-${tileset.config.name}` as Str,
        texture: tileset.texture,
        hasAlpha: false as Bool,
      });
      if (!opaqueMatResult.ok) return opaqueMatResult;
      opaqueMatResult.data.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
      opaqueMaterials.push(opaqueMatResult.data);
    }

    // 3. Resolve atlas grid from primary tileset
    // oxlint-disable-next-line prefer-destructuring
    const primaryTileset: LoadedTileset | undefined = tilesets[0];
    const isCompactAutotile: boolean = primaryTileset
      ? primaryTileset.config.autotileType === 'terrain_48' &&
        primaryTileset.config.columns === 2 &&
        primaryTileset.config.rows === 3
      : false;
    const atlasGridColumns: Num = isCompactAutotile ? 8 : (primaryTileset?.config.columns ?? 1);
    const atlasGridRows: Num = isCompactAutotile ? 6 : (primaryTileset?.config.rows ?? 1);
    const maxLocalTileId: Num = atlasGridColumns * atlasGridRows;
    const firstGid: Num = primaryTileset?.config.firstGid ?? 1;
    const atlasTexture: BABYLON.Texture | undefined = primaryTileset?.texture;
    const tilePixelWidth: Num = primaryTileset?.config.tileWidth ?? 32;
    const tilePixelHeight: Num = primaryTileset?.config.tileHeight ?? 32;

    // 4. Create GPU layers with uniform fill
    const gpuLayers: GpuTileLayer[] = [];
    for (let i: Num = 0; i < layers.length; i++) {
      const layerDef = layers[i];
      if (!layerDef) continue;

      // Remap fill tile ID: global → atlas-local (same logic as remapGlobalIds)
      let localFillId: Num = 0;
      if (layerDef.fillTileId !== 0) {
        const localId: Num = layerDef.fillTileId - firstGid + 1;
        localFillId = localId >= 1 && localId <= maxLocalTileId ? localId : 0;
      }

      const gpuResult = createGpuTileLayerUniform({
        scene,
        layerName: layerDef.name,
        layerIndex: i as Num,
        mapWidth: width,
        mapHeight: height,
        fillTileId: localFillId,
        atlasTexture: atlasTexture ?? null,
        tilePixelWidth,
        tilePixelHeight,
        tileWorldSize: 1 as Num,
        heightY: (i * 0.01) as Num,
      });
      if (!gpuResult.ok) return gpuResult;
      gpuLayers.push(gpuResult.data);
    }

    // 5. Set rendering group on GPU layers
    scene.setRenderingAutoClearDepthStencil(2, false, false, false);
    for (const gpuLayer of gpuLayers) {
      gpuLayer.mesh.renderingGroupId = 2;
    }

    // 6. Ground fill plane
    const tileWorldSize: Num = 1;
    const fillWidth: Num = width * tileWorldSize;
    const fillDepth: Num = height * tileWorldSize;
    const groundFill: BABYLON.Mesh = BABYLON.MeshBuilder.CreateGround(
      'tilemap-ground-fill',
      { width: fillWidth, height: fillDepth },
      scene,
    );
    groundFill.position.x = fillWidth / 2;
    groundFill.position.z = fillDepth / 2;
    groundFill.position.y = -0.01;
    groundFill.renderingGroupId = 2;
    groundFill.receiveShadows = true;
    const fillMat: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(
      'ground-fill-mat',
      scene,
    );
    fillMat.diffuseColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    fillMat.specularColor = new BABYLON.Color3(0, 0, 0);
    fillMat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
    groundFill.material = fillMat;

    // 7. Tile animator
    const animResult = createTileAnimator({ scene });
    if (!animResult.ok) return animResult;

    // 8. Post-processing (non-fatal)
    let pp: PostProcessingPipeline | null = null;
    if (postProcessing) {
      const resolvedResult = resolvePostProcessingConfig(postProcessing);
      if (resolvedResult.ok) {
        const { cameras } = scene;
        if (cameras.length > 0) {
          const ppResult = createPostProcessingPipeline({
            scene,
            cameras,
            config: resolvedResult.data,
          });
          if (ppResult.ok) pp = ppResult.data;
        }
      }
    }

    // 9. Lighting (non-fatal)
    let lightingInstance: LightingInstance | null = null;
    if (lighting) {
      const lightingResult = createLighting({ scene, config: lighting });
      if (lightingResult.ok) lightingInstance = lightingResult.data;
    }

    // 10. Build a minimal MapData for the RenderedTilemap.mapData field.
    // Use small 1-element placeholder arrays — only the structure matters,
    // tile data lives in the GPU data textures.
    const minimalLayers = layers.map((l) => ({
      kind: 'tile' as const,
      name: l.name,
      type: l.type,
      data: [l.fillTileId] as readonly Num[],
      visible: true as Bool,
      opacity: l.opacity,
    }));
    const mapData = {
      width,
      height,
      tileWidth: tilePixelWidth,
      tileHeight: tilePixelHeight,
      tilesets: options.tilesets,
      layers: minimalLayers,
    } as unknown as DeepReadonly<MapData>;

    const chunkResult = safeParse(ChunkConfigSchema, {});
    if (!chunkResult.ok) return chunkResult;

    const rendered: RenderedTilemap = {
      chunks: [],
      cliffChunks: [],
      gpuLayers,
      tilesets,
      materials,
      opaqueMaterials,
      animator: animResult.data,
      mapData,
      chunkConfig: chunkResult.data,
      postProcessing: pp,
      lighting: lightingInstance,
      sky: null,
      parallax: null,
      megaAtlas: null,
      streamingManager: null,
      objectRenderer: null,
      groundFill,
      scene,
    };

    return okShallow(rendered);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// disposeTilemap
// =============================================================================

/**
 * Disposes all resources for a rendered tilemap.
 *
 * Disposes all chunk meshes, cliff meshes, materials, textures,
 * and the tile animation manager.
 *
 * @param options - The tilemap to dispose
 * @returns BabylonResult indicating success
 *
 * @example
 * ```typescript
 * disposeTilemap({ tilemap: renderedTilemap });
 * ```
 */
export function disposeTilemap(options: DisposeTilemapOptions): BabylonResult<Bool> {
  const { tilemap } = options;

  try {
    // Dispose parallax backgrounds
    if (tilemap.parallax) {
      disposeParallax({ parallax: tilemap.parallax });
    }

    // Dispose sky system
    if (tilemap.sky) {
      disposeSky({ sky: tilemap.sky });
    }

    // Dispose lighting system (before meshes — lighting references scene objects)
    if (tilemap.lighting) {
      disposeLighting({ lighting: tilemap.lighting });
    }

    // Dispose chunk meshes
    for (const chunk of tilemap.chunks) {
      chunk.mesh.dispose();
    }

    // Dispose GPU tile layers
    for (const gpuLayer of tilemap.gpuLayers) {
      disposeGpuTileLayer({ layer: gpuLayer });
    }

    // Dispose streaming manager
    if (tilemap.streamingManager) {
      disposeStreamingManager({ manager: tilemap.streamingManager });
    }

    // Dispose object renderer
    if (tilemap.objectRenderer) {
      disposeObjectRenderer({ renderer: tilemap.objectRenderer });
    }

    // Dispose cliff meshes
    for (const cliff of tilemap.cliffChunks) {
      cliff.mesh.dispose();
    }

    // Dispose ground fill plane
    if (tilemap.groundFill) {
      tilemap.groundFill.material?.dispose();
      tilemap.groundFill.dispose();
    }

    // Dispose post-processing pipeline
    if (tilemap.postProcessing) {
      disposePostProcessingPipeline({ pipeline: tilemap.postProcessing });
    }

    // Dispose animator
    disposeTileAnimator({ animator: tilemap.animator });

    // Dispose materials
    for (const material of tilemap.materials) {
      material.dispose();
    }

    // Dispose opaque materials
    for (const material of tilemap.opaqueMaterials) {
      material.dispose();
    }

    // Dispose textures
    for (const tileset of tilemap.tilesets) {
      tileset.texture.dispose();
    }

    return okShallow(true as Bool);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// updateTile
// =============================================================================

/**
 * Updates a single tile via GPU data-texture patch.
 *
 * Updates the GPU data texture in-place (~0.01ms) and keeps the
 * CPU-side mapData in sync. No chunk rebuild is needed.
 *
 * @param options - Tilemap, layer index, tile position, and new tile ID
 * @returns BabylonResult containing the updated tilemap
 *
 * @example
 * ```typescript
 * const result = updateTile({
 *   tilemap, layerIndex: 0, x: 5, z: 3, newTileId: 7,
 * });
 * if (result.ok) result.data; // updated RenderedTilemap
 * ```
 */
export function updateTile(options: UpdateTileOptions): BabylonResult<RenderedTilemap> {
  const { tilemap, layerIndex, x, z, newTileId } = options;

  try {
    const { mapData } = tilemap;
    const layer = mapData.layers[layerIndex];
    if (!layer) {
      return err(ERRORS.VALIDATION.SCHEMA_FAILED, 'Invalid layer index');
    }
    if (layer.kind !== 'tile') {
      return err(ERRORS.VALIDATION.SCHEMA_FAILED, 'Cannot update tiles on a non-tile layer');
    }

    // GPU path: update data texture directly (~0.01ms vs ~2ms for chunk rebuild)
    const gpuLayer: GpuTileLayer | undefined = tilemap.gpuLayers.find(
      (l) => l.layerIndex === layerIndex,
    );
    if (gpuLayer) {
      // Remap global ID → atlas-local via mega-atlas or firstGid
      let atlasLocalId: Num;
      if (tilemap.megaAtlas) {
        atlasLocalId = newTileId === 0 ? 0 : (tilemap.megaAtlas.remapTable.get(newTileId) ?? 0);
      } else {
        // oxlint-disable-next-line prefer-destructuring
        const tileset: LoadedTileset | undefined = tilemap.tilesets[0];
        const firstGid: Num = tileset?.config.firstGid ?? 1;
        atlasLocalId = newTileId === 0 ? 0 : newTileId - firstGid + 1;
      }

      updateGpuTile({
        layer: gpuLayer,
        x,
        y: z,
        tileId: atlasLocalId,
      });
      gpuLayer.dataTexture.update(gpuLayer.layerData);
    }

    // Update streaming manager's CPU tile data if active
    if (tilemap.streamingManager) {
      let atlasLocalId: Num;
      if (tilemap.megaAtlas) {
        atlasLocalId = newTileId === 0 ? 0 : (tilemap.megaAtlas.remapTable.get(newTileId) ?? 0);
      } else {
        // oxlint-disable-next-line prefer-destructuring
        const tileset: LoadedTileset | undefined = tilemap.tilesets[0];
        const firstGid: Num = tileset?.config.firstGid ?? 1;
        atlasLocalId = newTileId === 0 ? 0 : newTileId - firstGid + 1;
      }
      tilemap.streamingManager.tileData[z * mapData.width + x] = atlasLocalId;
    }

    // Update CPU-side map data for consistency
    const mutableData: Num[] = [...layer.data];
    mutableData[z * mapData.width + x] = newTileId;

    const updatedLayers = mapData.layers.map((l, i) => {
      if (i === layerIndex) {
        return { ...l, data: mutableData };
      }
      return l;
    });

    const updatedMapData: DeepReadonly<MapData> = { ...mapData, layers: updatedLayers };

    const updatedTilemap: RenderedTilemap = {
      ...tilemap,
      mapData: updatedMapData,
    };

    return okShallow(updatedTilemap);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// applyMegaAtlas
// =============================================================================

/**
 * Builds a mega-atlas combining all tileset images into one texture,
 * then remaps every GPU layer's data texture to use mega-atlas-local IDs.
 *
 * Call this after {@link renderTilemap} to enable correct multi-tileset
 * rendering. The initial render uses only the primary tileset; this
 * function upgrades it to a composited mega-atlas that includes all
 * tilesets, so tiles from any tileset render correctly.
 *
 * @param options - The rendered tilemap to upgrade
 * @returns Promise resolving to the updated RenderedTilemap with megaAtlas set
 *
 * @example
 * ```typescript
 * const renderResult = renderTilemap({ scene, mapDataInput, assetBasePath });
 * if (!renderResult.ok) return renderResult;
 * const megaResult = await applyMegaAtlas({ tilemap: renderResult.data });
 * if (megaResult.ok) debug.tilemap = megaResult.data;
 * ```
 */
export async function applyMegaAtlas(options: {
  readonly tilemap: RenderedTilemap;
}): Promise<BabylonResult<RenderedTilemap>> {
  const { tilemap } = options;
  const { tilesets, gpuLayers, mapData, scene } = tilemap;

  if (tilesets.length === 0 || gpuLayers.length === 0) {
    return okShallow(tilemap);
  }

  try {
    // 1. Wait for all tileset textures to be ready
    await Promise.all(
      tilesets.map(
        (ts) =>
          new Promise<void>((resolve) => {
            if (ts.texture.isReady()) {
              resolve();
            } else {
              ts.texture.onLoadObservable.addOnce(() => resolve());
            }
          }),
      ),
    );

    // 2. Build TilesetEntry array with effective dimensions (handling autotile expansion)
    const entries: TilesetEntry[] = tilesets.map((ts, i): TilesetEntry => {
      const isCompactAutotile: boolean =
        ts.config.autotileType === 'terrain_48' && ts.config.columns === 2 && ts.config.rows === 3;
      return {
        tilesetIndex: i,
        columns: isCompactAutotile ? 8 : ts.config.columns,
        rows: isCompactAutotile ? 6 : ts.config.rows,
        tileWidth: ts.config.tileWidth,
        tileHeight: ts.config.tileHeight,
        firstGid: ts.config.firstGid,
      };
    });

    // 3. Load tileset images from URLs (browser-cached from initial texture load)
    const images: HTMLImageElement[] = await Promise.all(
      tilesets.map(
        (ts) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img: HTMLImageElement = document.createElement('img');
            img.crossOrigin = 'anonymous';
            img.addEventListener('load', (): void => resolve(img));
            img.addEventListener('error', (): void =>
              reject(new Error(`Failed to load tileset image: ${ts.config.imagePath}`)),
            );
            img.src = ts.texture.url ?? '';
          }),
      ),
    );

    // 4. Build mega-atlas texture
    const tilesetImageEntries: TilesetImageEntry[] = entries.map(
      (entry, i): TilesetImageEntry => ({
        entry,
        image: images[i] as CanvasImageSource,
      }),
    );

    const megaResult = buildMegaAtlas({ scene, tilesets: tilesetImageEntries });
    if (!megaResult.ok) return megaResult;

    const { texture: megaTexture, layout: megaLayout } = megaResult.data;

    // 5. Remap all GPU layer data textures using the mega-atlas remap table.
    // The GPU R channel already has RESOLVED autotile local IDs (1-48 for terrain_48)
    // from the initial render. We must read those (not the raw map GIDs) and convert
    // back to global IDs using the primary tileset's firstGid before remapping.
    const primaryFirstGid: Num = tilesets[0]?.config.firstGid ?? 1;
    for (const gpuLayer of gpuLayers) {
      const mapLayer = mapData.layers[gpuLayer.layerIndex];
      if (!mapLayer || mapLayer.kind !== 'tile') continue;

      for (let z: Num = 0; z < gpuLayer.mapHeight; z++) {
        for (let x: Num = 0; x < gpuLayer.mapWidth; x++) {
          const idx: Num = z * gpuLayer.mapWidth + x;
          const offset: Num = idx * 4;
          const currentLocal: Num = gpuLayer.layerData[offset] ?? 0;
          if (currentLocal === 0) continue;

          // Convert local (relative to primary tileset) back to global
          const resolvedGlobal: Num = primaryFirstGid + currentLocal - 1;
          const megaLocalId: Num = megaLayout.remapTable.get(resolvedGlobal) ?? 0;
          gpuLayer.layerData[offset] = megaLocalId;
        }
      }

      // Upload remapped data to GPU
      gpuLayer.dataTexture.update(gpuLayer.layerData);

      // Swap atlas texture on the material plugin
      gpuLayer.plugin.tileAtlas = megaTexture;
      gpuLayer.plugin.tilePixelSize = new BABYLON.Vector2(
        megaLayout.tileWidth,
        megaLayout.tileHeight,
      );
    }

    // 6. Also update streaming manager tile data if active
    if (tilemap.streamingManager) {
      const firstTileLayer = mapData.layers.find((l) => l.kind === 'tile');
      if (firstTileLayer && firstTileLayer.kind === 'tile') {
        for (let i: Num = 0; i < firstTileLayer.data.length; i++) {
          const globalId: Num = firstTileLayer.data[i] ?? 0;
          tilemap.streamingManager.tileData[i] =
            globalId === 0 ? 0 : (megaLayout.remapTable.get(globalId) ?? 0);
        }
      }
    }

    // 7. Return updated tilemap with megaAtlas set
    const updated: RenderedTilemap = {
      ...tilemap,
      megaAtlas: megaLayout,
    };

    return okShallow(updated);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// setLayerVisibility
// =============================================================================

/** Options for {@link setLayerVisibility}. */
type SetLayerVisibilityOptions = {
  /** The rendered tilemap. */
  readonly tilemap: RenderedTilemap;
  /** Layer index to toggle. */
  readonly layerIndex: Num;
  /** Whether the layer should be visible. */
  readonly visible: Bool;
};

/**
 * Sets the visibility of all chunk meshes for a given layer.
 *
 * Uses `mesh.isVisible` (boolean show/hide, not alpha transparency).
 *
 * @param options - Tilemap, layer index, and visibility flag.
 * @returns BabylonResult indicating success.
 *
 * @example
 * ```typescript
 * setLayerVisibility({ tilemap, layerIndex: 0, visible: false });
 * ```
 */
export function setLayerVisibility(options: SetLayerVisibilityOptions): BabylonResult<Bool> {
  try {
    // GPU tile layers
    for (const gpuLayer of options.tilemap.gpuLayers) {
      if (gpuLayer.layerIndex === options.layerIndex) {
        setGpuLayerVisibility({ layer: gpuLayer, visible: options.visible });
      }
    }
    // Legacy chunk meshes (cliff chunks)
    for (const chunk of options.tilemap.chunks) {
      if (chunk.layerIndex === options.layerIndex) {
        chunk.mesh.isVisible = options.visible;
      }
    }
    return okUnchecked(true);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// setLayerOpacity
// =============================================================================

/** Options for {@link setLayerOpacity}. */
type SetLayerOpacityOptions = {
  /** The rendered tilemap. */
  readonly tilemap: RenderedTilemap;
  /** Layer index to adjust. */
  readonly layerIndex: Num;
  /** Opacity value [0, 1]. */
  readonly opacity: Num;
};

/**
 * Sets the opacity of all chunk meshes for a given layer.
 *
 * Uses `mesh.visibility` (0 = fully transparent, 1 = fully opaque).
 *
 * @param options - Tilemap, layer index, and opacity value.
 * @returns BabylonResult indicating success.
 *
 * @example
 * ```typescript
 * setLayerOpacity({ tilemap, layerIndex: 0, opacity: 0.5 });
 * ```
 */
export function setLayerOpacity(options: SetLayerOpacityOptions): BabylonResult<Bool> {
  try {
    // GPU tile layers
    for (const gpuLayer of options.tilemap.gpuLayers) {
      if (gpuLayer.layerIndex === options.layerIndex) {
        setGpuLayerOpacity({ layer: gpuLayer, opacity: options.opacity });
      }
    }
    // Legacy chunk meshes (cliff chunks)
    for (const chunk of options.tilemap.chunks) {
      if (chunk.layerIndex === options.layerIndex) {
        chunk.mesh.visibility = options.opacity;

        // Switch material transparency mode to support partial opacity.
        // ALPHATEST is binary (0 or 1), ALPHATESTANDBLEND supports smooth 0-1 range.
        const mat = chunk.mesh.material;
        if (mat) {
          if (options.opacity < 1) {
            mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHATESTANDBLEND;
          } else if (mat instanceof BABYLON.StandardMaterial && mat.useAlphaFromDiffuseTexture) {
            mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHATEST;
          } else {
            mat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
          }
        }
      }
    }
    return okUnchecked(true);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
  }
}
