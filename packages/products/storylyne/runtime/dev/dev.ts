/**
 * Storylyne Runtime — Dev Harness
 *
 * Visual test harness for verifying the runtime in a browser.
 * Creates a runtime, renders a 32x32 test tilemap, centers the camera,
 * and provides a full control panel UI for every runtime feature.
 *
 * Also exposes `window.__WEBFORGE__` for browser console inspection.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { SkyMaterial } from '@babylonjs/materials/sky';

import {
  createRuntime,
  disposeRuntime,
  startRenderLoop,
  registerResizeHandler,
  switchCameraPreset,
  rotateTactics,
  refocusOnTilemap,
  computeMinRadiusForMap,
  screenShake,
  getTrauma,
  stopAllShakes,
  SHAKE_PRESETS,
  setGlobalScale,
  setMasterEnabled,
  resetCamera,
  playTransition,
  TRANSITION_PRESETS,
  setLayerVisibility,
  setLayerOpacity,
  getSeasonSunPath,
  mapBlendMode,
  addParallaxLayer,
  removeParallaxLayer,
  fadeLayerOpacity,
  setParallaxLayerTint,
  createSky,
  disposeSky,
  type ScreenShakeConfig,
  type ShakePreset,
  type ShakePresetCategory,
  excludeMeshFromGlow,
  removeMeshFromGlow,
  setCustomEmissiveColor,
  clearCustomEmissiveColor,
  GLOW_QUALITY_PRESETS,
  type GlowQualityPresetName,
  getDayNightStats,
  smoothJumpToTime,
} from '../src/index';
import {
  renderTilemap,
  renderBlankTilemap,
  disposeTilemap,
  updateTile,
  applyMegaAtlas,
  type RenderedTilemap,
} from '../src/rendering/tilemap-renderer';
import {
  setGpuLayerTint,
  setGpuLayerBrightness,
  setGpuLayerSaturation,
  setGpuLayerContrast,
  setGpuLayerOffset,
  setGpuAnimationFrame,
} from '../src/rendering/gpu-tile-renderer';
import { getTileProperties } from '../src/rendering/tile-query';
import {
  resolveGlobalTileId,
  type LoadedTileset,
  type ResolvedTile,
} from '../src/rendering/tileset-loader';
import type { TileProperties, Layer, MapData } from '../src/schemas/map-data';

import type { RuntimeInstance } from '../src/runtime';
import type { BabylonResult } from '../src/core/babylon-result';
import type { CameraPreset } from '../src/schemas/camera-config';
import type { Num, Bool, Str } from '@/schemas/common';
import type { ParallaxInstance } from '../src/rendering/parallax-manager';
import type { SkyInstance } from '../src/rendering/sky-system';
import type { ColorRgba } from '../src/schemas/scene-setup-config';
import type { FogConfig } from '../src/schemas/fog-config';
import {
  applyFog,
  updateFog,
  applyFogPreset,
  disposeFog,
  type FogHandle,
} from '../src/rendering/fog-manager';
import { FOG_PRESETS, FOG_PRESET_NAMES, type FogPresetName } from '../src/rendering/fog-presets';

import { TEST_MAP_DATA, SEASON_PATHS, ATMOSPHERE_PRESETS, PROP_POSITIONS } from './test-map';

// =============================================================================
// Helpers
// =============================================================================

/** No-op callback for controls not yet wired to runtime. */
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = (): void => {};

// =============================================================================
// Types
// =============================================================================

/** Debug API shape exposed on window for console inspection. */
type DevDebugApi = {
  readonly runtime: RuntimeInstance;
  readonly scene: BABYLON.Scene;
  readonly BABYLON: typeof BABYLON;
  tilemap: RenderedTilemap | null;
  setTime: (hour: number) => string;
  getTime: () => number | string;
  switchPreset: (preset: string, durationMs?: number) => string;
  status: () => Record<string, unknown>;
};

// =============================================================================
// State
// =============================================================================

let _currentPreset = 'mapeditor';
let _firstPersonCam: BABYLON.UniversalCamera | null = null;
let _isFirstPerson = false;

// Forward reference so debug.switchPreset can call the dev harness handler
let _handlePresetChange: ((preset: string) => void) | null = null;

// -- Map Editor camera state --
const MAP_MIN = 0;
let _mapWidth = 32; // screen horizontal extent (Z axis = tilemap rows)
let _mapHeight = 32; // screen vertical extent (X axis = tilemap columns)
const ORTHO_MIN = 1;
const MIN_TILE_PX = 1; // Minimum on-screen pixels per tile when fully zoomed out
const TARGET_TILE_PX = 48; // Default on-screen pixels per tile (3× native 16px tiles)
const ZOOM_FACTOR = 1.08;
const _heldKeys = new Set<string>();
let _orthoSize: number = Math.max(_mapWidth, _mapHeight) / 2;
let _orthoMax: number = _orthoSize; // cached computeOrthoMax result (updated when scene/cam available)
let _lastCanvasH: number = 0; // canvas height at last resize — used to maintain tile pixel size on resize
let _savedClearColor: BABYLON.Color4 | null = null;

// -- Refocus configuration (mutable for dev harness controls) --
let _refocusAnimated = true;
let _refocusDurationMs = 800;
let _refocusEasing: 'linear' | 'easeInOutCubic' | 'easeOutBack' | 'easeInOutQuad' =
  'easeInOutCubic';
let _refocusPaddingScale = 1.15;
let _refocusResetElevation = true;
let _refocusResetOrbit = false;
let _refocusHandle: { dispose: () => void } | null = null;
let _sbFlashTimer: ReturnType<typeof setTimeout> | null = null;
let _sbFlashDuration = 1200;
let _sbVisibility: 'auto' | 'always' | 'never' = 'auto';

/**
 * Computes the maximum ortho size so the map exactly fills the viewport
 * along the tighter axis (no gap visible). Mirrors RPG Maker MV behavior.
 *
 * @param cam - The ArcRotateCamera.
 * @param scene - The active Babylon scene.
 * @returns The maximum orthographic half-height.
 */
function computeOrthoMax(scene?: BABYLON.Scene, cam?: BABYLON.ArcRotateCamera): number {
  // Compute the _orthoSize value that makes the entire map visible.
  // Screen vertical = X axis = _mapHeight, screen horizontal = Z axis = _mapWidth.
  // orthoTop/Bottom = ±_orthoSize, orthoLeft/Right = ±(_orthoSize * aspect).
  if (scene && cam) {
    const aspect: number = scene.getEngine().getAspectRatio(cam);
    // +2 adds one-tile padding on each edge to prevent clipping at map boundaries
    _orthoMax = Math.max((_mapHeight + 2) / 2, (_mapWidth + 2) / (2 * aspect));

    // For very large maps, don't let tiles become microscopic.
    // tileScreenPx = canvasHeight / (2 * orthoSize).
    const canvasH: number = scene.getEngine().getRenderHeight();
    const maxForMinTile: number = canvasH / (2 * MIN_TILE_PX);
    if (_orthoMax > maxForMinTile) {
      _orthoMax = maxForMinTile;
    }
    return _orthoMax;
  }
  // Fallback without aspect ratio — use the larger dimension.
  return Math.max(_mapWidth, _mapHeight) / 2;
}

/**
 * Returns the initial _orthoSize for mapeditor mode: tiles at TARGET_TILE_PX,
 * clamped so we never zoom out beyond the full map.
 */
function initialOrthoSize(scene: BABYLON.Scene): number {
  const canvasH: number = scene.getEngine().getRenderHeight();
  return Math.min(_orthoMax, canvasH / (2 * TARGET_TILE_PX));
}

/**
 * Returns the current zoom multiplier (1x = full map visible, 2x = half map, etc.).
 *
 * @returns The zoom multiplier.
 */
function getZoomMultiplier(): number {
  return _orthoMax / _orthoSize;
}

/**
 * Sets the zoom to a specific multiplier and updates ortho bounds + UI.
 *
 * @param multiplier - Target zoom multiplier (1 = fit, 16 = max zoom in).
 * @param cam - The ArcRotateCamera.
 * @param scene - The active Babylon scene.
 */
function setZoomLevel(
  multiplier: number,
  cam: BABYLON.ArcRotateCamera,
  scene: BABYLON.Scene,
): void {
  const orthoMax: number = computeOrthoMax(scene, cam);
  _orthoSize = Math.max(ORTHO_MIN, Math.min(orthoMax / MIN_ZOOM, orthoMax / multiplier));
  applyOrthoBounds(cam, scene);
  clampCameraToMap(cam, scene);
  updateScrollbars(cam, scene);
}

/**
 * Centers the camera on a specific tile grid position.
 *
 * @param gx - Grid X coordinate.
 * @param gz - Grid Z coordinate.
 * @param cam - The ArcRotateCamera.
 * @param scene - The active Babylon scene.
 */
function navigateToTile(
  gx: number,
  gz: number,
  cam: BABYLON.ArcRotateCamera,
  scene: BABYLON.Scene,
): void {
  cam.target.x = Math.max(MAP_MIN, Math.min(_mapHeight, gx + 0.5));
  cam.target.z = Math.max(MAP_MIN, Math.min(_mapWidth, gz + 0.5));
  clampCameraToMap(cam, scene);
  updateScrollbars(cam, scene);
}

// -- Easing lookup for refocus animation (same curves as camera-controller) --
const _EASING_FNS: Record<string, (t: number) => number> = {
  linear: (t: number): number => t,
  easeInOutCubic: (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  easeOutBack: (t: number): number => {
    const c1 = 1.701_58;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  easeInOutQuad: (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
};

/**
 * Recomputes `upperRadiusLimit` so the camera can zoom out far enough to
 * see the entire tilemap.  Also updates the "Max Distance" slider in the
 * Camera Details panel if it exists.
 *
 * @param cam - The ArcRotateCamera.
 * @param mapW - Screen-horizontal map extent (tiles).
 * @param mapH - Screen-vertical map extent (tiles).
 */
function updateRadiusLimitForMap(cam: BABYLON.ArcRotateCamera, mapW: number, mapH: number): void {
  const needed: Num = computeMinRadiusForMap(mapW as Num, mapH as Num, cam.fov as Num);
  const current: number = cam.upperRadiusLimit ?? 300;
  if (needed > current) {
    cam.upperRadiusLimit = needed;
  }
  // Keep the dev-harness slider in sync
  const slider = document.querySelector('#cam-upper-radius') as HTMLInputElement | null;
  if (slider) {
    const limit: number = cam.upperRadiusLimit ?? 300;
    if (limit > Number(slider.max)) slider.max = String(Math.ceil(limit));
    slider.value = String(Math.round(limit));
  }
}

/**
 * Refocuses the camera to show the entire tilemap.
 * Handles both orthographic (mapeditor) and perspective presets.
 *
 * @param cam - The camera to refocus.
 * @param scene - The active Babylon scene.
 * @param debug - Dev harness debug API (for tilemap dimensions).
 */
function refocusMap(cam: BABYLON.Camera, scene: BABYLON.Scene, debug: DevDebugApi): void {
  // Cancel any in-progress refocus
  if (_refocusHandle) {
    _refocusHandle.dispose();
    _refocusHandle = null;
  }

  const mapW = debug.tilemap ? debug.tilemap.mapData.width : _mapWidth;
  const mapH = debug.tilemap ? debug.tilemap.mapData.height : _mapHeight;

  // For mapeditor preset, use the existing ortho zoom system
  if (_currentPreset === 'mapeditor') {
    const arcCam = cam as BABYLON.ArcRotateCamera;
    if (_refocusAnimated && _refocusDurationMs > 0) {
      const startOrtho = _orthoSize;
      const endOrtho = computeOrthoMax(scene, arcCam);
      const startX = arcCam.target.x;
      const startZ = arcCam.target.z;
      const endX = _mapHeight / 2;
      const endZ = _mapWidth / 2;
      const startTime = Date.now();
      const easeFn = _EASING_FNS[_refocusEasing] ?? _EASING_FNS.linear;

      const obs = scene.onBeforeRenderObservable.add(() => {
        const elapsed = Date.now() - startTime;
        const rawT = Math.min(1, elapsed / _refocusDurationMs);
        const t = easeFn(rawT);
        _orthoSize = startOrtho + (endOrtho - startOrtho) * t;
        arcCam.target.x = startX + (endX - startX) * t;
        arcCam.target.z = startZ + (endZ - startZ) * t;
        applyOrthoBounds(arcCam, scene);
        if (rawT >= 1) {
          clampCameraToMap(arcCam, scene);
          updateScrollbars(arcCam, scene);
          scene.onBeforeRenderObservable.remove(obs);
          _refocusHandle = null;
        }
      });
      _refocusHandle = {
        dispose: () => {
          scene.onBeforeRenderObservable.remove(obs);
          _refocusHandle = null;
        },
      };
    } else {
      setZoomLevel(1, arcCam, scene);
      arcCam.target.x = _mapHeight / 2;
      arcCam.target.z = _mapWidth / 2;
      clampCameraToMap(arcCam, scene);
      updateScrollbars(arcCam, scene);
    }
    return;
  }

  // For perspective presets, use refocusOnTilemap
  const result = refocusOnTilemap({
    scene,
    camera: cam,
    mapWidth: mapW,
    mapHeight: mapH,
    config: {
      animated: _refocusAnimated,
      durationMs: _refocusDurationMs,
      easing: _refocusEasing,
      paddingScale: _refocusPaddingScale,
      resetElevation: _refocusResetElevation,
      resetOrbit: _refocusResetOrbit,
    },
    currentPreset: _currentPreset as CameraPreset,
  });
  if (result.ok) {
    _refocusHandle = result.data;
  }
}

/**
 * Clears the currently selected tile on the active layer.
 * Sets the tile ID to 0 and refreshes the inspector.
 *
 * @param debug - Debug API reference.
 */
function clearSelectedTile(debug: DevDebugApi): void {
  if (_lastInspectX < 0 || _lastInspectZ < 0) return;
  const { tilemap } = debug;
  if (!tilemap) return;

  const editLayer: Num =
    _inspectLayerIndex >= 0
      ? _inspectLayerIndex
      : findTopmostLayerAt(tilemap, _lastInspectX, _lastInspectZ);

  const result = updateTile({
    tilemap,
    layerIndex: editLayer,
    x: _lastInspectX,
    z: _lastInspectZ,
    newTileId: 0,
  });
  if (result.ok) {
    debug.tilemap = result.data;
    refreshInspector(result.data, _lastInspectX, _lastInspectZ);
  }
}

/**
 * Clears all tiles on a specific layer by setting each tile to 0.
 *
 * @param debug - Debug API reference.
 * @param layerIndex - Index of the layer to clear.
 */
function clearLayer(debug: DevDebugApi, layerIndex: Num): void {
  let { tilemap } = debug;
  if (!tilemap) return;

  const layer = tilemap.mapData.layers[layerIndex];
  if (!layer || layer.kind !== 'tile') return;

  const { width, height } = tilemap.mapData;

  for (let z: Num = 0; z < height; z++) {
    for (let x: Num = 0; x < width; x++) {
      const tileIndex: Num = z * width + x;
      if ((layer.data[tileIndex] ?? 0) === 0) continue;
      const result = updateTile({
        tilemap,
        layerIndex,
        x,
        z,
        newTileId: 0,
      });
      if (result.ok) {
        tilemap = result.data;
      }
    }
  }

  debug.tilemap = tilemap;
  if (_lastInspectX >= 0 && _lastInspectZ >= 0 && tilemap) {
    refreshInspector(tilemap, _lastInspectX, _lastInspectZ);
  }
}

/**
 * Lazily creates the grid overlay mesh covering the full tilemap.
 * Reads map dimensions from the tilemap; falls back to _mapWidth/_mapHeight if unavailable.
 * Disposes and recreates if the mesh already exists (handles map size changes).
 *
 * @param scene - The active Babylon scene.
 * @param debug - Debug API reference for reading tilemap dimensions.
 */
function ensureGridMesh(scene: BABYLON.Scene, debug: DevDebugApi): void {
  const { tilemap } = debug;
  const mapW: Num = tilemap ? tilemap.mapData.width : _mapWidth;
  const mapH: Num = tilemap ? tilemap.mapData.height : _mapHeight;

  // Compute grid Y to match the dominant tile surface height.
  // Tiles use heightLevel * tileWorldHeight (0.5) — the grid must sit on
  // the same plane so perspective projection keeps lines aligned with tiles.
  let gridY: Num = 0;
  if (tilemap) {
    const hm: Num[] | undefined = tilemap.mapData.heightMap as Num[] | undefined;
    const twh: Num = 0.5; // tileWorldHeight used by chunk-builder
    if (hm && hm.length > 0) {
      // Use the most common height level
      const counts: Map<Num, Num> = new Map();
      for (const h of hm) {
        counts.set(h, (counts.get(h) ?? 0) + 1);
      }
      let maxCount: Num = 0;
      let dominantHeight: Num = 0;
      for (const [h, c] of counts) {
        if (c > maxCount) {
          maxCount = c;
          dominantHeight = h;
        }
      }
      gridY = dominantHeight * twh;
    }
  }

  // Dispose existing if present (handles map size changes)
  if (_gridMesh) {
    _gridMesh.dispose();
    _gridMesh = null;
  }
  if (_gridFillMesh) {
    _gridFillMesh.dispose();
    _gridFillMesh = null;
  }

  // Create meshes in the utility layer scene so they render AFTER all
  // post-processing (fog, bloom, glow, SSAO, vignette, tone mapping, etc.)
  const utilScene: BABYLON.Scene = ensureUtilityLayer(scene).utilityLayerScene;

  // Build grid lines as thin quad strips — uses triangle rasterization
  // (same rendering path as the tile selection highlight) instead of GL_LINES
  // which has different rasterization rules causing sub-pixel misalignment.
  // Each grid line is a thin rectangle (2 triangles) at the exact integer
  // tile boundaries matching createFlatTileGeometry vertex positions.
  const LINE_HW: Num = 0.02; // half-width of each grid line in world units
  const colCount: Num = mapW + 1; // vertical lines at x = 0, 1, ..., mapW
  const rowCount: Num = mapH + 1; // horizontal lines at z = 0, 1, ..., mapH
  const totalLines: Num = colCount + rowCount;
  const positions: Float32Array = new Float32Array(totalLines * 4 * 3);
  const indices: Uint32Array = new Uint32Array(totalLines * 6);
  let vi: Num = 0;
  let ii: Num = 0;

  // Vertical lines (along Z axis, at each column boundary)
  for (let col: Num = 0; col <= mapW; col++) {
    const base: Num = vi;
    positions[vi * 3] = col - LINE_HW;
    positions[vi * 3 + 1] = 0;
    positions[vi * 3 + 2] = 0;
    vi++;
    positions[vi * 3] = col + LINE_HW;
    positions[vi * 3 + 1] = 0;
    positions[vi * 3 + 2] = 0;
    vi++;
    positions[vi * 3] = col + LINE_HW;
    positions[vi * 3 + 1] = 0;
    positions[vi * 3 + 2] = mapH;
    vi++;
    positions[vi * 3] = col - LINE_HW;
    positions[vi * 3 + 1] = 0;
    positions[vi * 3 + 2] = mapH;
    vi++;
    indices[ii++] = base;
    indices[ii++] = base + 1;
    indices[ii++] = base + 2;
    indices[ii++] = base;
    indices[ii++] = base + 2;
    indices[ii++] = base + 3;
  }

  // Horizontal lines (along X axis, at each row boundary)
  for (let row: Num = 0; row <= mapH; row++) {
    const base: Num = vi;
    positions[vi * 3] = 0;
    positions[vi * 3 + 1] = 0;
    positions[vi * 3 + 2] = row - LINE_HW;
    vi++;
    positions[vi * 3] = mapW;
    positions[vi * 3 + 1] = 0;
    positions[vi * 3 + 2] = row - LINE_HW;
    vi++;
    positions[vi * 3] = mapW;
    positions[vi * 3 + 1] = 0;
    positions[vi * 3 + 2] = row + LINE_HW;
    vi++;
    positions[vi * 3] = 0;
    positions[vi * 3 + 1] = 0;
    positions[vi * 3 + 2] = row + LINE_HW;
    vi++;
    indices[ii++] = base;
    indices[ii++] = base + 1;
    indices[ii++] = base + 2;
    indices[ii++] = base;
    indices[ii++] = base + 2;
    indices[ii++] = base + 3;
  }

  _gridMesh = new BABYLON.Mesh('grid-overlay', utilScene);
  const vertData: BABYLON.VertexData = new BABYLON.VertexData();
  vertData.positions = positions;
  vertData.indices = indices;
  vertData.applyToMesh(_gridMesh);

  const gridMat: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(
    'grid-overlay-mat',
    utilScene,
  );
  gridMat.emissiveColor = _gridColor;
  gridMat.disableLighting = true;
  gridMat.backFaceCulling = false;
  gridMat.zOffset = -2;
  _gridMesh.material = gridMat;
  _gridMesh.isPickable = false;
  _gridMesh.position.y = gridY;
  _gridMesh.visibility = _gridAlpha;
  _gridMesh.isVisible = _gridVisible;

  // Create a solid fill plane behind the grid lines
  _gridFillMesh = BABYLON.MeshBuilder.CreateGround(
    'grid-fill',
    { width: mapW, height: mapH },
    utilScene,
  );
  const fillMat: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(
    'grid-fill-mat',
    utilScene,
  );
  fillMat.emissiveColor = _gridFillColor;
  fillMat.disableLighting = true;
  fillMat.zOffset = -1;
  _gridFillMesh.material = fillMat;
  _gridFillMesh.isPickable = false;
  _gridFillMesh.position.set(mapW / 2, gridY, mapH / 2);
  _gridFillMesh.visibility = _gridFillAlpha;
  _gridFillMesh.isVisible = _gridVisible;
}

/**
 * Toggles the grid overlay on/off. Lazily creates the mesh if needed.
 *
 * @param scene - The active Babylon scene.
 * @param debug - Debug API reference.
 * @param forceState - Optional: force visible (true) or hidden (false).
 */
function toggleGridOverlay(scene: BABYLON.Scene, debug: DevDebugApi, forceState?: Bool): void {
  if (!_gridMesh) {
    ensureGridMesh(scene, debug);
  }
  if (forceState === undefined) {
    _gridVisible = !_gridVisible;
  } else {
    _gridVisible = forceState;
  }
  if (_gridMesh) {
    _gridMesh.isVisible = _gridVisible;
  }
  if (_gridFillMesh) {
    _gridFillMesh.isVisible = _gridVisible;
  }

  // Sync the toggle checkbox in the Navigation UI
  const gridToggle = (window as Record<string, unknown>)._gridToggle as
    | HTMLInputElement
    | undefined;
  if (gridToggle) {
    gridToggle.checked = _gridVisible;
  }
}

/**
 * Applies dim/restore to tilemap layers based on _dimOtherLayers and _inspectLayerIndex.
 * When enabled and a specific layer is selected, dims all other layers to 0.25 opacity.
 * Restores all layers to 1.0 when disabled or when set to Topmost (-1).
 *
 * @param tilemap - The rendered tilemap (or null).
 */
function applyDimLayers(tilemap: RenderedTilemap | null): void {
  if (!tilemap) return;
  const { layers } = tilemap.mapData;

  for (let i: Num = 0; i < layers.length; i++) {
    const targetOpacity: Num =
      _dimOtherLayers && _inspectLayerIndex >= 0 && i !== _inspectLayerIndex ? 0.25 : 1.0;
    setLayerOpacity({ tilemap, layerIndex: i, opacity: targetOpacity });
  }
}

/**
 * Returns the normalized rectangular selection bounds, or null if no selection.
 *
 * @returns Selection rectangle with minX, minZ, maxX, maxZ or null.
 */
function getSelectionRect(): { minX: Num; minZ: Num; maxX: Num; maxZ: Num } | null {
  if (_selStartX < 0 || _selEndX < 0) return null;
  return {
    minX: Math.min(_selStartX, _selEndX),
    minZ: Math.min(_selStartZ, _selEndZ),
    maxX: Math.max(_selStartX, _selEndX),
    maxZ: Math.max(_selStartZ, _selEndZ),
  };
}

/**
 * Clears all tiles within the rectangular selection on the active layer.
 *
 * @param debug - Debug API reference.
 */
function clearSelectionRect(debug: DevDebugApi): void {
  const rect = getSelectionRect();
  if (!rect) return;
  let { tilemap } = debug;
  if (!tilemap) return;

  const { width, height } = tilemap.mapData;
  const clampedMinX: Num = Math.max(0, rect.minX);
  const clampedMinZ: Num = Math.max(0, rect.minZ);
  const clampedMaxX: Num = Math.min(width - 1, rect.maxX);
  const clampedMaxZ: Num = Math.min(height - 1, rect.maxZ);

  for (let z: Num = clampedMinZ; z <= clampedMaxZ; z++) {
    for (let x: Num = clampedMinX; x <= clampedMaxX; x++) {
      const editLayer: Num =
        _inspectLayerIndex >= 0 ? _inspectLayerIndex : findTopmostLayerAt(tilemap, x, z);
      const result = updateTile({
        tilemap,
        layerIndex: editLayer,
        x,
        z,
        newTileId: 0,
      });
      if (result.ok) {
        tilemap = result.data;
      }
    }
  }

  debug.tilemap = tilemap;
  // Keep showing selection summary (selection rect is still active after clearing)
  showSelectionSummary();
}

/**
 * Updates the highlight mesh to cover the rectangular selection or single tile.
 * Reads the highlight mesh from window global.
 */
function updateHighlightForSelection(): void {
  const mesh = (window as Record<string, unknown>)._highlightMesh as BABYLON.Mesh | undefined;
  const border = (window as Record<string, unknown>)._borderMesh as BABYLON.Mesh | undefined;
  const fill = (window as Record<string, unknown>)._selectionFillMesh as BABYLON.Mesh | undefined;
  if (!mesh) return;

  const rect = getSelectionRect();
  if (rect) {
    const w: Num = rect.maxX - rect.minX + 1;
    const h: Num = rect.maxZ - rect.minZ + 1;
    mesh.scaling.set(w, 1, h);
    mesh.position.x = rect.minX + w / 2;
    mesh.position.z = rect.minZ + h / 2;
    mesh.setEnabled(true);
    if (border) {
      rebuildBorderGeometry(border, w, h, _selectionEdgeWidth);
      border.position.x = mesh.position.x;
      border.position.y = mesh.position.y - 0.001;
      border.position.z = mesh.position.z;
      border.setEnabled(true);
    }
    if (fill) {
      fill.scaling.set(w, 1, h);
      fill.position.x = mesh.position.x;
      fill.position.y = mesh.position.y - 0.002;
      fill.position.z = mesh.position.z;
      fill.setEnabled(true);
    }
  } else if (_lastInspectX >= 0 && _lastInspectZ >= 0) {
    mesh.scaling.set(1, 1, 1);
    mesh.position.x = _lastInspectX + 0.5;
    mesh.position.z = _lastInspectZ + 0.5;
    if (border) {
      rebuildBorderGeometry(border, 1, 1, _selectionEdgeWidth);
      border.position.x = mesh.position.x;
      border.position.y = mesh.position.y - 0.001;
      border.position.z = mesh.position.z;
      border.setEnabled(true);
    }
    if (fill) {
      fill.scaling.set(1, 1, 1);
      fill.position.x = mesh.position.x;
      fill.position.y = mesh.position.y - 0.002;
      fill.position.z = mesh.position.z;
      fill.setEnabled(true);
    }
  }
  _tilePickerRedraw?.();
}

/**
 * Clears all tiles on all layers.
 *
 * @param debug - Debug API reference.
 */
function clearAllLayers(debug: DevDebugApi): void {
  const { tilemap } = debug;
  if (!tilemap) return;
  for (let li: Num = 0; li < tilemap.mapData.layers.length; li++) {
    clearLayer(debug, li);
  }
}

// -- Utility layer for dev overlays (renders AFTER all post-processing) --
let _utilityLayer: BABYLON.UtilityLayerRenderer | null = null;

/**
 * Returns (and lazily creates) a UtilityLayerRenderer whose scene renders
 * on top of the main scene AFTER all post-processing effects. Grid, selection
 * highlight, border, and fill meshes live here so fog, bloom, SSAO, glow,
 * vignette, tone mapping, etc. never affect them.
 *
 * @param scene - The main Babylon scene.
 * @returns The shared UtilityLayerRenderer instance.
 */
function ensureUtilityLayer(scene: BABYLON.Scene): BABYLON.UtilityLayerRenderer {
  if (!_utilityLayer) {
    _utilityLayer = new BABYLON.UtilityLayerRenderer(scene);
    // Draw on top of everything (default), clearing depth so overlays
    // are never occluded by main-scene geometry.
    _utilityLayer.utilityLayerScene.autoClearDepthAndStencil = true;
    // Ambient light for future overlays that might need it.
    // Current overlay materials all use disableLighting = true.
    const light: BABYLON.HemisphericLight = new BABYLON.HemisphericLight(
      'util-overlay-light',
      new BABYLON.Vector3(0, 1, 0),
      _utilityLayer.utilityLayerScene,
    );
    light.intensity = 1.0;
  }
  return _utilityLayer;
}

// -- Grid overlay state --
let _gridMesh: BABYLON.Mesh | null = null;
let _gridFillMesh: BABYLON.Mesh | null = null;
let _gridVisible: Bool = true;
let _gridColor: BABYLON.Color3 = new BABYLON.Color3(0.8, 0.8, 0.8);
let _gridAlpha: Num = 0.2;
let _gridFillColor: BABYLON.Color3 = new BABYLON.Color3(0.8, 0.8, 0.8);
let _gridFillAlpha: Num = 0;

/**
 * Updates the grid line mesh color and opacity from the current state variables.
 */
function updateGridAppearance(): void {
  if (!_gridMesh) return;
  const mat = _gridMesh.material as BABYLON.StandardMaterial | null;
  if (mat) mat.emissiveColor = _gridColor;
  _gridMesh.visibility = _gridAlpha;
  _tilePickerRedraw?.();
}

/**
 * Updates the grid fill mesh color and opacity from the current state variables.
 */
function updateGridFillAppearance(): void {
  if (!_gridFillMesh) return;
  const mat = _gridFillMesh.material as BABYLON.StandardMaterial | null;
  if (mat) mat.emissiveColor = _gridFillColor;
  _gridFillMesh.visibility = _gridFillAlpha;
  _tilePickerRedraw?.();
}

// -- Selection highlight state --
let _selectionColor: BABYLON.Color3 = BABYLON.Color3.FromHexString('#44ccdd');
let _selectionAlpha: Num = 0.9;
let _selectionEdgeWidth: Num = 0.05;
let _selectionFillColor: BABYLON.Color3 = BABYLON.Color3.FromHexString('#44ccdd');
let _selectionFillAlpha: Num = 0.12;

/**
 * Rebuilds the border mesh geometry as a hollow rectangular frame (annulus).
 * The frame extends `bw` world-units outward from a `w × h` inner rectangle,
 * both centered at the mesh origin. Uses 8 vertices and 8 triangles.
 *
 * @param mesh - The Babylon mesh to apply the frame geometry to.
 * @param w - Inner width of the frame (matches highlight mesh width).
 * @param h - Inner height of the frame (matches highlight mesh height).
 * @param bw - Border width in world units.
 */
function rebuildBorderGeometry(mesh: BABYLON.Mesh, w: Num, h: Num, bw: Num): void {
  const hw: Num = w / 2;
  const hh: Num = h / 2;

  /* eslint-disable @typescript-eslint/no-magic-numbers */
  const positions: Float32Array = new Float32Array([
    // Outer 4 vertices
    -hw - bw,
    0,
    -hh - bw, //  0: bottom-left outer
    hw + bw,
    0,
    -hh - bw, //  1: bottom-right outer
    hw + bw,
    0,
    hh + bw, //  2: top-right outer
    -hw - bw,
    0,
    hh + bw, //  3: top-left outer
    // Inner 4 vertices
    -hw,
    0,
    -hh, //  4: bottom-left inner
    hw,
    0,
    -hh, //  5: bottom-right inner
    hw,
    0,
    hh, //  6: top-right inner
    -hw,
    0,
    hh, //  7: top-left inner
  ]);

  const normals: Float32Array = new Float32Array([
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
  ]);

  const indices: Uint32Array = new Uint32Array([
    // Bottom strip
    0, 1, 5, 0, 5, 4,
    // Right strip
    1, 2, 6, 1, 6, 5,
    // Top strip
    2, 3, 7, 2, 7, 6,
    // Left strip
    3, 0, 4, 3, 4, 7,
  ]);
  /* eslint-enable @typescript-eslint/no-magic-numbers */

  const vertexData: BABYLON.VertexData = new BABYLON.VertexData();
  vertexData.positions = positions;
  vertexData.normals = normals;
  vertexData.indices = indices;
  vertexData.applyToMesh(mesh, true);
}

/**
 * Updates the selection highlight mesh appearance from the current state variables.
 *
 * Uses `mesh.visibility` for opacity. The visible border is produced by
 * `_borderMesh` — a hollow frame mesh rebuilt via {@link rebuildBorderGeometry}.
 */
function updateSelectionAppearance(): void {
  const mesh = (window as Record<string, unknown>)._highlightMesh as BABYLON.Mesh | undefined;
  if (!mesh) return;
  const mat = mesh.material as BABYLON.StandardMaterial | null;
  if (mat) mat.emissiveColor = _selectionColor;
  mesh.visibility = _selectionAlpha;

  const border = (window as Record<string, unknown>)._borderMesh as BABYLON.Mesh | undefined;
  if (!border) return;
  const borderMat = border.material as BABYLON.StandardMaterial | null;
  if (borderMat) borderMat.emissiveColor = _selectionColor;
  border.visibility = _selectionAlpha;

  const fill = (window as Record<string, unknown>)._selectionFillMesh as BABYLON.Mesh | undefined;
  if (!fill) return;
  const fillMat = fill.material as BABYLON.StandardMaterial | null;
  if (fillMat) fillMat.emissiveColor = _selectionFillColor;
  fill.visibility = _selectionFillAlpha;
  _tilePickerRedraw?.();
}

// -- Editor backdrop (black plane behind everything) --
let _editorBackdrop: BABYLON.Mesh | null = null;

/**
 * Creates or shows a large black ground mesh behind the tilemap to cover any visible area outside the map.
 *
 * @param scene - The Babylon.js scene to add the backdrop to
 */
function ensureEditorBackdrop(scene: BABYLON.Scene): void {
  if (!_editorBackdrop) {
    _editorBackdrop = BABYLON.MeshBuilder.CreateGround(
      'editor-backdrop',
      { width: 2000, height: 2000 },
      scene,
    );
    const mat: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(
      'editor-backdrop-mat',
      scene,
    );
    mat.diffuseColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    mat.specularColor = new BABYLON.Color3(0, 0, 0);
    mat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    mat.disableLighting = true;
    _editorBackdrop.material = mat;
    _editorBackdrop.position.y = -0.05;
    _editorBackdrop.position.x = _mapHeight / 2;
    _editorBackdrop.position.z = _mapWidth / 2;
    _editorBackdrop.isPickable = false;
    _editorBackdrop.renderingGroupId = 0;
  }
  // Reposition to current map center (may have changed after resize)
  _editorBackdrop.position.x = _mapHeight / 2;
  _editorBackdrop.position.z = _mapWidth / 2;
  _editorBackdrop.setEnabled(true);
}

// -- Dim other layers state --
let _dimOtherLayers: Bool = false;

// -- Rectangular selection state --
let _selStartX: Num = -1;
let _selStartZ: Num = -1;
let _selEndX: Num = -1;
let _selEndZ: Num = -1;
let _isRectSelecting: Bool = false;

// -- Tile Inspector selected tile state --
let _selectedTileset: LoadedTileset | null = null;
let _selectedLocalIndex: Num = 0;
/** Layer index to inspect: -1 = topmost non-empty, 0+ = specific layer. */
let _inspectLayerIndex: Num = -1;
/** Cached grid position so re-inspect works when switching layers. */
let _lastInspectX: Num = -1;
let _lastInspectZ: Num = -1;

/** Terrain type options for the dropdown with friendly display labels. */
const TERRAIN_TYPE_OPTIONS: ReadonlyArray<{ readonly value: string; readonly label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'water', label: 'Shallow Water' },
  { value: 'deepWater', label: 'Deep Water' },
  { value: 'lava', label: 'Lava' },
  { value: 'ice', label: 'Ice' },
  { value: 'sand', label: 'Sand' },
  { value: 'swamp', label: 'Swamp' },
  { value: 'snow', label: 'Snow' },
  { value: 'grass', label: 'Grass' },
  { value: 'wood', label: 'Wood / Planks' },
  { value: 'stone', label: 'Stone / Brick' },
  { value: 'metal', label: 'Metal' },
  { value: 'custom', label: 'Custom' },
];

/**
 * Reads the current TileProperties for the selected tile, creating a
 * default entry if one does not exist yet.
 *
 * @returns The mutable TileProperties object from the tileset config.
 */
function getOrCreateSelectedProps(): TileProperties | null {
  if (!_selectedTileset) return null;
  const key = String(_selectedLocalIndex);
  const existing: TileProperties | undefined = _selectedTileset.config.tileProperties[key];
  if (existing) return existing;

  // Create a new entry with schema defaults
  const defaults: TileProperties = {
    passability: [true, true, true, true],
    terrainTag: 0,
    height: 0,
    damageFloor: false,
    bush: false,
    counter: false,
    ladder: false,
    passAbove: false,
    passBelow: false,
    passVehicle: 0,
    passEvent: true,
    passHeight: 0,
    starPassage: false,
    slip: false,
    shelter: false,
    bushDepth: 12,
    coverHeight: 0,
    soundAbsorb: false,
    damageAmount: 0,
    damagePercent: 0,
    damageElement: '',
    damageInterval: 1,
    reflection: false,
    reflectionOpacity: 0.5,
    glow: false,
    glowColor: '#ffffffff',
    glowIntensity: 0,
    terrainType: 'normal',
    footstepSound: '',
    encounterRate: 1,
    slipperiness: 0,
    movementSpeed: 1,
    regionId: 0,
  };
  _selectedTileset.config.tileProperties[key] = defaults;
  return defaults;
}

/**
 * References to all editable tile inspector controls so they can be
 * updated when a new tile is selected.
 */
type TileInspectorControls = {
  passDown: HTMLElement;
  passLeft: HTMLElement;
  passRight: HTMLElement;
  passUp: HTMLElement;
  passAbove: HTMLElement;
  passBelow: HTMLElement;
  passEvent: HTMLElement;
  starPassage: HTMLElement;
  passVehicle: HTMLInputElement;
  passVehicleVal: HTMLElement;
  passHeight: HTMLInputElement;
  passHeightVal: HTMLElement;
  terrainTag: HTMLInputElement;
  terrainTagVal: HTMLElement;
  terrainType: HTMLSelectElement;
  encounterRate: HTMLInputElement;
  encounterRateVal: HTMLElement;
  slipperiness: HTMLInputElement;
  slipperinessVal: HTMLElement;
  movementSpeed: HTMLInputElement;
  movementSpeedVal: HTMLElement;
  regionId: HTMLInputElement;
  regionIdVal: HTMLElement;
  height: HTMLInputElement;
  heightVal: HTMLElement;
  damageFloor: HTMLElement;
  bush: HTMLElement;
  counter: HTMLElement;
  ladder: HTMLElement;
  slip: HTMLElement;
  shelter: HTMLElement;
  bushDepth: HTMLInputElement;
  bushDepthVal: HTMLElement;
  coverHeight: HTMLInputElement;
  coverHeightVal: HTMLElement;
  soundAbsorb: HTMLElement;
  damageAmount: HTMLInputElement;
  damageAmountVal: HTMLElement;
  damagePercent: HTMLInputElement;
  damagePercentVal: HTMLElement;
  damageElement: HTMLInputElement;
  damageInterval: HTMLInputElement;
  damageIntervalVal: HTMLElement;
  reflection: HTMLElement;
  reflectionOpacity: HTMLInputElement;
  reflectionOpacityVal: HTMLElement;
  glow: HTMLElement;
  glowColor: HTMLInputElement;
  glowIntensity: HTMLInputElement;
  glowIntensityVal: HTMLElement;
};

let _tiControls: TileInspectorControls | null = null;

// =============================================================================
// Debug API
// =============================================================================

/**
 * Creates the debug API object for window.__WEBFORGE__.
 *
 * @param runtime - The runtime instance.
 * @returns Debug API with helpers for console inspection.
 */
function createDebugApi(runtime: RuntimeInstance): DevDebugApi {
  return {
    runtime,
    scene: runtime.engine.scene,
    BABYLON,
    tilemap: null,
    setTime(hour: number): string {
      const lighting = this.tilemap?.lighting;
      if (!lighting?.dayNightCycle) return 'No day/night cycle active';
      lighting.dayNightCycle.timeOfDay = Math.max(0, Math.min(24, hour));
      return `Time set to ${lighting.dayNightCycle.timeOfDay.toFixed(2)}`;
    },
    getTime(): number | string {
      const lighting = this.tilemap?.lighting;
      if (!lighting?.dayNightCycle) return 'No day/night cycle active';
      return lighting.dayNightCycle.timeOfDay;
    },
    switchPreset(preset: string, _durationMs = 500): string {
      if (!_handlePresetChange) return 'Dev harness not ready';
      _handlePresetChange(preset);
      // Sync the dropdown UI
      const sel = document.querySelector('#preset') as HTMLSelectElement | null;
      if (sel) sel.value = preset;
      return `Switched to ${preset}`;
    },
    status(): Record<string, unknown> {
      const { scene } = runtime.engine;
      const lighting = this.tilemap?.lighting;

      const lightDetails = lighting
        ? lighting.lights.map((ml) => ({
            id: ml.config.id,
            type: ml.config.type,
            intensity: ml.light.intensity,
            enabled: ml.light.isEnabled(),
            hasShadow: ml.shadowGenerator !== null,
            hasFlicker: ml.flickerInstance !== null,
          }))
        : [];

      return {
        fps: scene.getEngine().getFps().toFixed(1),
        backend: runtime.engine.isWebGPU ? 'WebGPU' : 'WebGL2',
        activeMeshes: scene.getActiveMeshes().length,
        totalMeshes: scene.meshes.length,
        totalLights: scene.lights.length,
        effectLayers: scene.effectLayers?.length ?? 0,
        lights: lightDetails,
        glowLayer: lighting?.glowLayer !== null,
        dayNightCycle: lighting?.dayNightCycle !== null,
        timeOfDay: lighting?.dayNightCycle?.timeOfDay?.toFixed(2) ?? 'N/A',
        postProcessing: this.tilemap?.postProcessing !== null,
      };
    },
  };
}

// =============================================================================
// UI Wiring — called from HTML onclick handlers via window globals
// =============================================================================

/**
 * Wires all UI controls to the runtime/tilemap.
 *
 * @param runtime - The runtime instance.
 * @param debug - The debug API.
 */
function wireUI(runtime: RuntimeInstance, debug: DevDebugApi): void {
  const { scene }: { scene: BABYLON.Scene } = runtime.engine;

  // ── Panel minimize / restore ────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
  (window as any).minimizePanel = (): void => {
    const panel = document.querySelector('#control-panel');
    const panelIcon = document.querySelector('#panel-icon');
    if (panel) panel.classList.add('hidden');
    if (panelIcon) panelIcon.classList.add('visible');
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
  (window as any).restorePanel = (): void => {
    const panel = document.querySelector('#control-panel');
    const panelIcon = document.querySelector('#panel-icon');
    if (panel) panel.classList.remove('hidden');
    if (panelIcon) panelIcon.classList.remove('visible');
  };

  // ── Global shortcut: backtick toggles panel visibility ──────────
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === '`' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = e.target as HTMLElement;
      // Don't trigger when typing in inputs
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      )
        return;
      e.preventDefault();
      const panel = document.querySelector('#control-panel');
      const panelIcon = document.querySelector('#panel-icon');
      if (panel?.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        panelIcon?.classList.remove('visible');
      } else if (panel) {
        panel.classList.add('hidden');
        panelIcon?.classList.add('visible');
      }
    }
  });

  // ── Draggable panel ─────────────────────────────────────────────
  const panelHeader = document.querySelector('#panel-header') as HTMLElement | null;
  const controlPanel = document.querySelector('#control-panel') as HTMLElement | null;
  if (panelHeader && controlPanel) {
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let panelStartX = 0;
    let panelStartY = 0;

    panelHeader.addEventListener('mousedown', (e: MouseEvent) => {
      // Only drag on the header background, not on child buttons
      const target = e.target as HTMLElement;
      if (target.classList.contains('panel-btn')) return;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const rect = controlPanel.getBoundingClientRect();
      panelStartX = rect.left;
      panelStartY = rect.top;
      // Switch from right-anchored to left-anchored positioning
      controlPanel.style.right = 'auto';
      controlPanel.style.left = `${String(panelStartX)}px`;
      controlPanel.style.top = `${String(panelStartY)}px`;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      controlPanel.style.left = `${String(panelStartX + dx)}px`;
      controlPanel.style.top = `${String(panelStartY + dy)}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  // ── Section toggle ──────────────────────────────────────────────
  /** @param id - DOM id of the section to toggle. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
  (window as any).toggleSection = (id: string): void => {
    const section = document.querySelector(`#${id}`);
    if (!section) return;
    const isCollapsing = !section.classList.contains('collapsed');
    section.classList.toggle('collapsed');
    if (!isCollapsing) {
      const body = section.querySelector('.section-body') as HTMLElement | null;
      if (body) {
        body.style.overflow = 'hidden';
        body.addEventListener('transitionend', function handler() {
          body.removeEventListener('transitionend', handler);
          if (!section.classList.contains('collapsed')) {
            body.style.overflow = '';
          }
        });
      }
    }
  };

  // ── Camera Presets (dropdown) ───────────────────────────────────
  /**
   * Handles a camera preset change from the dropdown.
   *
   * @param preset - The selected preset name.
   */
  function handlePresetChange(preset: string): void {
    const canvas = scene.getEngine().getRenderingCanvas();

    // Switching away from firstperson — restore ArcRotateCamera
    if (_isFirstPerson && _firstPersonCam && preset !== 'firstperson') {
      _firstPersonCam.detachControl();

      // Detach pipelines from the FP camera before disposing
      const ppm = scene.postProcessRenderPipelineManager;
      for (const pl of ppm.supportedPipelines) {
        ppm.detachCamerasFromRenderPipeline(pl.name, _firstPersonCam);
      }

      _firstPersonCam.dispose();
      _firstPersonCam = null;
      _isFirstPerson = false;

      const arcCam = runtime.camera as BABYLON.ArcRotateCamera;
      scene.activeCamera = arcCam;
      if (canvas) arcCam.attachControl(canvas, true);

      // Re-attach pipelines to the ArcRotateCamera
      for (const pl of ppm.supportedPipelines) {
        ppm.attachCamerasToRenderPipeline(pl.name, arcCam);
      }
    }

    // Switching to firstperson — create UniversalCamera
    if (preset === 'firstperson') {
      const arcCam = runtime.camera as BABYLON.ArcRotateCamera;
      const pos = arcCam.position.clone();

      const fpCam = new BABYLON.UniversalCamera('camera-firstperson', pos, scene);
      fpCam.setTarget(arcCam.target.clone());
      fpCam.keysUp = [87]; // W
      fpCam.keysDown = [83]; // S
      fpCam.keysLeft = [65]; // A
      fpCam.keysRight = [68]; // D
      fpCam.fov = 1.2;
      fpCam.speed = 0.5;
      fpCam.minZ = 0.1;

      arcCam.detachControl();
      scene.activeCamera = fpCam;
      if (canvas) fpCam.attachControl(canvas, true);

      const ppm = scene.postProcessRenderPipelineManager;
      for (const name of ppm.supportedPipelines.map((p) => p.name)) {
        ppm.attachCamerasToRenderPipeline(name, fpCam);
      }

      _firstPersonCam = fpCam;
      _isFirstPerson = true;
      _currentPreset = preset;
      return;
    }

    const arcCam = runtime.camera as BABYLON.ArcRotateCamera;

    // Handle orthographic mode switching for mapeditor
    if (preset === 'mapeditor') {
      arcCam.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
      computeOrthoMax(scene, arcCam);
      _orthoSize = initialOrthoSize(scene);
      applyOrthoBounds(arcCam, scene);
      _lastCanvasH = scene.getEngine().getRenderHeight();

      // Detach Babylon's wheel input (we use custom zoom)
      const wheelInput = arcCam.inputs.attached['mousewheel'];
      if (wheelInput) wheelInput.detachControl();
      // Disable Babylon's right-click panning (we handle all panning)
      arcCam.panningSensibility = 0;

      // Center camera on map
      arcCam.target.x = _mapHeight / 2;
      arcCam.target.z = _mapWidth / 2;

      // Dark background for any visible area outside the map
      _savedClearColor = scene.clearColor.clone();
      scene.clearColor = new BABYLON.Color4(0.08, 0.08, 0.08, 1);

      ensureEditorBackdrop(scene);

      // Show grid overlay by default in mapeditor
      if (_gridVisible && !_gridMesh) {
        toggleGridOverlay(scene, debug, true);
      }

      updateScrollbars(arcCam, scene);
    } else if (_currentPreset === 'mapeditor') {
      // Switching away from mapeditor — restore perspective
      arcCam.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;

      // Grid stays visible across all presets — user controls it via toggle

      // Hide editor backdrop
      if (_editorBackdrop) {
        _editorBackdrop.setEnabled(false);
      }

      // Restore original clear color
      if (_savedClearColor) {
        scene.clearColor = _savedClearColor;
        _savedClearColor = null;
      }

      // Re-attach Babylon's wheel input for 3D presets
      const cvs = scene.getEngine().getRenderingCanvas();
      const wheelInput = arcCam.inputs.attached['mousewheel'];
      if (wheelInput && cvs) wheelInput.attachControl(cvs);
      // Restore Babylon's right-click panning
      arcCam.panningSensibility = 50;

      // Restore meshes/systems hidden by mapeditor per-frame callback
      for (const mesh of scene.meshes) {
        if (mesh.name === 'VolumetricLightScatteringMesh') {
          mesh.isVisible = true;
        } else if (mesh.name.startsWith('sky-')) {
          mesh.setEnabled(true);
          mesh.isVisible = true;
        }
      }
      const restoredLights = debug.tilemap?.lighting?.lights;
      if (restoredLights) {
        for (const ml of restoredLights) {
          if (ml.lensFlareSystem) ml.lensFlareSystem.isEnabled = true;
        }
      }

      // Hide scrollbars
      const hBar: HTMLElement | null = document.querySelector('#scrollbar-h');
      const vBar: HTMLElement | null = document.querySelector('#scrollbar-v');
      const sbCorner: HTMLElement | null = document.querySelector('#scrollbar-corner');
      if (hBar) hBar.classList.remove('sb-active', 'visible');
      if (vBar) vBar.classList.remove('sb-active', 'visible');
      if (sbCorner) sbCorner.classList.remove('visible');
    }

    // Handle auto-rotate for orbit preset
    if (preset === 'orbit') {
      arcCam.useAutoRotationBehavior = true;
    } else if (_currentPreset === 'orbit') {
      arcCam.useAutoRotationBehavior = false;
    }

    const durationSlider = document.querySelector('#transition-duration') as HTMLInputElement;
    const durationMs = Number(durationSlider?.value ?? 500);

    // Centre camera on the tilemap before transition so it looks at the map.
    if (preset !== 'mapeditor') {
      arcCam.target.x = _mapHeight / 2;
      arcCam.target.z = _mapWidth / 2;

      // Ensure zoom-out limit is large enough for the current map
      updateRadiusLimitForMap(arcCam, _mapWidth, _mapHeight);
    }

    switchCameraPreset({
      scene,
      camera: arcCam,
      targetPreset: preset as 'hd2d' | 'topdown' | 'sideview' | 'cinematic' | 'free',
      durationMs,
      easing: 'easeInOutCubic',
    });

    // Override the preset's default radius so the camera zooms to fit
    // the entire tilemap.  Uses the same FOV-based calculation as
    // refocusOnTilemap() instead of the old crude heuristic.
    if (preset !== 'mapeditor') {
      const fitRadius: number = Math.max(
        computeMinRadiusForMap(
          _mapWidth as Num,
          _mapHeight as Num,
          arcCam.fov as Num,
          _refocusPaddingScale as Num,
        ),
        40,
      );
      const radiusStart: number = arcCam.radius;

      if (durationMs <= 0) {
        arcCam.radius = fitRadius;
      } else {
        const tStart: number = performance.now();
        const obs: BABYLON.Observer<BABYLON.Scene> = scene.onBeforeRenderObservable.add(() => {
          const elapsed: number = performance.now() - tStart;
          const rawT: number = Math.min(1, elapsed / durationMs);
          // Smoothstep easing
          const t: number = rawT * rawT * (3 - 2 * rawT);
          arcCam.radius = radiusStart + (fitRadius - radiusStart) * t;
          if (rawT >= 1) {
            scene.onBeforeRenderObservable.remove(obs);
          }
        });
      }
    }

    _currentPreset = preset;

    // Toggle camera nav controls visibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
    const navControls = (window as any)._camNavControls as HTMLElement | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
    const navFallback = (window as any)._camNavFallback as HTMLElement | undefined;
    if (navControls) navControls.style.display = preset === 'mapeditor' ? 'block' : 'none';
    if (navFallback) navFallback.style.display = preset === 'mapeditor' ? 'none' : 'block';
  }

  // Expose to debug.switchPreset so it can call the full dev harness handler
  _handlePresetChange = handlePresetChange;

  const presetContainer = document.querySelector('#camera-preset-dropdown');
  if (presetContainer) {
    presetContainer.append(
      createDropdown(
        'Preset',
        [
          { value: 'free', label: 'Free Orbit' },
          { value: 'hd2d', label: 'HD-2D' },
          { value: 'isometric', label: 'Isometric' },
          { value: 'topdown', label: 'Top-Down' },
          { value: 'sideview', label: 'Side View' },
          { value: 'tactical', label: 'Tactical (SRPG)' },
          { value: 'thirdperson', label: 'Third Person' },
          { value: 'rts', label: 'RTS' },
          { value: 'dungeon', label: 'Dungeon Crawler' },
          { value: 'platformer', label: 'Platformer' },
          { value: 'panoramic', label: 'Panoramic' },
          { value: 'orbit', label: 'Orbit (Auto-Rotate)' },
          { value: 'cinematic', label: 'Cinematic' },
          { value: 'editor', label: 'Editor' },
          { value: 'mapeditor', label: 'Map Editor (Ortho)' },
          { value: 'firstperson', label: 'First Person' },
        ],
        'mapeditor',
        (value) => {
          handlePresetChange(value);
        },
        'preset',
      ),
    );
  }

  // Apply the initial preset (dropdown defaults to 'mapeditor' but the
  // change handler only fires on user interaction — call it once at startup
  // so the camera gets the correct ortho bounds, VLS/sky-gradient hiding, etc.)
  handlePresetChange('mapeditor');

  // Transition duration slider + inline edit
  const transSlider = document.querySelector('#transition-duration') as HTMLInputElement;
  const transValue = document.querySelector('#transition-value') as HTMLElement | null;
  transSlider?.addEventListener('input', () => {
    if (transValue) transValue.textContent = `${transSlider.value}ms`;
  });
  if (transValue) {
    transValue.style.cursor = 'pointer';
    transValue.title = 'Click to enter a custom duration';
    const transInline: HTMLInputElement = document.createElement('input');
    transInline.type = 'number';
    transInline.className = 'nav-input';
    transInline.min = '0';
    transInline.max = '60000';
    transInline.step = '50';
    transInline.style.display = 'none';
    transInline.style.width = '60px';
    transValue.parentElement?.append(transInline);

    const applyTransInline = (): void => {
      const v: number = Math.max(0, Math.min(60000, Number(transInline.value) || 0));
      if (transSlider) transSlider.value = String(Math.min(30000, v));
      transValue.textContent = `${String(v)}ms`;
      transInline.style.display = 'none';
      transValue.style.display = '';
    };

    transValue.addEventListener('click', () => {
      transInline.value = transSlider?.value ?? '500';
      transValue.style.display = 'none';
      transInline.style.display = '';
      transInline.focus();
      transInline.select();
    });

    transInline.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') applyTransInline();
      if (e.key === 'Escape') {
        transInline.style.display = 'none';
        transValue.style.display = '';
      }
    });
    transInline.addEventListener('blur', applyTransInline);
  }

  // ── Reset Camera ───────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
  (window as any).resetCam = (): void => {
    const cam = _isFirstPerson ? _firstPersonCam : runtime.camera;
    if (!cam) return;

    // For mapeditor, use the dev harness reset (knows actual map dimensions)
    if (_currentPreset === 'mapeditor' && cam instanceof BABYLON.ArcRotateCamera) {
      setZoomLevel(1, cam, scene);
      cam.target.x = _mapHeight / 2;
      cam.target.z = _mapWidth / 2;
      clampCameraToMap(cam, scene);
      updateScrollbars(cam, scene);
      return;
    }

    resetCamera({ scene, camera: cam, preset: _currentPreset as CameraPreset });

    // After resetting angles/fov/limits to defaults, center the camera on
    // the map and zoom out to show the full tilemap (same as Refocus Map).
    refocusMap(cam, scene, debug);
  };

  // ── Tactics Rotation ────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
  (window as any).rotateCW = (): void => {
    const { camera: cam } = runtime;
    if (cam instanceof BABYLON.ArcRotateCamera) {
      rotateTactics({ camera: cam, direction: 'cw' as const, durationMs: 300 });
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
  (window as any).rotateCCW = (): void => {
    const { camera: cam } = runtime;
    if (cam instanceof BABYLON.ArcRotateCamera) {
      rotateTactics({ camera: cam, direction: 'ccw' as const, durationMs: 300 });
    }
  };

  // ── Tactical Rotation Angle Readout ─────────────────────────────
  const tacticalAngleSpan: HTMLElement | null = document.querySelector('#tactical-angle');
  if (tacticalAngleSpan) {
    let tacFrameCount = 0;
    scene.registerAfterRender(() => {
      tacFrameCount++;
      if (tacFrameCount % 6 !== 0) return;
      const { camera: cam } = runtime;
      if (cam instanceof BABYLON.ArcRotateCamera) {
        const deg: number = ((((cam.alpha * 180) / Math.PI) % 360) + 360) % 360;
        tacticalAngleSpan.textContent = `${Math.round(deg)}°`;
      }
    });
  }

  // ── Screen Shake ────────────────────────────────────────────────
  buildShakeUI(scene, runtime.camera);

  // ── Day/Night Cycle ─────────────────────────────────────────────
  const timeSlider = document.querySelector('#time-slider') as HTMLInputElement;
  const timeValue = document.querySelector('#time-value');
  const speedSlider = document.querySelector('#speed-slider') as HTMLInputElement;
  const speedValue = document.querySelector('#speed-value');

  timeSlider?.addEventListener('input', () => {
    const hour = Number(timeSlider.value);
    debug.setTime(hour);
    updateTimeDisplay(hour);
    // Switch preset dropdown to "-- Custom --" when slider is dragged manually
    const presetSelect = document.querySelector(
      'select[data-control="daynight-preset"]',
    ) as HTMLSelectElement | null;
    if (presetSelect) presetSelect.value = '__custom__';
  });

  let _lastDayNightSpeed = 1.0;
  const pauseBtn = document.querySelector('#daynight-pause-btn') as HTMLButtonElement | null;

  speedSlider?.addEventListener('input', () => {
    const speed = Number(speedSlider.value);
    const cycle = debug.tilemap?.lighting?.dayNightCycle;
    if (cycle) {
      cycle.speed = speed;
      // Sync dayDurationSeconds to match speed
      if (speed > 0) {
        (cycle.config as Record<string, unknown>)['dayDurationSeconds'] = 24 / speed;
      }
    }
    if (speed > 0) _lastDayNightSpeed = speed;
    if (speedValue) speedValue.textContent = speed === 0 ? '0x' : `${speed.toFixed(1)}x`;
    if (pauseBtn) pauseBtn.textContent = speed > 0 ? '\u23F8 Pause' : '\u25B6 Play';
  });

  // Day/Night preset dropdown (12 presets)
  const dayNightDropdownContainer = document.querySelector('#daynight-preset-dropdown');
  const timePresetMap: Record<string, number> = {
    midnight: 0,
    lateNight: 2,
    predawn: 4,
    dawn: 5,
    goldenMorning: 6.5,
    morning: 8,
    noon: 12,
    afternoon: 15,
    goldenEvening: 17.5,
    dusk: 19,
    twilight: 20.5,
    night: 22,
  };
  if (dayNightDropdownContainer) {
    const presetDropdownRow = createDropdown(
      'Time Preset',
      [
        { value: '__custom__', label: '\u2014' },
        { value: 'dawn', label: 'Dawn (5:00)' },
        { value: 'goldenMorning', label: 'Golden Morning (6:30)' },
        { value: 'morning', label: 'Morning (8:00)' },
        { value: 'noon', label: 'Noon (12:00)' },
        { value: 'afternoon', label: 'Afternoon (15:00)' },
        { value: 'goldenEvening', label: 'Golden Evening (17:30)' },
        { value: 'dusk', label: 'Dusk (19:00)' },
        { value: 'twilight', label: 'Twilight (20:30)' },
        { value: 'night', label: 'Night (22:00)' },
        { value: 'midnight', label: 'Midnight (0:00)' },
        { value: 'lateNight', label: 'Late Night (2:00)' },
        { value: 'predawn', label: 'Pre-Dawn (4:00)' },
      ],
      'noon',
      (val) => {
        if (val === '__custom__') return;
        const hour = timePresetMap[val] ?? 12;
        debug.setTime(hour);
        if (timeSlider) timeSlider.value = String(hour);
        updateTimeDisplay(hour);
      },
      'daynight-preset',
      'Quick-jump to a predefined time of day.',
    );
    // Mark the "-- Custom --" placeholder as disabled + hidden so it can't be picked
    const customOpt = presetDropdownRow.querySelector(
      'option[value="__custom__"]',
    ) as HTMLOptionElement | null;
    if (customOpt) {
      customOpt.disabled = true;
      customOpt.hidden = true;
    }
    dayNightDropdownContainer.append(presetDropdownRow);
  }

  // Pause/Play toggle
  pauseBtn?.addEventListener('click', () => {
    const cycle = debug.tilemap?.lighting?.dayNightCycle;
    if (!cycle) return;
    if (cycle.speed > 0) {
      _lastDayNightSpeed = cycle.speed;
      cycle.speed = 0;
      if (speedSlider) speedSlider.value = '0';
      if (speedValue) speedValue.textContent = '0x';
      pauseBtn.textContent = '\u25B6 Play';
    } else {
      cycle.speed = _lastDayNightSpeed;
      if (speedSlider) speedSlider.value = String(_lastDayNightSpeed);
      if (speedValue) speedValue.textContent = `${_lastDayNightSpeed}x`;
      pauseBtn.textContent = '\u23F8 Pause';
    }
  });

  // "Now" button — set time to current real-world time
  const nowBtn = document.querySelector('#daynight-now-btn') as HTMLButtonElement | null;
  nowBtn?.addEventListener('click', () => {
    const now: Date = new Date();
    const realHour: number = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    debug.setTime(realHour);
    if (timeSlider) timeSlider.value = String(realHour);
    updateTimeDisplay(realHour);
    // Clear preset dropdown
    const presetSelect = document.querySelector(
      'select[data-control="daynight-preset"]',
    ) as HTMLSelectElement | null;
    if (presetSelect) presetSelect.selectedIndex = -1;
  });

  /**
   * Updates the time display label.
   *
   * @param hour - Current hour (0-23.99).
   */
  function updateTimeDisplay(hour: number): void {
    if (!timeValue) return;
    const wrapped: number = ((hour % 24) + 24) % 24;
    const h = Math.floor(wrapped);
    const m = Math.floor((wrapped % 1) * 60);
    timeValue.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // ── Day/Night Expansion Controls ───────────────────────────────

  // Time Source dropdown
  const timeSourceContainer = document.querySelector('#daynight-timesource-dropdown');
  const dayDurationRow = document.querySelector('#daynight-day-duration-row');
  const reverseRow = document.querySelector('#daynight-reverse-row');
  const timezoneRow = document.querySelector('#daynight-timezone-row');
  const realtimeSeasonRow = document.querySelector('#daynight-realtime-season-row');
  const realtimeMoonRow = document.querySelector('#daynight-realtime-moon-row');

  /**
   * Shows/hides time source dependent controls.
   *
   * @param source - The active time source.
   */
  function updateTimeSourceVisibility(source: string): void {
    if (dayDurationRow) {
      (dayDurationRow as HTMLElement).style.display = source === 'accelerated' ? '' : 'none';
    }
    if (reverseRow) {
      (reverseRow as HTMLElement).style.display = source === 'accelerated' ? '' : 'none';
    }
    if (timezoneRow) {
      (timezoneRow as HTMLElement).style.display = source === 'realtime' ? '' : 'none';
    }
    if (realtimeSeasonRow) {
      (realtimeSeasonRow as HTMLElement).style.display = source === 'realtime' ? '' : 'none';
    }
    if (realtimeMoonRow) {
      (realtimeMoonRow as HTMLElement).style.display = source === 'realtime' ? '' : 'none';
    }
    // Hide speed slider when not accelerated
    if (speedSlider) {
      const speedRow = speedSlider.closest('.control-row') as HTMLElement | null;
      if (speedRow) speedRow.style.display = source === 'accelerated' ? '' : 'none';
    }
  }

  if (timeSourceContainer) {
    timeSourceContainer.append(
      createDropdown(
        'Time Source',
        [
          { value: 'accelerated', label: 'Simulated' },
          { value: 'realtime', label: 'Wall Clock' },
          { value: 'manual', label: 'Slider Only' },
        ],
        'accelerated',
        (val) => {
          const cycle = debug.tilemap?.lighting?.dayNightCycle;
          if (!cycle) return;
          (cycle.config as Record<string, unknown>)['timeSource'] = val;
          updateTimeSourceVisibility(val);
        },
        'daynight-timesource',
        'How time advances. Simulated = adjustable speed, Wall Clock = synced to real time, Slider Only = manual control.',
      ),
    );
  }

  // Day Duration slider (accelerated mode)
  if (dayDurationRow) {
    const dayDurationSlider = createSliderRow(
      'Day Length',
      10,
      3600,
      10,
      1440,
      (val) => {
        const cycle = debug.tilemap?.lighting?.dayNightCycle;
        if (!cycle) return;
        (cycle.config as Record<string, unknown>)['dayDurationSeconds'] = val;
        // Update speed slider to match
        if (speedSlider) {
          const derivedSpeed: number = 24 / val;
          speedSlider.value = String(derivedSpeed);
          if (speedValue) speedValue.textContent = `${derivedSpeed.toFixed(2)}x`;
        }
      },
      'daynight-day-length',
      'Total real-world seconds for one full in-game day. Lower = faster cycle. Syncs with Cycle Speed.',
    );
    // Replace the value label with formatted time
    const dayDurValueSpan = dayDurationSlider.querySelector('.control-value');
    if (dayDurValueSpan) dayDurValueSpan.textContent = '24m 0s';
    const dayDurSliderEl = dayDurationSlider.querySelector(
      'input[type="range"]',
    ) as HTMLInputElement | null;
    dayDurSliderEl?.addEventListener('input', () => {
      const v = Number(dayDurSliderEl.value);
      const mins: number = Math.floor(v / 60);
      const secs: number = v % 60;
      if (dayDurValueSpan)
        dayDurValueSpan.textContent =
          mins > 0 ? `${String(mins)}m ${String(secs)}s` : `${String(secs)}s`;
    });
    dayDurationRow.append(dayDurationSlider);
  }

  // Reverse toggle (accelerated mode)
  if (reverseRow) {
    reverseRow.append(
      createToggleRow(
        'Reverse Time',
        false,
        (on) => {
          const cycle = debug.tilemap?.lighting?.dayNightCycle;
          if (!cycle) return;
          (cycle.config as Record<string, unknown>)['reverse'] = on;
        },
        'daynight-reverse-time',
        'Run the clock backwards — the day rewinds toward midnight.',
      ),
    );
  }

  // Timezone offset slider (realtime mode)
  if (timezoneRow) {
    (timezoneRow as HTMLElement).style.display = 'none';
    timezoneRow.append(
      createSliderRow(
        'UTC Offset (h)',
        -12,
        14,
        0.5,
        0,
        (val) => {
          const cycle = debug.tilemap?.lighting?.dayNightCycle;
          if (!cycle) return;
          (cycle.config as Record<string, unknown>)['timezoneOffset'] = val;
        },
        'daynight-utc-offset',
        'Hours offset from UTC in Wall Clock mode. Shifts the real-world time mapping.',
      ),
    );
  }

  // Realtime season sync toggle (only visible in realtime mode)
  if (realtimeSeasonRow) {
    (realtimeSeasonRow as HTMLElement).style.display = 'none';
    realtimeSeasonRow.append(
      createToggleRow(
        'Sync Season',
        false,
        (on) => {
          const cycle = debug.tilemap?.lighting?.dayNightCycle;
          if (!cycle) return;
          if (on) {
            // Set up the default season map
            (cycle.config as Record<string, unknown>)['realTimeSeasonMap'] = {
              month3: 'spring',
              month6: 'summer',
              month9: 'autumn',
              month12: 'winter',
            };
          } else {
            (cycle.config as Record<string, unknown>)['realTimeSeasonMap'] = undefined;
          }
        },
        'daynight-sync-season',
        'Auto-set season from the current real-world month (Dec–Feb = Winter, Mar–May = Spring, etc.).',
      ),
    );
  }

  // Realtime moon sync toggle (only visible in realtime mode)
  if (realtimeMoonRow) {
    (realtimeMoonRow as HTMLElement).style.display = 'none';
    realtimeMoonRow.append(
      createToggleRow(
        'Sync Moon',
        false,
        (on) => {
          const cycle = debug.tilemap?.lighting?.dayNightCycle;
          if (!cycle) return;
          (cycle.config as Record<string, unknown>)['realtimeMoonSync'] = on;
        },
        'daynight-sync-moon',
        'Auto-track the real-world lunar cycle instead of using the manual Moon Phase slider.',
      ),
    );
  }

  // Initialize time source visibility
  updateTimeSourceVisibility('accelerated');

  // Season dropdown
  const seasonDropdownContainer = document.querySelector('#daynight-season-dropdown');
  if (seasonDropdownContainer) {
    seasonDropdownContainer.append(
      createDropdown(
        'Season',
        [
          { value: 'spring', label: 'Spring' },
          { value: 'summer', label: 'Summer' },
          { value: 'autumn', label: 'Autumn' },
          { value: 'winter', label: 'Winter' },
        ],
        'summer',
        (val) => {
          const cycle = debug.tilemap?.lighting?.dayNightCycle;
          if (!cycle) return;
          const cfg = cycle.config as Record<string, unknown>;
          // Set season and clear explicit sunPath so season override takes effect
          cfg['season'] = val;
          delete cfg['sunPath'];
        },
        'daynight-season',
        'Current season. Controls sunrise/sunset times, sun elevation arc, and ambient color temperature.',
      ),
    );
  }

  // Moon phase slider
  const moonPhaseSlider = document.querySelector('#moonphase-slider') as HTMLInputElement;
  const moonPhaseValue = document.querySelector('#moonphase-value');
  const MOON_PHASE_NAMES: readonly string[] = [
    'New',
    'Wax Cres',
    '1st Qtr',
    'Wax Gib',
    'Full',
    'Wan Gib',
    'Last Qtr',
    'Wan Cres',
  ];

  moonPhaseSlider?.addEventListener('input', () => {
    const phase = Number(moonPhaseSlider.value);
    const cycle = debug.tilemap?.lighting?.dayNightCycle;
    if (cycle) {
      (cycle.config as Record<string, unknown>)['moonPhase'] = phase;
    }
    if (moonPhaseValue) {
      moonPhaseValue.textContent = MOON_PHASE_NAMES[phase] ?? String(phase);
    }
  });

  // Indoor mode dropdown
  const indoorDropdownContainer = document.querySelector('#daynight-indoor-dropdown');
  if (indoorDropdownContainer) {
    indoorDropdownContainer.append(
      createDropdown(
        'Indoor Mode',
        [
          { value: 'outdoor', label: 'Outdoor' },
          { value: 'indoor', label: 'Indoor' },
          { value: 'cave', label: 'Cave' },
          { value: 'firelit', label: 'Firelit' },
          { value: 'dungeon', label: 'Dungeon' },
          { value: 'temple', label: 'Temple' },
          { value: 'underwater', label: 'Underwater' },
          { value: 'custom', label: 'Custom' },
        ],
        'outdoor',
        (val) => {
          const cycle = debug.tilemap?.lighting?.dayNightCycle;
          if (!cycle) return;
          (cycle.config as Record<string, unknown>)['indoorMode'] = val;
          // Show/hide halt time toggle
          const haltRow = document.querySelector('#daynight-halt-time-row') as HTMLElement | null;
          if (haltRow) haltRow.style.display = val === 'outdoor' ? 'none' : '';
        },
        'daynight-indoor',
        'Override outdoor lighting with an indoor environment. Cave, Dungeon, etc. freeze or replace the sky.',
      ),
    );
  }

  // Transition easing dropdown
  const easingDropdownContainer = document.querySelector('#daynight-easing-dropdown');
  if (easingDropdownContainer) {
    easingDropdownContainer.append(
      createDropdown(
        'Time Easing',
        [
          { value: 'linear', label: 'Linear' },
          { value: 'smooth', label: 'Smooth' },
          { value: 'easeIn', label: 'Ease In' },
          { value: 'easeOut', label: 'Ease Out' },
          { value: 'easeInOut', label: 'Ease In/Out' },
          { value: 'sine', label: 'Sine' },
          { value: 'cubic', label: 'Cubic' },
          { value: 'step', label: 'Step' },
        ],
        'linear',
        (val) => {
          const cycle = debug.tilemap?.lighting?.dayNightCycle;
          if (!cycle) return;
          (cycle.config as Record<string, unknown>)['transitionEasing'] = val;
        },
        'daynight-easing',
        'Interpolation curve for smooth lighting transitions between time-of-day keyframes.',
      ),
    );
  }

  // Halt Time toggle (shown only when indoor mode is not outdoor)
  const haltTimeRow = document.querySelector('#daynight-halt-time-row');
  if (haltTimeRow) {
    (haltTimeRow as HTMLElement).style.display = 'none';
    haltTimeRow.append(
      createToggleRow(
        'Freeze Clock',
        false,
        (on) => {
          const cycle = debug.tilemap?.lighting?.dayNightCycle;
          if (!cycle) return;
          const cfg = cycle.config as Record<string, unknown>;
          if (!cfg['indoorModeConfig']) cfg['indoorModeConfig'] = {};
          (cfg['indoorModeConfig'] as Record<string, unknown>)['haltTime'] = on;
        },
        'daynight-freeze-clock',
        'Pause time progression while an Indoor Mode is active. Clock resumes when returning to Outdoor.',
      ),
    );
  }

  // Season Duration slider
  const seasonDurationRow = document.querySelector('#daynight-season-duration-row');
  if (seasonDurationRow) {
    seasonDurationRow.append(
      createSliderRow(
        'Days / Season',
        1,
        30,
        1,
        7,
        (val) => {
          const cycle = debug.tilemap?.lighting?.dayNightCycle;
          if (!cycle) return;
          (cycle.config as Record<string, unknown>)['seasonDurationDays'] = val;
        },
        'daynight-days-per-season',
        'In-game days before the season auto-advances. Lower = faster seasonal cycling.',
      ),
    );
  }

  // Current Day slider
  const currentDayRow = document.querySelector('#daynight-current-day-row');
  if (currentDayRow) {
    currentDayRow.append(
      createSliderRow(
        'Current Day',
        0,
        365,
        0.1,
        0,
        (val) => {
          const cycle = debug.tilemap?.lighting?.dayNightCycle;
          if (!cycle) return;
          cycle._currentDay = val as Num;
        },
        'daynight-current-day',
        'Day counter within the current cycle. Drives season transitions when auto-cycling.',
      ),
    );
  }

  // Season Transition slider
  const seasonTransitionRow = document.querySelector('#daynight-season-transition-row');
  if (seasonTransitionRow) {
    seasonTransitionRow.append(
      createSliderRow(
        'Season Blend',
        0,
        1,
        0.05,
        0,
        (val) => {
          const cycle = debug.tilemap?.lighting?.dayNightCycle;
          if (!cycle) return;
          (cycle.config as Record<string, unknown>)['seasonTransition'] = val;
        },
        'daynight-season-blend',
        'How much of the season boundary to spend blending. 0 = instant switch, 1 = blend the entire season.',
      ),
    );
  }

  // Auto Moon Phase toggle
  const autoMoonRow = document.querySelector('#daynight-auto-moon-row');
  if (autoMoonRow) {
    autoMoonRow.append(
      createToggleRow(
        'Auto Moon',
        false,
        (on) => {
          const cycle = debug.tilemap?.lighting?.dayNightCycle;
          if (!cycle) return;
          (cycle.config as Record<string, unknown>)['autoAdvanceMoonPhase'] = on;
        },
        'daynight-auto-moon',
        'Automatically advance the moon phase over time based on Moon Cycle length.',
      ),
    );
  }

  // Moon Cycle Days slider
  const moonCycleRow = document.querySelector('#daynight-moon-cycle-row');
  if (moonCycleRow) {
    moonCycleRow.append(
      createSliderRow(
        'Moon Cycle (d)',
        1,
        30,
        0.5,
        3.69,
        (val) => {
          const cycle = debug.tilemap?.lighting?.dayNightCycle;
          if (!cycle) return;
          (cycle.config as Record<string, unknown>)['moonCycleDays'] = val;
        },
        'daynight-moon-cycle',
        'In-game days for one full lunar cycle (new moon → new moon). Default ≈ 3.7 days.',
      ),
    );
  }

  // Post-FX Control toggle
  const postFxRow = document.querySelector('#daynight-postfx-row');
  if (postFxRow) {
    postFxRow.append(
      createToggleRow(
        'Drive Post-FX',
        true,
        (on) => {
          const cycle = debug.tilemap?.lighting?.dayNightCycle;
          if (!cycle) return;
          (cycle.config as Record<string, unknown>)['dayNightControlsPostFx'] = on;
        },
        'daynight-drive-post-fx',
        'Let the day/night cycle auto-adjust post-processing (bloom, exposure, tint) to match the time of day.',
      ),
    );
  }

  // Smooth Jump controls — preset dropdown + duration slider + Go button
  const smoothJumpRow = document.querySelector('#daynight-smooth-jump-row');
  if (smoothJumpRow) {
    // Jump target dropdown
    const jumpTargetMap: Record<string, number> = {
      dawn: 5,
      morning: 8,
      noon: 12,
      afternoon: 15,
      dusk: 19,
      night: 22,
      midnight: 0,
    };
    let _jumpTargetHour = 18;
    smoothJumpRow.append(
      createDropdown(
        'Jump Target',
        [
          { value: 'dawn', label: 'Dawn (5:00)' },
          { value: 'morning', label: 'Morning (8:00)' },
          { value: 'noon', label: 'Noon (12:00)' },
          { value: 'afternoon', label: 'Afternoon (15:00)' },
          { value: 'dusk', label: 'Dusk (19:00)' },
          { value: 'night', label: 'Night (22:00)' },
          { value: 'midnight', label: 'Midnight (0:00)' },
        ],
        'dusk',
        (val) => {
          _jumpTargetHour = jumpTargetMap[val] ?? 18;
        },
        'daynight-jump-target',
        'Destination time for a smooth animated jump.',
      ),
    );

    // Duration slider
    smoothJumpRow.append(
      createSliderRow(
        'Jump Time (s)',
        0.5,
        5,
        0.25,
        2,
        (val) => {
          _jumpDurationSec = val;
        },
        'daynight-jump-time',
        'Duration of the smooth jump animation, in seconds.',
      ),
    );
    let _jumpDurationSec = 2;

    // Go button
    const goBtn = document.createElement('button');
    goBtn.className = 'btn';
    goBtn.textContent = '\u25B6 Jump';
    goBtn.title = 'Smoothly animate to the target time';
    goBtn.style.width = '100%';
    goBtn.style.marginTop = '2px';
    goBtn.addEventListener('click', () => {
      const cycle = debug.tilemap?.lighting?.dayNightCycle;
      if (!cycle) return;
      smoothJumpToTime(cycle, _jumpTargetHour as Num, (_jumpDurationSec * 1000) as Num);
    });
    smoothJumpRow.append(goBtn);
  }

  // Read-only displays
  const phaseDisplay = document.querySelector('#daynight-phase-display');
  const seasonDayDisplay = document.querySelector('#daynight-season-day');
  const moonIntensityDisplay = document.querySelector('#daynight-moon-intensity');
  const sunriseSunsetDisplay = document.querySelector('#daynight-sunrise-sunset');
  const sunElevationDisplay = document.querySelector('#daynight-sun-elevation');
  const daylightRemainingDisplay = document.querySelector('#daynight-daylight-remaining');
  const effectiveSpeedDisplay = document.querySelector('#daynight-effective-speed');
  const framesRenderedDisplay = document.querySelector('#daynight-frames-rendered');
  const eventLogDisplay = document.querySelector('#daynight-event-log');
  let lastEventText = '--';

  // Wire up event callbacks
  function wireEventCallbacks(): void {
    const cycle = debug.tilemap?.lighting?.dayNightCycle;
    if (!cycle) return;
    cycle.onSunrise = () => {
      lastEventText = 'Sunrise';
    };
    cycle.onSunset = () => {
      lastEventText = 'Sunset';
    };
    cycle.onHourChange = (hour: Num) => {
      lastEventText = `Hour: ${String(Math.floor(hour))}`;
    };
    cycle.onPhaseChange = (phase: string) => {
      lastEventText = `Phase: ${phase.charAt(0).toUpperCase() + phase.slice(1)}`;
    };
  }

  // Sync time slider + read-only displays in real-time
  scene.registerAfterRender(() => {
    const cycle = debug.tilemap?.lighting?.dayNightCycle;
    if (!cycle) return;
    const t: number = cycle.timeOfDay;
    if (timeSlider && document.activeElement !== timeSlider) {
      timeSlider.value = String(t);
      updateTimeDisplay(t);
    }

    // Use getDayNightStats for all read-only displays
    const statsResult = getDayNightStats(cycle);
    if (statsResult.ok) {
      const stats = statsResult.data;

      if (phaseDisplay) {
        phaseDisplay.textContent =
          stats.currentPhase.charAt(0).toUpperCase() + stats.currentPhase.slice(1);
      }

      if (seasonDayDisplay) {
        const season = stats.currentSeason.charAt(0).toUpperCase() + stats.currentSeason.slice(1);
        seasonDayDisplay.textContent = `${season} / Day ${stats.currentDay.toFixed(1)}`;
      }

      if (moonIntensityDisplay) {
        moonIntensityDisplay.textContent = stats.moonPhaseName;
      }

      if (sunElevationDisplay) {
        sunElevationDisplay.textContent = `${stats.sunElevation.toFixed(1)}°`;
      }

      if (daylightRemainingDisplay) {
        if (stats.daylightRemaining === null && stats.nighttimeRemaining === null) {
          daylightRemainingDisplay.textContent = '--';
        } else if (stats.daylightRemaining === null) {
          daylightRemainingDisplay.textContent = `${(stats.nighttimeRemaining ?? 0).toFixed(1)}h night`;
        } else {
          daylightRemainingDisplay.textContent = `${stats.daylightRemaining.toFixed(1)}h day`;
        }
      }

      if (effectiveSpeedDisplay) {
        effectiveSpeedDisplay.textContent = `${stats.effectiveSpeed.toFixed(4)} h/s`;
      }

      if (framesRenderedDisplay) {
        framesRenderedDisplay.textContent = String(stats.framesRendered);
      }
    }

    // Resolve effective sun path for sunrise/sunset display
    const { sunPath: explicitSunPath } = cycle.config;
    let sunPath = explicitSunPath;
    if (!sunPath) {
      const season = cycle.config.season as string | undefined;
      if (season) {
        const seasonResult = getSeasonSunPath(season);
        if (seasonResult.ok) sunPath = seasonResult.data;
      }
    }
    if (!sunPath) sunPath = { sunrise: 6, sunset: 18, maxElevation: 75, azimuthStart: 90 };

    // Update sunrise/sunset display
    const sr: number = sunPath.sunrise;
    const ss: number = sunPath.sunset;
    if (sunriseSunsetDisplay) {
      sunriseSunsetDisplay.textContent = `${fmtHourMin(sr)} / ${fmtHourMin(ss)}`;
    }

    // Update event log
    if (eventLogDisplay) {
      eventLogDisplay.textContent = lastEventText;
    }
  });

  // Wire callbacks after tilemap is ready (deferred)
  setTimeout(() => {
    wireEventCallbacks();
  }, 100);

  // ── Rendering Toggles ───────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
  (window as any).toggleTilemap = (): void => {
    const el = document.querySelector('#toggle-tilemap');
    const { tilemap } = debug;
    if (!tilemap || !el) return;
    const isOn = el.classList.contains('on');
    for (const chunk of tilemap.chunks) {
      chunk.mesh.isVisible = !isOn;
    }
    for (const cliff of tilemap.cliffChunks) {
      cliff.mesh.isVisible = !isOn;
    }
    for (const gpuLayer of tilemap.gpuLayers) {
      gpuLayer.mesh.isVisible = !isOn;
    }
    el.classList.toggle('on', !isOn);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
  (window as any).togglePostProcess = (): void => {
    const el = document.querySelector('#toggle-postprocess');
    const pp = debug.tilemap?.postProcessing;
    if (!pp || !el) return;
    const { pipeline } = pp;
    if (pipeline) {
      const isOn = el.classList.contains('on');
      // Toggle all individual effects on the DefaultRenderingPipeline
      pipeline.bloomEnabled = !isOn;
      pipeline.depthOfFieldEnabled = !isOn;
      pipeline.fxaaEnabled = !isOn;
      pipeline.grainEnabled = !isOn;
      pipeline.imageProcessingEnabled = !isOn;
      pipeline.sharpenEnabled = !isOn;
      pipeline.chromaticAberrationEnabled = !isOn;
      el.classList.toggle('on', !isOn);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
  (window as any).toggleGlow = (): void => {
    const el = document.querySelector('#toggle-glow');
    const glow = debug.tilemap?.lighting?.glowLayer;
    if (!glow || !el) return;
    glow.isEnabled = !glow.isEnabled;
    el.classList.toggle('on', glow.isEnabled);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
  (window as any).toggleShadows = (): void => {
    const el = document.querySelector('#toggle-shadows');
    const lights = debug.tilemap?.lighting?.lights;
    if (!lights || !el) return;
    const isOn = el.classList.contains('on');
    for (const ml of lights) {
      if (ml.shadowGenerator) {
        // Toggle shadow on the light itself — works for both standard and cascaded generators
        ml.light.shadowEnabled = !isOn;
      }
    }
    el.classList.toggle('on', !isOn);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
  (window as any).toggleGodRays = (): void => {
    const el = document.querySelector('#toggle-godrays');
    const lights = debug.tilemap?.lighting?.lights;
    if (!lights || !el) return;
    const isOn = el.classList.contains('on');
    for (const ml of lights) {
      if (ml.volumetricPostProcess) {
        // Toggle by weight — 0 = invisible, restore = original
        if (isOn) {
          ml.volumetricPostProcess.weight = 0;
        } else {
          ml.volumetricPostProcess.weight =
            ml.config.type === 'directional' ? (ml.config.volumetricLight?.weight ?? 1.5) : 1.5;
        }
      }
    }
    el.classList.toggle('on', !isOn);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
  (window as any).toggleLensFlares = (): void => {
    const el = document.querySelector('#toggle-lensflares');
    const lights = debug.tilemap?.lighting?.lights;
    if (!lights || !el) return;
    const isOn = el.classList.contains('on');
    for (const ml of lights) {
      if (ml.lensFlareSystem) {
        ml.lensFlareSystem.isEnabled = !isOn;
      }
    }
    el.classList.toggle('on', !isOn);
  };
}

// =============================================================================
// UI Helper — value formatting
// =============================================================================

/**
 * Formats a slider value for compact display.
 * Large numbers use "k" suffix, decimals use fixed precision.
 *
 * @param value - The numeric value.
 * @param step - The slider step (determines precision).
 * @returns Formatted string.
 */
function formatSliderValue(value: number, step: number): string {
  if (!Number.isFinite(value)) return '\u221E';
  if (step >= 1) {
    const rounded = Math.round(value);
    if (rounded >= 1_000_000) return `${(rounded / 1_000_000).toFixed(1)}M`;
    if (rounded >= 10_000) return `${String(Math.round(rounded / 1000))}k`;
    if (rounded >= 1000) return `${(rounded / 1000).toFixed(1)}k`;
    return String(rounded);
  }
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toFixed(2);
}

/**
 * Formats a fractional hour to HH:MM string.
 *
 * @param h - Hours as a decimal (e.g. 6.5 → "06:30").
 * @returns Formatted time string.
 */
function fmtHourMin(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.floor((h % 1) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// =============================================================================
// UI Helper — tooltip wrapper
// =============================================================================

/**
 * Wraps a control label span with an optional tooltip icon and bubble.
 * If no tooltip text is provided, returns the label span as-is.
 *
 * @param lbl - The `.control-label` span element.
 * @param tooltip - Optional tooltip description text.
 * @returns The label element (unwrapped) or a `.control-label-wrap` div.
 */
function wrapWithTooltip(lbl: HTMLElement, tooltip?: string): HTMLElement {
  if (!tooltip) return lbl;
  const wrap = document.createElement('div');
  wrap.className = 'control-label-wrap';
  const icon = document.createElement('span');
  icon.className = 'tip-icon';
  icon.textContent = '?';
  const bubble = document.createElement('span');
  bubble.className = 'tip-bubble';
  bubble.textContent = tooltip;
  wrap.append(lbl, icon, bubble);
  return wrap;
}

// =============================================================================
// UI Helper — creates a labeled slider row
// =============================================================================

/**
 * Creates a control-row with label, range slider, and value display.
 *
 * @param label - Display label text.
 * @param min - Slider minimum.
 * @param max - Slider maximum.
 * @param step - Slider step.
 * @param value - Initial value.
 * @param onChange - Callback when slider changes.
 * @param dataControl - Optional data-control attribute value.
 * @param tooltip - Optional tooltip description shown on hover.
 * @returns The row element.
 */
function createSliderRow(
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  onChange: (val: number) => void,
  dataControl?: string,
  tooltip?: string,
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'control-row';
  row.dataset['type'] = 'slider';
  if (dataControl) row.dataset['control'] = dataControl;

  const lbl = document.createElement('span');
  lbl.className = 'control-label';
  lbl.textContent = label;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(value);

  const valEl = document.createElement('span');
  valEl.className = 'control-value';
  valEl.textContent = formatSliderValue(value, step);

  slider.addEventListener('input', () => {
    const v = Number(slider.value);
    valEl.textContent = formatSliderValue(v, step);
    onChange(v);
  });

  row.append(wrapWithTooltip(lbl, tooltip), slider, valEl);
  return row;
}

/**
 * Creates a toggle row with label and toggle switch.
 *
 * @param label - Display label text.
 * @param initialOn - Whether the toggle starts in the "on" state.
 * @param onChange - Callback when toggle changes.
 * @param dataControl - Optional data-control attribute value.
 * @param tooltip - Optional tooltip description shown on hover.
 * @returns The row element.
 */
function createToggleRow(
  label: string,
  initialOn: boolean,
  onChange: (on: boolean) => void,
  dataControl?: string,
  tooltip?: string,
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'toggle-row';
  row.dataset['type'] = 'toggle';
  if (dataControl) row.dataset['control'] = dataControl;

  const lbl = document.createElement('span');
  lbl.className = 'control-label';
  lbl.textContent = label;

  const toggle = document.createElement('div');
  toggle.className = `toggle-switch ${initialOn ? 'on' : ''}`;
  toggle.addEventListener('click', () => {
    const isOn = toggle.classList.contains('on');
    toggle.classList.toggle('on', !isOn);
    onChange(!isOn);
  });

  row.append(wrapWithTooltip(lbl, tooltip), toggle);
  return row;
}

/**
 * Creates a text input row with label and editable text field.
 *
 * @param label - Display label text.
 * @param value - Initial text value.
 * @param onChange - Callback when text changes (on blur or Enter key).
 * @param dataControl - Optional data-control attribute value for automated testing.
 * @param tooltip - Optional tooltip description shown on hover.
 * @returns The row element.
 */
function createTextInputRow(
  label: string,
  value: string,
  onChange: (val: string) => void,
  dataControl?: string,
  tooltip?: string,
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'control-row';
  row.dataset['type'] = 'text';
  if (dataControl) row.dataset['control'] = dataControl;

  const lbl = document.createElement('span');
  lbl.className = 'control-label';
  lbl.textContent = label;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.style.flex = '1';
  input.style.background = '#333';
  input.style.border = '1px solid #555';
  input.style.color = '#eee';
  input.style.padding = '2px 4px';
  input.style.fontSize = '11px';
  input.style.borderRadius = '3px';

  const commit = (): void => {
    onChange(input.value);
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') commit();
  });

  row.append(wrapWithTooltip(lbl, tooltip), input);
  return row;
}

/**
 * Extracts the text input element from a text input row.
 *
 * @param row - The text input row element.
 * @returns The input element.
 */
function getTextInput(row: HTMLElement): HTMLInputElement {
  return row.children[1] as HTMLInputElement;
}

/** Preset color definition for {@link createColorPickerRow}. */
type ColorPreset = { readonly name: string; readonly hex: string };

/** Grid color presets. */
const GRID_COLOR_PRESETS: readonly ColorPreset[] = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Yellow', hex: '#ffff00' },
  { name: 'Cyan', hex: '#00ffff' },
];

/** Selection highlight color presets. */
const SELECTION_COLOR_PRESETS: readonly ColorPreset[] = [
  { name: 'Teal', hex: '#44ccdd' },
  { name: 'Cyan', hex: '#00ffff' },
  { name: 'Yellow', hex: '#ffff00' },
  { name: 'Green', hex: '#00ff00' },
  { name: 'White', hex: '#ffffff' },
];

/**
 * Creates a color picker row with preset swatch buttons and a native color input.
 *
 * Mirrors the pattern from the Effects section's color buttons + custom picker,
 * but built programmatically for use in dynamically-generated UI sections.
 *
 * @param label - Display label text.
 * @param presets - Array of preset color definitions with name and hex.
 * @param initialHex - Initial hex color string (e.g. '#ffffff').
 * @param onChange - Callback when color changes, receives hex string.
 * @param dataControl - Optional data-control attribute value for automated testing.
 * @param tooltip - Optional tooltip description shown on hover.
 * @returns The row element.
 */
function createColorPickerRow(
  label: string,
  presets: readonly ColorPreset[],
  initialHex: string,
  onChange: (hex: string) => void,
  dataControl?: string,
  tooltip?: string,
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'control-row';
  row.dataset['type'] = 'color';
  if (dataControl) row.dataset['control'] = dataControl;
  row.style.flexWrap = 'wrap';

  const lbl = document.createElement('span');
  lbl.className = 'control-label';
  lbl.textContent = label;

  const btnGroup = document.createElement('div');
  btnGroup.className = 'btn-group';
  btnGroup.style.flex = '1';
  btnGroup.style.justifyContent = 'flex-end';

  const buttons: HTMLButtonElement[] = [];

  for (const preset of presets) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.padding = '4px 6px';
    btn.dataset['colorHex'] = preset.hex;
    if (preset.hex.toLowerCase() === initialHex.toLowerCase()) {
      btn.classList.add('active');
    }

    const swatch = document.createElement('span');
    swatch.className = 'color-swatch';
    swatch.style.background = preset.hex;
    swatch.style.width = '12px';
    swatch.style.height = '12px';
    btn.append(swatch);
    btn.title = preset.name;

    btn.addEventListener('click', () => {
      for (const b of buttons) b.classList.remove('active');
      btn.classList.add('active');
      colorInput.value = preset.hex;
      onChange(preset.hex);
    });

    buttons.push(btn);
    btnGroup.append(btn);
  }

  // Native color picker for custom colors
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = initialHex;
  colorInput.style.cssText =
    'width: 28px; height: 20px; border: none; padding: 0; background: transparent; cursor: pointer;';

  colorInput.addEventListener('input', () => {
    for (const b of buttons) b.classList.remove('active');
    onChange(colorInput.value);
  });

  btnGroup.append(colorInput);
  row.append(wrapWithTooltip(lbl, tooltip), btnGroup);
  return row;
}

/**
 * Adds a sub-header label in the control panel.
 *
 * @param text - Sub-header text.
 * @returns The sub-header element.
 */
function createSubHeader(text: string): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText =
    'font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #666; padding: 6px 0 2px; border-top: 1px solid rgba(255,255,255,0.04); margin-top: 4px;';
  el.textContent = text;
  el.dataset['subsection'] = text
    .toLowerCase()
    .replaceAll(/\s+/g, '-')
    .replaceAll(/[^a-z0-9-]/g, '');
  return el;
}

/**
 * Creates a collapsible group with a clickable header and body.
 * Used inside sections for sub-groups (tile inspector categories,
 * layer property groups, etc.).
 *
 * @param title - Group header text.
 * @param collapsed - Whether the group starts collapsed.
 * @returns Object with `root` (the wrapper), `body` (append children here).
 */
function createCollapsibleGroup(
  title: string,
  collapsed: boolean,
): { root: HTMLElement; body: HTMLElement } {
  const root: HTMLElement = document.createElement('div');
  root.className = collapsed ? 'cg collapsed' : 'cg';

  const header: HTMLElement = document.createElement('div');
  header.className = 'cg-header';

  const label: HTMLElement = document.createElement('span');
  label.textContent = title;

  const chevron: HTMLElement = document.createElement('span');
  chevron.className = 'cg-chevron';
  chevron.innerHTML =
    '<svg viewBox="0 0 12 12"><polyline points="2,4 6,8 10,4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  header.append(label, chevron);
  header.addEventListener('click', () => {
    root.classList.toggle('collapsed');
  });

  const body: HTMLElement = document.createElement('div');
  body.className = 'cg-body';

  root.append(header, body);
  return { root, body };
}

// =============================================================================
// Shake UI Builder
// =============================================================================

/**
 * Builds the full screen shake dev harness UI with 8 sub-sections:
 * Presets, Translation, Rotation, FOV, Envelope, Noise, Advanced, Controls.
 *
 * All controls are created programmatically and appended to `#shake-body`.
 *
 * @param scene - The Babylon.js scene.
 * @param camera - The camera to shake.
 */
/* eslint-disable max-lines-per-function */
function buildShakeUI(scene: BABYLON.Scene, camera: BABYLON.Camera): void {
  // ── State variables ─────────────────────────────────────────────
  let shakeIntensity = 0.5;
  let shakeTraumaPower = 2;
  let shakeDecayRate = 0.8;
  let shakeDecayMode: 'linear' | 'exponential' | 'easeOut' = 'exponential';

  let translationEnabled = true;
  let translationAmplitude = 0.5;
  let translationFrequency = 25;

  let rotationEnabled = true;
  let rotationAmplitude = 0.05;
  let rotationFrequency = 20;

  let fovEnabled = true;
  let fovAmplitude = 0.03;
  let fovFrequency = 15;

  let envelopeAttack = 0;
  let envelopeSustain = 0;
  let envelopeDecay = 300;

  let noiseSeed = 0;
  let noiseOctaves = 2;

  let freezeMs = 0;
  let directionX = 0;
  let directionZ = 0;

  // globalScale and masterEnabled are managed via setGlobalScale / setMasterEnabled API only

  // ── Container ───────────────────────────────────────────────────
  const body = document.querySelector('#shake-body');
  if (!body) return;

  // ── Slider / toggle tracking for preset application ─────────────
  const sliders = new Map<string, HTMLInputElement>();
  const toggles = new Map<string, HTMLDivElement>();

  /**
   * Creates a slider row and stores a ref by key.
   *
   * @param parent - Container to append the row to.
   * @param key - Unique key for slider lookup.
   * @param label - Display label text.
   * @param min - Minimum slider value.
   * @param max - Maximum slider value.
   * @param step - Slider step increment.
   * @param value - Initial slider value.
   * @param onChange - Callback when slider changes.
   * @param tooltip - Optional tooltip description shown on hover.
   */
  function addSlider(
    parent: Element,
    key: string,
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onChange: (val: number) => void,
    tooltip?: string,
  ): void {
    const row = createSliderRow(label, min, max, step, value, onChange, `shake-${key}`, tooltip);
    const input = row.querySelector('input[type="range"]') as HTMLInputElement | null;
    if (input) sliders.set(key, input);
    parent.append(row);
  }

  /**
   * Programmatically sets a slider's value and fires its input event.
   *
   * @param key - Unique key for slider lookup.
   * @param value - New slider value.
   */
  function setSlider(key: string, value: number): void {
    const input = sliders.get(key);
    if (!input) return;
    input.value = String(value);
    // eslint-disable-next-line no-undef -- Browser global in dev harness
    input.dispatchEvent(new Event('input'));
  }

  /**
   * Creates a toggle row and stores a ref by key.
   *
   * @param parent - Container to append the row to.
   * @param key - Unique key for toggle lookup.
   * @param label - Display label text.
   * @param initialOn - Whether the toggle starts on.
   * @param onChange - Callback when toggle changes.
   * @param tooltip - Optional tooltip description shown on hover.
   */
  function addToggle(
    parent: Element,
    key: string,
    label: string,
    initialOn: boolean,
    onChange: (on: boolean) => void,
    tooltip?: string,
  ): void {
    const row = createToggleRow(label, initialOn, onChange, `shake-${key}`, tooltip);
    const toggle = row.querySelector('.toggle-switch') as HTMLDivElement | null;
    if (toggle) toggles.set(key, toggle);
    parent.append(row);
  }

  /**
   * Programmatically sets a toggle's state.
   *
   * @param key - Unique key for toggle lookup.
   * @param on - Whether the toggle should be on.
   */
  function setToggle(key: string, on: boolean): void {
    const toggle = toggles.get(key);
    if (!toggle) return;
    const isOn = toggle.classList.contains('on');
    if (isOn !== on) toggle.click();
  }

  // ── Sub-section 1: Presets ───────────────────────────────────────
  body.append(createSubHeader('Presets'));

  const categories: Array<{ label: string; value: ShakePresetCategory }> = [
    { label: 'Combat', value: 'combat' },
    { label: 'Environment', value: 'environment' },
    { label: 'UI/Feedback', value: 'ui' },
    { label: 'Cinematic', value: 'cinematic' },
  ];

  let activeCategory: ShakePresetCategory = 'combat';

  const categoryRow = document.createElement('div');
  categoryRow.className = 'control-row';

  const categoryBtnGroup = document.createElement('div');
  categoryBtnGroup.className = 'btn-group';
  categoryBtnGroup.style.flex = '1';

  const presetContainer = document.createElement('div');
  presetContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 2px; padding: 2px 0;';

  const categoryButtons: HTMLButtonElement[] = [];

  /**
   * Rebuilds the preset buttons for the given category.
   *
   * @param category - The preset category to display.
   */
  function showPresetsForCategory(category: ShakePresetCategory): void {
    presetContainer.innerHTML = '';
    const filtered = SHAKE_PRESETS.filter((p) => p.category === category);
    for (const preset of filtered) {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = preset.name;
      btn.style.fontSize = '10px';
      btn.style.padding = '2px 6px';
      btn.addEventListener('click', () => {
        applyPreset(preset);
      });
      presetContainer.append(btn);
    }
  }

  for (const cat of categories) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = cat.label;
    btn.style.fontSize = '10px';
    if (cat.value === activeCategory) btn.classList.add('active');
    categoryButtons.push(btn);
    categoryBtnGroup.append(btn);
  }

  /**
   * Binds a click handler to a category button.
   *
   * @param btn - The button element.
   * @param cat - The category descriptor.
   */
  function bindCategoryButton(
    btn: HTMLButtonElement,
    cat: { label: string; value: ShakePresetCategory },
  ): void {
    btn.addEventListener('click', () => {
      activeCategory = cat.value;
      for (const b of categoryButtons) b.classList.remove('active');
      btn.classList.add('active');
      showPresetsForCategory(cat.value);
    });
  }

  for (const [idx, cat] of categories.entries()) {
    const btn = categoryButtons[idx];
    if (!btn) continue;
    bindCategoryButton(btn, cat);
  }

  categoryRow.append(categoryBtnGroup);
  body.append(categoryRow, presetContainer);
  showPresetsForCategory(activeCategory);

  // ── Sub-section 2: Translation ──────────────────────────────────
  body.append(createSubHeader('Translation'));
  addToggle(
    body,
    'translationEnabled',
    'Translation On',
    true,
    (on) => {
      translationEnabled = on;
    },
    'Enable horizontal/vertical position shake.',
  );
  addSlider(
    body,
    'translationAmplitude',
    'Shake Amplitude',
    0,
    3,
    0.05,
    0.5,
    (val) => {
      translationAmplitude = val;
    },
    'Max displacement in world units. Higher = more violent shake.',
  );
  addSlider(
    body,
    'translationFrequency',
    'Shake Frequency',
    1,
    100,
    1,
    25,
    (val) => {
      translationFrequency = val;
    },
    'Oscillations per second for position shake. Higher = tighter vibration.',
  );

  // ── Sub-section 3: Rotation ─────────────────────────────────────
  body.append(createSubHeader('Rotation'));
  addToggle(
    body,
    'rotationEnabled',
    'Rotation On',
    true,
    (on) => {
      rotationEnabled = on;
    },
    'Enable camera roll and tilt during shake.',
  );
  addSlider(
    body,
    'rotationAmplitude',
    'Roll Amplitude',
    0,
    0.15,
    0.005,
    0.05,
    (val) => {
      rotationAmplitude = val;
    },
    'Max rotation in radians. Small values (~0.05) feel natural.',
  );
  addSlider(
    body,
    'rotationFrequency',
    'Roll Frequency',
    1,
    100,
    1,
    20,
    (val) => {
      rotationFrequency = val;
    },
    'Oscillations per second for rotational shake.',
  );

  // ── Sub-section 4: FOV ──────────────────────────────────────────
  body.append(createSubHeader('FOV'));
  addToggle(
    body,
    'fovEnabled',
    'FOV Punch On',
    true,
    (on) => {
      fovEnabled = on;
    },
    'Enable field-of-view zoom punch during shake.',
  );
  addSlider(
    body,
    'fovAmplitude',
    'FOV Amplitude',
    0,
    0.1,
    0.005,
    0.03,
    (val) => {
      fovAmplitude = val;
    },
    'Max FOV change in radians. Adds a zoom punch effect.',
  );
  addSlider(
    body,
    'fovFrequency',
    'FOV Frequency',
    1,
    100,
    1,
    15,
    (val) => {
      fovFrequency = val;
    },
    'Oscillations per second for FOV punch.',
  );

  // ── Sub-section 5: Envelope ─────────────────────────────────────
  body.append(createSubHeader('Envelope'));
  addSlider(
    body,
    'envelopeAttack',
    'Attack (ms)',
    0,
    500,
    10,
    0,
    (val) => {
      envelopeAttack = val;
    },
    'Ramp-up time before the shake reaches full intensity.',
  );
  addSlider(
    body,
    'envelopeSustain',
    'Sustain (ms)',
    0,
    2000,
    50,
    0,
    (val) => {
      envelopeSustain = val;
    },
    'Hold time at full intensity before decay begins.',
  );
  addSlider(
    body,
    'envelopeDecay',
    'Decay (ms)',
    0,
    3000,
    50,
    300,
    (val) => {
      envelopeDecay = val;
    },
    'Fade-out time from full intensity to silence.',
  );

  // Decay mode buttons
  const decayRow = document.createElement('div');
  decayRow.className = 'control-row';
  const decayLabel = document.createElement('span');
  decayLabel.className = 'control-label';
  decayLabel.textContent = 'Fade Curve';

  const decayBtnGroup = document.createElement('div');
  decayBtnGroup.className = 'btn-group';
  decayBtnGroup.style.flex = '1';
  decayBtnGroup.style.justifyContent = 'flex-end';

  const decayModes: Array<{ label: string; value: 'linear' | 'exponential' | 'easeOut' }> = [
    { label: 'Linear', value: 'linear' },
    { label: 'Expo', value: 'exponential' },
    { label: 'Ease-out', value: 'easeOut' },
  ];
  const decayButtons: HTMLButtonElement[] = [];
  for (const mode of decayModes) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = mode.label;
    if (mode.value === shakeDecayMode) btn.classList.add('active');
    decayButtons.push(btn);
    decayBtnGroup.append(btn);
  }

  /**
   * Binds a click handler to a decay mode button.
   *
   * @param btn - The button element.
   * @param mode - The decay mode descriptor.
   */
  function bindDecayButton(
    btn: HTMLButtonElement,
    mode: { label: string; value: 'linear' | 'exponential' | 'easeOut' },
  ): void {
    btn.addEventListener('click', () => {
      shakeDecayMode = mode.value;
      for (const b of decayButtons) b.classList.remove('active');
      btn.classList.add('active');
    });
  }

  for (const [idx, mode] of decayModes.entries()) {
    const btn = decayButtons[idx];
    if (!btn) continue;
    bindDecayButton(btn, mode);
  }
  decayRow.append(
    wrapWithTooltip(
      decayLabel,
      'Easing curve for shake decay. Linear = steady, Expo = fast start, Ease-out = gentle finish.',
    ),
    decayBtnGroup,
  );
  body.append(decayRow);

  // ── Sub-section 6: Noise ────────────────────────────────────────
  body.append(createSubHeader('Noise'));
  addSlider(
    body,
    'noiseSeed',
    'Noise Seed',
    0,
    9999,
    1,
    0,
    (val) => {
      noiseSeed = val;
    },
    'Random seed for Perlin noise. Change to get a different shake pattern.',
  );
  addSlider(
    body,
    'noiseOctaves',
    'Noise Octaves',
    1,
    4,
    1,
    2,
    (val) => {
      noiseOctaves = val;
    },
    'Layers of Perlin noise. More octaves = finer detail in the shake.',
  );

  // ── Sub-section 7: Advanced ─────────────────────────────────────
  body.append(createSubHeader('Advanced'));
  addSlider(
    body,
    'intensity',
    'Shake Intensity',
    0,
    3,
    0.05,
    0.5,
    (val) => {
      shakeIntensity = val;
    },
    'Global shake strength multiplier. Scales all axes uniformly.',
  );
  addSlider(
    body,
    'traumaPower',
    'Trauma Power',
    1,
    4,
    0.5,
    2,
    (val) => {
      shakeTraumaPower = val;
    },
    'Exponent applied to trauma. Higher = more contrast between light and heavy hits.',
  );
  addSlider(
    body,
    'decayRate',
    'Trauma Decay',
    0.1,
    5.0,
    0.1,
    0.8,
    (val) => {
      shakeDecayRate = val;
    },
    'Trauma drain per second. Higher = shake fades faster.',
  );
  addSlider(
    body,
    'freezeMs',
    'Freeze (ms)',
    0,
    300,
    10,
    0,
    (val) => {
      freezeMs = val;
    },
    'Brief freeze-frame on impact before the shake begins. 0 = no freeze.',
  );
  addSlider(
    body,
    'directionX',
    'Bias X',
    -1,
    1,
    0.1,
    0,
    (val) => {
      directionX = val;
    },
    'Directional bias on the X axis. 0 = omnidirectional, 1 = right only, -1 = left only.',
  );
  addSlider(
    body,
    'directionZ',
    'Bias Z',
    -1,
    1,
    0.1,
    0,
    (val) => {
      directionZ = val;
    },
    'Directional bias on the Z axis. 0 = omnidirectional, 1 = forward, -1 = backward.',
  );

  // ── Sub-section 8: Controls ─────────────────────────────────────
  body.append(createSubHeader('Controls'));

  // Trigger Shake button
  const triggerBtn = document.createElement('button');
  triggerBtn.className = 'btn';
  triggerBtn.textContent = 'Trigger Shake';
  triggerBtn.style.width = '100%';
  triggerBtn.style.marginTop = '4px';
  triggerBtn.addEventListener('click', () => {
    const config: ScreenShakeConfig = {
      intensity: shakeIntensity,
      traumaPower: shakeTraumaPower,
      decayRate: shakeDecayRate,
      decayMode: shakeDecayMode,
      translation: {
        enabled: translationEnabled,
        amplitude: translationAmplitude,
        frequency: translationFrequency,
      },
      rotation: {
        enabled: rotationEnabled,
        amplitude: rotationAmplitude,
        frequency: rotationFrequency,
      },
      fov: { enabled: fovEnabled, amplitude: fovAmplitude, frequency: fovFrequency },
      envelope: {
        attackMs: envelopeAttack,
        sustainMs: envelopeSustain,
        decayMs: envelopeDecay,
      },
      noise: { seed: noiseSeed, octaves: noiseOctaves },
      direction: directionX === 0 && directionZ === 0 ? null : { x: directionX, z: directionZ },
      freezeMs,
    };
    screenShake({ ...config, scene, camera });
  });
  body.append(triggerBtn);

  // Stop All button
  const stopBtn = document.createElement('button');
  stopBtn.className = 'btn';
  stopBtn.textContent = 'Stop All';
  stopBtn.style.width = '100%';
  stopBtn.style.marginTop = '2px';
  stopBtn.addEventListener('click', () => {
    stopAllShakes();
  });
  body.append(stopBtn);

  // Trauma meter
  const meterRow = document.createElement('div');
  meterRow.className = 'control-row';
  const meterLabel = document.createElement('span');
  meterLabel.className = 'control-label';
  meterLabel.textContent = 'Trauma Level';

  const meterBar = document.createElement('div');
  meterBar.style.cssText =
    'flex: 1; height: 12px; background: #333; border-radius: 3px; overflow: hidden;';
  const meterFill = document.createElement('div');
  meterFill.style.cssText = 'height: 100%; width: 0%; background: #ff4444; transition: width 50ms;';
  meterBar.append(meterFill);

  const meterValue = document.createElement('span');
  meterValue.className = 'control-value';
  meterValue.textContent = '0.00';

  meterRow.append(
    wrapWithTooltip(
      meterLabel,
      'Current trauma value (0-1). Triggers add trauma; it decays over time.',
    ),
    meterBar,
    meterValue,
  );
  body.append(meterRow);

  // Animate trauma meter
  const updateMeter = (): void => {
    const trauma = getTrauma();
    meterFill.style.width = `${(trauma * 100).toFixed(0)}%`;
    meterValue.textContent = trauma.toFixed(2);
    requestAnimationFrame(updateMeter);
  };
  requestAnimationFrame(updateMeter);

  // Global Scale slider
  addSlider(
    body,
    'globalScale',
    'Global Scale',
    0,
    200,
    5,
    100,
    (val) => {
      setGlobalScale(val / 100);
    },
    'Overall shake scale (%). 100 = normal, 200 = double, 0 = muted.',
  );

  // Master Enable toggle
  addToggle(
    body,
    'masterEnabled',
    'Master Enable',
    true,
    (on) => {
      setMasterEnabled(on);
    },
    'Global on/off for the entire shake system.',
  );

  // ── applyPreset ─────────────────────────────────────────────────
  /**
   * Applies a shake preset's config to all UI controls.
   *
   * @param preset - The shake preset to apply.
   */
  function applyPreset(preset: ShakePreset): void {
    const c = preset.config;
    shakeIntensity = c.intensity;
    shakeTraumaPower = c.traumaPower;
    shakeDecayRate = c.decayRate;
    shakeDecayMode = c.decayMode;

    translationEnabled = c.translation.enabled;
    translationAmplitude = c.translation.amplitude;
    translationFrequency = c.translation.frequency;

    rotationEnabled = c.rotation.enabled;
    rotationAmplitude = c.rotation.amplitude;
    rotationFrequency = c.rotation.frequency;

    fovEnabled = c.fov.enabled;
    fovAmplitude = c.fov.amplitude;
    fovFrequency = c.fov.frequency;

    envelopeAttack = c.envelope.attackMs;
    envelopeSustain = c.envelope.sustainMs;
    envelopeDecay = c.envelope.decayMs;

    noiseSeed = c.noise.seed;
    noiseOctaves = c.noise.octaves;

    ({ freezeMs } = c);
    directionX = c.direction?.x ?? 0;
    directionZ = c.direction?.z ?? 0;

    // Update all sliders
    setSlider('intensity', shakeIntensity);
    setSlider('traumaPower', shakeTraumaPower);
    setSlider('decayRate', shakeDecayRate);
    setSlider('translationAmplitude', translationAmplitude);
    setSlider('translationFrequency', translationFrequency);
    setSlider('rotationAmplitude', rotationAmplitude);
    setSlider('rotationFrequency', rotationFrequency);
    setSlider('fovAmplitude', fovAmplitude);
    setSlider('fovFrequency', fovFrequency);
    setSlider('envelopeAttack', envelopeAttack);
    setSlider('envelopeSustain', envelopeSustain);
    setSlider('envelopeDecay', envelopeDecay);
    setSlider('noiseSeed', noiseSeed);
    setSlider('noiseOctaves', noiseOctaves);
    setSlider('freezeMs', freezeMs);
    setSlider('directionX', directionX);
    setSlider('directionZ', directionZ);

    // Update decay mode buttons
    for (const btn of decayButtons) {
      const mode = decayModes.find((m) => m.label === btn.textContent);
      if (mode) btn.classList.toggle('active', mode.value === shakeDecayMode);
    }

    // Update toggles
    setToggle('translationEnabled', translationEnabled);
    setToggle('rotationEnabled', rotationEnabled);
    setToggle('fovEnabled', fovEnabled);
  }
}
/* eslint-enable max-lines-per-function */

/**
 * Creates a control-row with label and styled dropdown.
 *
 * @param label - Display label text.
 * @param options - Array of option strings.
 * @param active - Currently selected option.
 * @param onChange - Callback when selection changes.
 * @param dataControl - Optional data-control attribute value.
 * @param tooltip - Optional tooltip description shown on hover.
 * @returns The row element.
 */
function createDropdown(
  label: string,
  options: ReadonlyArray<string | { readonly value: string; readonly label: string }>,
  active: string,
  onChange: (value: string) => void,
  dataControl?: string,
  tooltip?: string,
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'control-row';
  row.dataset['type'] = 'dropdown';
  if (dataControl) row.dataset['control'] = dataControl;

  const lbl = document.createElement('span');
  lbl.className = 'control-label';
  lbl.textContent = label;

  const select = document.createElement('select');
  select.className = 'control-dropdown';
  if (dataControl) select.dataset['control'] = dataControl;

  for (const opt of options) {
    const optValue = typeof opt === 'string' ? opt : opt.value;
    const optLabel = typeof opt === 'string' ? opt : opt.label;
    const option = document.createElement('option');
    option.value = optValue;
    option.textContent = optLabel;
    option.dataset['value'] = optValue;
    if (optValue === active) option.selected = true;
    select.append(option);
  }

  select.addEventListener('change', () => {
    onChange(select.value);
  });

  row.append(wrapWithTooltip(lbl, tooltip), select);
  return row;
}

// =============================================================================
// Post-Processing UI Builder
// =============================================================================

/**
 * Builds detailed post-processing controls for every sub-effect.
 *
 * @param debug - Debug API reference.
 */
function buildPostProcessingUI(debug: DevDebugApi): void {
  const container = document.querySelector('#postfx-body') as HTMLElement | null;
  const pp = debug.tilemap?.postProcessing;
  if (!container || !pp) return;

  const { pipeline } = pp;
  if (!pipeline) return;

  container.innerHTML = '';

  // ── Exposure & Contrast ──
  const ecGroup = createCollapsibleGroup('Exposure / Contrast', false);
  ecGroup.body.append(
    createSliderRow(
      'Exposure',
      0,
      3,
      0.05,
      pipeline.imageProcessing.exposure,
      (v) => {
        pipeline.imageProcessing.exposure = v;
      },
      'postfx-exposure',
      'Overall brightness multiplier. 1.0 = neutral, >1 = brighter.',
    ),
  );
  ecGroup.body.append(
    createSliderRow(
      'Contrast',
      0,
      3,
      0.05,
      pipeline.imageProcessing.contrast,
      (v) => {
        pipeline.imageProcessing.contrast = v;
      },
      'postfx-contrast',
      'Image contrast. 1.0 = neutral, >1 = more contrast.',
    ),
  );
  container.append(ecGroup.root);

  // ── Bloom ──
  const bloomGroup = createCollapsibleGroup('Bloom', true);
  bloomGroup.body.append(
    createToggleRow(
      'Enabled',
      pipeline.bloomEnabled,
      (on) => {
        pipeline.bloomEnabled = on;
      },
      'postfx-bloom-enabled',
      'Enable bloom glow on bright pixels.',
    ),
  );
  bloomGroup.body.append(
    createSliderRow(
      'Bloom Weight',
      0,
      1,
      0.01,
      pipeline.bloomWeight,
      (v) => {
        pipeline.bloomWeight = v;
      },
      'postfx-bloom-weight',
      'Blend strength of the bloom effect (0–1).',
    ),
  );
  bloomGroup.body.append(
    createSliderRow(
      'Bloom Threshold',
      0,
      1,
      0.01,
      pipeline.bloomThreshold,
      (v) => {
        pipeline.bloomThreshold = v;
      },
      'postfx-bloom-threshold',
      'Minimum brightness for bloom. Lower = more glow.',
    ),
  );
  bloomGroup.body.append(
    createSliderRow(
      'Bloom Kernel',
      1,
      512,
      1,
      pipeline.bloomKernel,
      (v) => {
        pipeline.bloomKernel = v;
      },
      'postfx-bloom-kernel',
      'Blur kernel size. Larger = wider, softer bloom.',
    ),
  );
  bloomGroup.body.append(
    createSliderRow(
      'Bloom Scale',
      0.1,
      1,
      0.05,
      pipeline.bloomScale,
      (v) => {
        pipeline.bloomScale = v;
      },
      'postfx-bloom-scale',
      'Resolution scale of bloom pass. Lower = cheaper but softer.',
    ),
  );
  container.append(bloomGroup.root);

  // ── Depth of Field ──
  const dofGroup = createCollapsibleGroup('Depth of Field', true);
  dofGroup.body.append(
    createToggleRow(
      'Enabled',
      pipeline.depthOfFieldEnabled,
      (on) => {
        pipeline.depthOfFieldEnabled = on;
      },
      'postfx-dof-enabled',
      'Enable depth-of-field blur for out-of-focus areas.',
    ),
  );
  dofGroup.body.append(
    createSliderRow(
      'Focal Length',
      0,
      200,
      1,
      pipeline.depthOfField.focalLength,
      (v) => {
        pipeline.depthOfField.focalLength = v;
      },
      'postfx-dof-focal-length',
      'Lens focal length in mm. Higher = more magnification + blur.',
    ),
  );
  dofGroup.body.append(
    createSliderRow(
      'DoF Aperture (f/)',
      0.1,
      22,
      0.1,
      pipeline.depthOfField.fStop,
      (v) => {
        pipeline.depthOfField.fStop = v;
      },
      'postfx-dof-fstop',
      'f-stop value. Lower = shallower depth of field (more blur).',
    ),
  );
  dofGroup.body.append(
    createSliderRow(
      'Focus Distance',
      0,
      500_000,
      1000,
      pipeline.depthOfField.focusDistance,
      (v) => {
        pipeline.depthOfField.focusDistance = v;
      },
      'postfx-dof-focus-dist',
      'Distance to the in-focus plane in scene units.',
    ),
  );
  container.append(dofGroup.root);

  // ── Chromatic Aberration ──
  const caGroup = createCollapsibleGroup('Chromatic Aberration', true);
  caGroup.body.append(
    createToggleRow(
      'Enabled',
      pipeline.chromaticAberrationEnabled,
      (on) => {
        pipeline.chromaticAberrationEnabled = on;
      },
      'postfx-ca-enabled',
      'Enable chromatic aberration (color fringing at edges).',
    ),
  );
  caGroup.body.append(
    createSliderRow(
      'CA Amount',
      0,
      200,
      1,
      pipeline.chromaticAberration.aberrationAmount,
      (v) => {
        pipeline.chromaticAberration.aberrationAmount = v;
      },
      'postfx-ca-amount',
      'Intensity of color channel separation.',
    ),
  );
  caGroup.body.append(
    createSliderRow(
      'CA Radial',
      0,
      5,
      0.1,
      pipeline.chromaticAberration.radialIntensity,
      (v) => {
        pipeline.chromaticAberration.radialIntensity = v;
      },
      'postfx-ca-radial',
      'How much aberration increases toward screen edges.',
    ),
  );
  container.append(caGroup.root);

  // ── Film Grain ──
  const grainGroup = createCollapsibleGroup('Film Grain', true);
  grainGroup.body.append(
    createToggleRow(
      'Enabled',
      pipeline.grainEnabled,
      (on) => {
        pipeline.grainEnabled = on;
      },
      'postfx-grain-enabled',
      'Enable film grain noise overlay.',
    ),
  );
  grainGroup.body.append(
    createSliderRow(
      'Grain Intensity',
      0,
      100,
      1,
      pipeline.grain.intensity,
      (v) => {
        pipeline.grain.intensity = v;
      },
      'postfx-grain-intensity',
      'Strength of the noise pattern (0–100).',
    ),
  );
  grainGroup.body.append(
    createToggleRow(
      'Grain Animated',
      pipeline.grain.animated,
      (on) => {
        pipeline.grain.animated = on;
      },
      'postfx-grain-animated',
      'Randomize grain pattern each frame for a filmic look.',
    ),
  );
  container.append(grainGroup.root);

  // ── Sharpen ──
  const sharpenGroup = createCollapsibleGroup('Sharpen', true);
  sharpenGroup.body.append(
    createToggleRow(
      'Enabled',
      pipeline.sharpenEnabled,
      (on) => {
        pipeline.sharpenEnabled = on;
      },
      'postfx-sharpen-enabled',
      'Enable image sharpening post-process.',
    ),
  );
  sharpenGroup.body.append(
    createSliderRow(
      'Edge Amount',
      0,
      2,
      0.05,
      pipeline.sharpen.edgeAmount,
      (v) => {
        pipeline.sharpen.edgeAmount = v;
      },
      'postfx-sharpen-edge',
      'Edge enhancement strength. Higher = crisper edges.',
    ),
  );
  sharpenGroup.body.append(
    createSliderRow(
      'Color Amount',
      0,
      1,
      0.05,
      pipeline.sharpen.colorAmount,
      (v) => {
        pipeline.sharpen.colorAmount = v;
      },
      'postfx-sharpen-color',
      'Color sharpening strength. Higher = more saturated edges.',
    ),
  );
  container.append(sharpenGroup.root);

  // ── Vignette ──
  const imgProc = pipeline.imageProcessing;
  const vignetteGroup = createCollapsibleGroup('Vignette', true);
  vignetteGroup.body.append(
    createToggleRow(
      'Enabled',
      imgProc.vignetteEnabled,
      (on) => {
        imgProc.vignetteEnabled = on;
      },
      'postfx-vignette-enabled',
      'Darken screen edges for a cinematic effect.',
    ),
  );
  vignetteGroup.body.append(
    createSliderRow(
      'Vignette Weight',
      0,
      10,
      0.1,
      imgProc.vignetteWeight,
      (v) => {
        imgProc.vignetteWeight = v;
      },
      'postfx-vignette-weight',
      'Darkness intensity at screen edges.',
    ),
  );
  vignetteGroup.body.append(
    createSliderRow(
      'Vignette Stretch',
      0,
      25,
      0.5,
      imgProc.vignetteStretch,
      (v) => {
        imgProc.vignetteStretch = v;
      },
      'postfx-vignette-stretch',
      'How far the vignette extends toward center.',
    ),
  );
  container.append(vignetteGroup.root);

  // ── Tone Mapping ──
  const tmGroup = createCollapsibleGroup('Tone Mapping', true);
  tmGroup.body.append(
    createToggleRow(
      'Enabled',
      imgProc.toneMappingEnabled,
      (on) => {
        imgProc.toneMappingEnabled = on;
      },
      'postfx-tonemapping-enabled',
      'Enable tone mapping to compress HDR to display range.',
    ),
  );
  // Determine current tone mapping name from Babylon constant
  let currentToneMap = 'standard';
  if (imgProc.toneMappingType === BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES) {
    currentToneMap = 'aces';
  } else if (
    imgProc.toneMappingType === BABYLON.ImageProcessingConfiguration.TONEMAPPING_KHR_PBR_NEUTRAL
  ) {
    currentToneMap = 'khr_pbr_neutral';
  }
  tmGroup.body.append(
    createDropdown(
      'Mapping',
      [
        { value: 'standard', label: 'Standard' },
        { value: 'aces', label: 'ACES' },
        { value: 'khr_pbr_neutral', label: 'KHR PBR Neutral' },
      ],
      currentToneMap,
      (type) => {
        switch (type) {
          case 'aces': {
            imgProc.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
            break;
          }
          case 'khr_pbr_neutral': {
            imgProc.toneMappingType =
              BABYLON.ImageProcessingConfiguration.TONEMAPPING_KHR_PBR_NEUTRAL;
            break;
          }
          default: {
            imgProc.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_STANDARD;
          }
        }
      },
      'tonemapping-type',
      'Tone mapping algorithm: Standard, ACES (cinematic), or KHR PBR Neutral.',
    ),
  );
  container.append(tmGroup.root);

  // ── Color Grading ──
  const cgGroup = createCollapsibleGroup('Color Grading', true);
  cgGroup.body.append(
    createToggleRow(
      'Enabled',
      imgProc.colorCurvesEnabled,
      (on) => {
        imgProc.colorCurvesEnabled = on;
      },
      'postfx-colorgrading-enabled',
      'Enable color curve adjustments for stylized looks.',
    ),
  );
  container.append(cgGroup.root);

  // ── FXAA ──
  const fxaaGroup = createCollapsibleGroup('FXAA', true);
  fxaaGroup.body.append(
    createToggleRow(
      'Enabled',
      pipeline.fxaaEnabled,
      (on) => {
        pipeline.fxaaEnabled = on;
      },
      'postfx-fxaa-enabled',
      'Enable fast approximate anti-aliasing to smooth jagged edges.',
    ),
  );
  container.append(fxaaGroup.root);

  // ── Dithering ──
  const ditherGroup = createCollapsibleGroup('Dithering', true);
  ditherGroup.body.append(
    createToggleRow(
      'Enabled',
      imgProc.ditheringEnabled,
      (on) => {
        imgProc.ditheringEnabled = on;
      },
      'postfx-dithering-enabled',
      'Add subtle noise to reduce color banding in gradients.',
    ),
  );
  ditherGroup.body.append(
    createSliderRow(
      'Dither Intensity',
      0,
      1,
      0.001,
      imgProc.ditheringIntensity,
      (v) => {
        imgProc.ditheringIntensity = v;
      },
      'postfx-dithering-intensity',
      'Strength of the dithering pattern (0–1).',
    ),
  );
  container.append(ditherGroup.root);

  // ── SSAO ──
  const ssao = pp.ssaoPipeline;
  if (ssao) {
    const ssaoGroup = createCollapsibleGroup('SSAO', true);
    ssaoGroup.body.append(
      createSliderRow(
        'SSAO Strength',
        0,
        3,
        0.05,
        ssao.totalStrength,
        (v) => {
          ssao.totalStrength = v;
        },
        'postfx-ssao-strength',
        'Overall strength of the SSAO darkening effect.',
      ),
    );
    ssaoGroup.body.append(
      createSliderRow(
        'SSAO Radius',
        0.01,
        16,
        0.1,
        ssao.radius,
        (v) => {
          ssao.radius = v;
        },
        'postfx-ssao-radius',
        'Sample radius in world units. Larger = wider but softer shadows.',
      ),
    );
    ssaoGroup.body.append(
      createSliderRow(
        'SSAO Samples',
        1,
        64,
        1,
        ssao.samples,
        (v) => {
          ssao.samples = v;
        },
        'postfx-ssao-samples',
        'Number of AO samples per pixel. More = smoother but slower.',
      ),
    );
    ssaoGroup.body.append(
      createSliderRow(
        'SSAO Base',
        0,
        1,
        0.01,
        ssao.base,
        (v) => {
          ssao.base = v;
        },
        'postfx-ssao-base',
        'Minimum AO value. Higher = less darkening in occluded areas.',
      ),
    );
    container.append(ssaoGroup.root);
  }
}

// =============================================================================
// Transitions UI Builder
// =============================================================================

/** Human-friendly display names for transition types. */
const TYPE_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  fade: 'Fade',
  crossFade: 'Cross Fade',
  circleIris: 'Circle Iris',
  diamondIris: 'Diamond Iris',
  wipe: 'Wipe',
  diagonalWipe: 'Diagonal Wipe',
  doubleDoor: 'Double Door',
  bars: 'Bars',
  venetianBlinds: 'Venetian Blinds',
  radialWipe: 'Radial Wipe',
  scanlineReveal: 'Scanline Reveal',
  noiseDissove: 'Noise Dissolve',
  ditheredFade: 'Dithered Fade',
  checkerboard: 'Checkerboard',
  randomBlocks: 'Random Blocks',
  crossSplit: 'Cross Split',
  heartIris: 'Heart Iris',
  starIris: 'Star Iris',
  crossIris: 'Cross Iris',
  clockWipe: 'Clock Wipe',
  diagonalBlinds: 'Diagonal Blinds',
  bowTie: 'Bow Tie',
  pixelate: 'Pixelate',
  crtPowerOff: 'CRT Power Off',
  swirl: 'Swirl',
  zoomLines: 'Zoom Lines',
  shatter: 'Shatter',
  wavyDistortion: 'Wavy Distortion',
  hexagonalize: 'Hexagonalize',
  pinwheel: 'Pinwheel',
  polkaDots: 'Polka Dots',
  gridFlip: 'Grid Flip',
  glitch: 'Glitch',
  ripple: 'Ripple',
  wind: 'Wind',
  chromaticBurst: 'Chromatic Burst',
  zoom: 'Zoom',
  spiralWipe: 'Spiral Wipe',
  curtain: 'Curtain',
  dreamDissolve: 'Dream Dissolve',
  filmBurn: 'Film Burn',
  overexposure: 'Overexposure',
  doomMelt: 'Doom Melt',
  tvStatic: 'TV Static',
  matrixRain: 'Matrix Rain',
  mosaic: 'Mosaic',
  burn: 'Burn',
  waterDrop: 'Water Drop',
  squeeze: 'Squeeze',
  flyEye: 'Fly Eye',
  crosshatch: 'Crosshatch',
  luminanceMelt: 'Luminance Melt',
  pageFlip: 'Page Flip',
};

/** Transition type categories for grouped dropdown. */
const TRANSITION_CATEGORIES: ReadonlyArray<{
  readonly label: string;
  readonly types: readonly string[];
}> = [
  { label: 'Fade', types: ['fade', 'crossFade', 'overexposure', 'dreamDissolve'] },
  { label: 'Iris', types: ['circleIris', 'diamondIris', 'heartIris', 'starIris', 'crossIris'] },
  {
    label: 'Wipe',
    types: [
      'wipe',
      'diagonalWipe',
      'doubleDoor',
      'bars',
      'venetianBlinds',
      'radialWipe',
      'scanlineReveal',
      'clockWipe',
      'diagonalBlinds',
      'spiralWipe',
      'curtain',
      'bowTie',
      'crossSplit',
      'pageFlip',
    ],
  },
  {
    label: 'Dissolve',
    types: ['noiseDissove', 'ditheredFade', 'checkerboard', 'randomBlocks', 'luminanceMelt'],
  },
  {
    label: 'Retro',
    types: ['pixelate', 'crtPowerOff', 'doomMelt', 'tvStatic', 'matrixRain'],
  },
  { label: 'Battle', types: ['swirl', 'zoomLines', 'shatter', 'wavyDistortion', 'zoom'] },
  {
    label: 'Geometric',
    types: ['hexagonalize', 'pinwheel', 'polkaDots', 'gridFlip', 'mosaic', 'flyEye'],
  },
  {
    label: 'Distortion',
    types: ['glitch', 'ripple', 'wind', 'chromaticBurst', 'squeeze', 'waterDrop'],
  },
  { label: 'Film', types: ['filmBurn', 'burn', 'crosshatch'] },
];

/** Maps each transition type to its context-sensitive parameter names. */
const TYPE_PARAMS: Record<string, string[]> = {
  wipe: ['direction'],
  doubleDoor: ['direction', 'openFromCenter'],
  bars: ['direction', 'count'],
  venetianBlinds: ['direction', 'count'],
  circleIris: ['centerX', 'centerY'],
  diamondIris: ['centerX', 'centerY'],
  heartIris: ['centerX', 'centerY'],
  starIris: ['centerX', 'centerY', 'pointCount'],
  crossIris: ['centerX', 'centerY'],
  ripple: ['centerX', 'centerY', 'waveCount'],
  diagonalWipe: ['angle'],
  radialWipe: ['angle', 'clockwise'],
  clockWipe: ['clockwise', 'centerX', 'centerY'],
  diagonalBlinds: ['angle', 'count'],
  noiseDissove: ['noiseScale', 'noiseSeed'],
  ditheredFade: ['matrixSize'],
  checkerboard: ['gridSize'],
  randomBlocks: ['gridSize'],
  crossSplit: ['openFromCenter'],
  hexagonalize: ['gridSize'],
  gridFlip: ['gridSize'],
  mosaic: ['gridSize'],
  pixelate: ['maxBlockSize'],
  crtPowerOff: ['scanlines'],
  swirl: ['swirlStrength', 'swirlRadius'],
  zoomLines: ['count', 'zoomLineWidth'],
  shatter: ['cellCount'],
  wavyDistortion: ['amplitude', 'frequency'],
  dreamDissolve: ['amplitude', 'frequency'],
  pinwheel: ['bladeCount'],
  polkaDots: ['count'],
  glitch: ['glitchIntensity'],
  wind: ['direction'],
  chromaticBurst: ['centerX', 'centerY'],
  scanlineReveal: ['lineWidth'],
  crosshatch: ['lineWidth'],
  bowTie: ['axis'],
  curtain: ['axis', 'openFromCenter'],
  squeeze: ['axis'],
  zoom: ['centerX', 'centerY'],
  spiralWipe: ['clockwise', 'centerX', 'centerY'],
  waterDrop: ['centerX', 'centerY', 'amplitude'],
  flyEye: ['cellCount'],
  filmBurn: ['noiseScale', 'noiseSeed'],
  burn: ['noiseScale', 'noiseSeed'],
  luminanceMelt: ['noiseScale'],
  doomMelt: ['gridSize', 'noiseSeed'],
  matrixRain: ['gridSize', 'noiseSeed'],
};

/** Quick preset buttons shown in the transitions panel. */
const QUICK_PRESETS: ReadonlyArray<{ readonly label: string; readonly preset: string }> = [
  { label: 'Fade Black', preset: 'fadeToBlack' },
  { label: 'Fade White', preset: 'fadeToWhite' },
  { label: 'Circle Iris', preset: 'circleIris' },
  { label: 'Pixelate', preset: 'pixelate' },
  { label: 'Wipe Left', preset: 'wipeLeft' },
  { label: 'Noise', preset: 'noiseDissove' },
];

/**
 * Builds the full transitions dev harness UI with type selector,
 * shared parameters, context-sensitive controls, and play buttons.
 *
 * @param scene - The Babylon.js scene.
 */
// eslint-disable-next-line max-lines-per-function -- Dev harness UI builder
function buildTransitionsUI(scene: BABYLON.Scene): void {
  const container = document.querySelector('#transitions-body') as HTMLElement | null;
  if (!container) return;
  container.innerHTML = '';

  // -- State --
  let currentType = 'fade';
  let currentDuration = 1000;
  let currentEasing = 'easeInOut';
  let currentColor = { r: 0, g: 0, b: 0 };
  let currentEdgeSoftness = 0.02;
  let currentEdgeColor: { r: number; g: number; b: number } | null = null;
  let currentEdgeColorEnabled = false;
  // Type-specific param state (defaults from schema):
  let currentDirection = 'left';
  let currentOpenFromCenter = false;
  let currentCenterX = 0.5;
  let currentCenterY = 0.5;
  let currentCount = 10;
  let currentGridSize = 8;
  let currentAngle = 45;
  let currentClockwise = true;
  let currentBladeCount = 4;
  let currentNoiseScale = 4;
  let currentNoiseSeed = 0;
  let currentMatrixSize = 4;
  let currentLineWidth = 2;
  let currentMaxBlockSize = 32;
  let currentScanlines = true;
  let currentSwirlStrength = 10;
  let currentSwirlRadius = 0.5;
  let currentLineCount = 12;
  let currentZoomLineWidth = 0.02;
  let currentCellCount = 20;
  let currentAmplitude = 0.1;
  let currentFrequency = 10;
  let currentIntensity = 1;
  let currentWaveCount = 5;
  let currentPointCount = 5;
  let lastHandle: { readonly dispose: () => void } | null = null;

  /**
   * Builds a transition config object from the current UI state.
   *
   * @param reverse - Whether to play in reverse (transition in).
   * @returns Config record suitable for playTransition.
   */
  function buildConfig(reverse: boolean): Record<string, unknown> {
    const config: Record<string, unknown> = {
      type: currentType,
      durationMs: currentDuration,
      easing: currentEasing,
      color: currentColor,
      edgeSoftness: currentEdgeSoftness,
      reverse,
    };
    if (currentEdgeColorEnabled && currentEdgeColor) {
      config['edgeColor'] = currentEdgeColor;
    }
    // Map param names to their current values
    const paramValues: Record<string, unknown> = {
      direction: currentDirection,
      openFromCenter: currentOpenFromCenter,
      centerX: currentCenterX,
      centerY: currentCenterY,
      count: currentCount,
      gridSize: currentGridSize,
      angle: currentAngle,
      clockwise: currentClockwise,
      bladeCount: currentBladeCount,
      noiseScale: currentNoiseScale,
      noiseSeed: currentNoiseSeed,
      matrixSize: currentMatrixSize,
      lineWidth: currentLineWidth,
      maxBlockSize: currentMaxBlockSize,
      scanlines: currentScanlines,
      swirlStrength: currentSwirlStrength,
      swirlRadius: currentSwirlRadius,
      lineCount: currentLineCount,
      zoomLineWidth: currentZoomLineWidth,
      cellCount: currentCellCount,
      amplitude: currentAmplitude,
      frequency: currentFrequency,
      intensity: currentIntensity,
      glitchIntensity: currentIntensity,
      waveCount: currentWaveCount,
      pointCount: currentPointCount,
    };
    const params = TYPE_PARAMS[currentType];
    if (params) {
      for (const p of params) {
        config[p] = paramValues[p];
      }
    }
    return config;
  }

  /**
   * Plays a transition in one direction.
   *
   * @param reverse - True for transition-in, false for transition-out.
   */
  function play(reverse: boolean): void {
    const cam = scene.activeCamera;
    if (!cam) return;
    const eng = scene.getEngine();
    if (lastHandle) {
      lastHandle.dispose();
      lastHandle = null;
    }
    const result = playTransition({
      scene,
      camera: cam,
      engine: eng,
      config: buildConfig(reverse),
    });
    if (result.ok) lastHandle = result.data;
  }

  /**
   * Plays a full out-then-in transition cycle.
   */
  function playCycle(): void {
    const cam = scene.activeCamera;
    if (!cam) return;
    const eng = scene.getEngine();
    if (lastHandle) {
      lastHandle.dispose();
      lastHandle = null;
    }
    const outConfig = buildConfig(false);
    const result = playTransition({ scene, camera: cam, engine: eng, config: outConfig });
    if (result.ok) {
      lastHandle = result.data;
      setTimeout(() => {
        // Dispose the out-transition before playing in-transition
        if (lastHandle) {
          lastHandle.dispose();
          lastHandle = null;
        }
        const inConfig = buildConfig(true);
        const inResult = playTransition({
          scene,
          camera: cam,
          engine: eng,
          config: inConfig,
        });
        if (inResult.ok) lastHandle = inResult.data;
      }, currentDuration + 100);
    }
  }

  // ── Type Selector (grouped dropdown with <optgroup>) ──
  const typeRow = document.createElement('div');
  typeRow.className = 'control-row';
  typeRow.dataset['type'] = 'dropdown';
  typeRow.dataset['control'] = 'transition-type';
  const typeLbl = document.createElement('span');
  typeLbl.className = 'control-label';
  typeLbl.textContent = 'Effect Type';
  const typeSelect = document.createElement('select');
  typeSelect.className = 'control-dropdown';
  for (const cat of TRANSITION_CATEGORIES) {
    const group = document.createElement('optgroup');
    group.label = cat.label;
    for (const t of cat.types) {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = TYPE_DISPLAY_NAMES[t] ?? t;
      if (t === currentType) opt.selected = true;
      group.append(opt);
    }
    typeSelect.append(group);
  }
  typeSelect.addEventListener('change', () => {
    currentType = typeSelect.value;
    updateContextParams();
  });
  typeRow.append(
    wrapWithTooltip(
      typeLbl,
      'Transition visual effect. Pick from fade, iris, wipe, dissolve, retro, battle, geometric, distortion, or film styles.',
    ),
    typeSelect,
  );
  container.append(typeRow);

  // ── Play Buttons ──
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 4px; padding: 4px 0;';

  const playOutBtn = document.createElement('button');
  playOutBtn.className = 'btn';
  playOutBtn.textContent = '▶ Out';
  playOutBtn.title = 'Play the transition OUT (screen goes dark/covered).';
  playOutBtn.style.flex = '1';
  playOutBtn.addEventListener('click', () => play(false));

  const playInBtn = document.createElement('button');
  playInBtn.className = 'btn';
  playInBtn.textContent = '◀ In';
  playInBtn.title = 'Play the transition IN (screen revealed from dark/covered).';
  playInBtn.style.flex = '1';
  playInBtn.addEventListener('click', () => play(true));

  const playCycleBtn = document.createElement('button');
  playCycleBtn.className = 'btn';
  playCycleBtn.textContent = '↻ Out + In';
  playCycleBtn.title = 'Play a full Out → In cycle to preview the complete transition.';
  playCycleBtn.style.flex = '1';
  playCycleBtn.addEventListener('click', () => playCycle());

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn';
  resetBtn.textContent = '✕ Reset';
  resetBtn.title = 'Cancel any active transition and restore the normal view.';
  resetBtn.style.flex = '1';
  resetBtn.addEventListener('click', () => {
    if (lastHandle) {
      lastHandle.dispose();
      lastHandle = null;
    }
  });

  btnRow.append(playOutBtn, playInBtn, playCycleBtn, resetBtn);
  container.append(btnRow);

  // ── Quick Presets Row ──
  container.append(createSubHeader('Quick Presets'));
  const presetRow = document.createElement('div');
  presetRow.style.cssText = 'display: flex; gap: 3px; flex-wrap: wrap; padding: 2px 0;';

  /**
   * Applies a named preset and plays a full transition cycle.
   *
   * @param presetName - Key in TRANSITION_PRESETS to apply.
   */
  function applyPreset(presetName: string): void {
    const presetConfig = (TRANSITION_PRESETS as Record<string, Record<string, unknown>>)[
      presetName
    ];
    if (!presetConfig) return;
    currentType = (presetConfig['type'] as string) ?? 'fade';
    typeSelect.value = currentType;
    if (presetConfig['durationMs'] !== undefined) {
      currentDuration = presetConfig['durationMs'] as number;
    }
    updateContextParams();
    playCycle();
  }

  for (const qp of QUICK_PRESETS) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = qp.label;
    btn.style.cssText = 'font-size: 10px; padding: 2px 6px;';
    const { preset } = qp;
    btn.addEventListener('click', () => applyPreset(preset));
    presetRow.append(btn);
  }
  container.append(presetRow);

  // ── Shared Parameters ──
  container.append(createSubHeader('Parameters'));

  // Duration slider with "ms" suffix (custom instead of createSliderRow to avoid "1.0k" formatting)
  const durRow = document.createElement('div');
  durRow.className = 'control-row';
  durRow.dataset['type'] = 'slider';
  durRow.dataset['control'] = 'transition-duration';
  const durLbl = document.createElement('span');
  durLbl.className = 'control-label';
  durLbl.textContent = 'Duration (ms)';
  const durSlider = document.createElement('input');
  durSlider.type = 'range';
  durSlider.min = '0';
  durSlider.max = '30000';
  durSlider.step = '50';
  durSlider.value = String(currentDuration);
  const durVal = document.createElement('span');
  durVal.className = 'control-value';
  durVal.textContent = `${currentDuration}ms`;
  durVal.style.cursor = 'pointer';
  durVal.title = 'Click to enter a custom duration';
  durSlider.addEventListener('input', () => {
    const v = Number(durSlider.value);
    durVal.textContent = `${v}ms`;
    currentDuration = v;
  });

  // Inline-editable duration value (click the "500ms" to type a custom value)
  const durInlineInput = document.createElement('input');
  durInlineInput.type = 'number';
  durInlineInput.className = 'nav-input';
  durInlineInput.min = '0';
  durInlineInput.max = '60000';
  durInlineInput.step = '50';
  durInlineInput.style.display = 'none';
  durInlineInput.style.width = '60px';

  const applyDurInline = (): void => {
    const v = Math.max(0, Math.min(60000, Number(durInlineInput.value) || 0));
    currentDuration = v;
    durSlider.value = String(Math.min(30000, v));
    durVal.textContent = `${v}ms`;
    durInlineInput.style.display = 'none';
    durVal.style.display = '';
  };

  durVal.addEventListener('click', () => {
    durInlineInput.value = String(currentDuration);
    durVal.style.display = 'none';
    durInlineInput.style.display = '';
    durInlineInput.focus();
    durInlineInput.select();
  });

  durInlineInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') applyDurInline();
    if (e.key === 'Escape') {
      durInlineInput.style.display = 'none';
      durVal.style.display = '';
    }
  });
  durInlineInput.addEventListener('blur', applyDurInline);

  durRow.append(
    wrapWithTooltip(
      durLbl,
      'Transition length in milliseconds. 0 = instant, 500 = fast, 2000 = slow, 30000 = cinematic.',
    ),
    durSlider,
    durVal,
    durInlineInput,
  );
  container.append(durRow);

  container.append(
    createDropdown(
      'Easing Curve',
      [
        { value: 'linear', label: 'Linear' },
        { value: 'easeIn', label: 'Ease In' },
        { value: 'easeOut', label: 'Ease Out' },
        { value: 'easeInOut', label: 'Ease In/Out' },
        { value: 'easeOutBack', label: 'Ease Out Back' },
        { value: 'easeInOutCubic', label: 'Ease In/Out Cubic' },
      ],
      currentEasing,
      (val) => {
        currentEasing = val;
      },
      'transition-easing',
      'Animation timing function. Controls acceleration/deceleration of the effect.',
    ),
  );

  const BG_COLOR_PRESETS: readonly ColorPreset[] = [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#ffffff' },
    { name: 'Red', hex: '#ff0000' },
    { name: 'Green', hex: '#00ff00' },
    { name: 'Blue', hex: '#0000ff' },
  ];
  container.append(
    createColorPickerRow(
      'Background',
      BG_COLOR_PRESETS,
      '#000000',
      (hex) => {
        currentColor = {
          r: Number.parseInt(hex.slice(1, 3), 16) / 255,
          g: Number.parseInt(hex.slice(3, 5), 16) / 255,
          b: Number.parseInt(hex.slice(5, 7), 16) / 255,
        };
      },
      'transition-bg-color',
      'Solid color shown behind the transition mask (usually black or white).',
    ),
  );

  container.append(
    createSliderRow(
      'Edge Softness',
      0,
      0.5,
      0.01,
      currentEdgeSoftness,
      (val) => {
        currentEdgeSoftness = val;
      },
      'transition-edge-softness',
      'Blur width at transition edges. 0 = hard cut, higher = feathered gradient.',
    ),
  );

  container.append(
    createToggleRow(
      'Edge Glow',
      false,
      (on) => {
        currentEdgeColorEnabled = on;
        edgeColorRow.style.display = on ? 'flex' : 'none';
      },
      'transition-edge-glow',
      'Enable a colored glow/outline at the transition boundary.',
    ),
  );

  const EDGE_COLOR_PRESETS: readonly ColorPreset[] = [
    { name: 'White', hex: '#ffffff' },
    { name: 'Gold', hex: '#ffd700' },
    { name: 'Cyan', hex: '#00ffff' },
  ];
  const edgeColorRow = createColorPickerRow(
    'Edge Color',
    EDGE_COLOR_PRESETS,
    '#ffffff',
    (hex) => {
      currentEdgeColor = {
        r: Number.parseInt(hex.slice(1, 3), 16) / 255,
        g: Number.parseInt(hex.slice(3, 5), 16) / 255,
        b: Number.parseInt(hex.slice(5, 7), 16) / 255,
      };
    },
    'transition-edge-color',
    'Color of the glow at the transition boundary when Edge Glow is on.',
  );
  edgeColorRow.style.display = 'none';
  container.append(edgeColorRow);

  // ── Context-Sensitive Parameters ──
  const typeOptionsHeader = createSubHeader('Type Options');
  container.append(typeOptionsHeader);

  // Build each context-sensitive control element
  const directionEl = createDropdown(
    'Direction',
    [
      { value: 'left', label: 'Left' },
      { value: 'right', label: 'Right' },
      { value: 'up', label: 'Up' },
      { value: 'down', label: 'Down' },
    ],
    currentDirection,
    (val) => {
      currentDirection = val;
    },
    'transition-direction',
    'Wipe/slide direction for directional transition effects.',
  );
  const openFromCenterEl = createToggleRow(
    'From Center',
    currentOpenFromCenter,
    (on) => {
      currentOpenFromCenter = on;
    },
    'transition-from-center',
    'Start the effect from screen center instead of an edge.',
  );
  const centerXEl = createSliderRow(
    'Center X',
    0,
    1,
    0.05,
    currentCenterX,
    (val) => {
      currentCenterX = val;
    },
    'transition-center-x',
    'Horizontal origin (0=left, 0.5=center, 1=right) for radial effects.',
  );
  const centerYEl = createSliderRow(
    'Center Y',
    0,
    1,
    0.05,
    currentCenterY,
    (val) => {
      currentCenterY = val;
    },
    'transition-center-y',
    'Vertical origin (0=top, 0.5=center, 1=bottom) for radial effects.',
  );
  const countEl = createSliderRow(
    'Slice Count',
    2,
    30,
    1,
    currentCount,
    (val) => {
      currentCount = val;
    },
    'transition-count',
    'Number of segments for multi-slice effects (blinds, strips).',
  );
  const gridSizeEl = createSliderRow(
    'Grid Size',
    2,
    32,
    1,
    currentGridSize,
    (val) => {
      currentGridSize = val;
    },
    'transition-grid-size',
    'Tile count per axis for grid-based transitions (pixelate, blocks).',
  );
  const angleEl = createSliderRow(
    'Angle (deg)',
    0,
    360,
    5,
    currentAngle,
    (val) => {
      currentAngle = val;
    },
    'transition-angle',
    'Rotation angle for angular wipe and radial effects.',
  );
  const clockwiseEl = createToggleRow(
    'Clockwise',
    currentClockwise,
    (on) => {
      currentClockwise = on;
    },
    'transition-clockwise',
    'Radial effects rotate clockwise when on, counter-clockwise when off.',
  );
  const bladeCountEl = createSliderRow(
    'Blade Count',
    2,
    12,
    1,
    currentBladeCount,
    (val) => {
      currentBladeCount = val;
    },
    'transition-blade-count',
    'Number of fan blades for pinwheel/radial-wipe effects.',
  );
  const noiseScaleEl = createSliderRow(
    'Noise Scale',
    1,
    20,
    0.5,
    currentNoiseScale,
    (val) => {
      currentNoiseScale = val;
    },
    'transition-noise-scale',
    'Perlin noise pattern size for dissolve effects. Smaller = finer grain.',
  );
  const noiseSeedEl = createSliderRow(
    'Noise Seed',
    0,
    100,
    1,
    currentNoiseSeed,
    (val) => {
      currentNoiseSeed = val;
    },
    'transition-noise-seed',
    'Random seed for noise-based effects. Different seeds = different patterns.',
  );
  const matrixSizeEl = createDropdown(
    'Dither Matrix',
    [
      { value: '2', label: '2x2' },
      { value: '4', label: '4x4' },
      { value: '8', label: '8x8' },
    ],
    String(currentMatrixSize),
    (val) => {
      currentMatrixSize = Number(val);
    },
    'transition-matrix-size',
    'Dither grid resolution for retro-style transitions. Larger = smoother.',
  );
  const lineWidthEl = createSliderRow(
    'Line Width',
    0.5,
    8,
    0.5,
    currentLineWidth,
    (val) => {
      currentLineWidth = val;
    },
    'transition-line-width',
    'Stroke thickness for line-based transition effects.',
  );
  const maxBlockSizeEl = createSliderRow(
    'Block Size (px)',
    4,
    128,
    4,
    currentMaxBlockSize,
    (val) => {
      currentMaxBlockSize = val;
    },
    'transition-block-size',
    'Pixel block size for pixelation and mosaic transitions.',
  );
  const scanlinesEl = createToggleRow(
    'Scanlines',
    currentScanlines,
    (on) => {
      currentScanlines = on;
    },
    'transition-scanlines',
    'Add CRT-style horizontal scanline overlay during the transition.',
  );
  const swirlStrengthEl = createSliderRow(
    'Strength',
    1,
    30,
    1,
    currentSwirlStrength,
    (val) => {
      currentSwirlStrength = val;
    },
    'transition-strength',
    'Effect intensity for distortion-based transitions (ripple, wave, zoom).',
  );
  const swirlRadiusEl = createSliderRow(
    'Radius',
    0.1,
    1,
    0.05,
    currentSwirlRadius,
    (val) => {
      currentSwirlRadius = val;
    },
    'transition-radius',
    'Effect spread radius from the center point (0–1 = fraction of screen).',
  );
  const lineCountEl = createSliderRow(
    'Line Count',
    4,
    30,
    1,
    currentLineCount,
    (val) => {
      currentLineCount = val;
    },
    'transition-line-count',
    'Number of lines for line-based geometric transitions.',
  );
  const zoomLineWidthEl = createSliderRow(
    'Line Weight',
    0.005,
    0.1,
    0.005,
    currentZoomLineWidth,
    (val) => {
      currentZoomLineWidth = val;
    },
    'transition-line-weight',
    'Line thickness as fraction of screen for geometric effects.',
  );
  const cellCountEl = createSliderRow(
    'Cell Count',
    5,
    50,
    1,
    currentCellCount,
    (val) => {
      currentCellCount = val;
    },
    'transition-cell-count',
    'Number of cells for Voronoi/cellular transitions.',
  );
  const amplitudeEl = createSliderRow(
    'Amplitude',
    0.01,
    0.5,
    0.01,
    currentAmplitude,
    (val) => {
      currentAmplitude = val;
    },
    'transition-amplitude',
    'Displacement amount for wave and ripple transitions.',
  );
  const frequencyEl = createSliderRow(
    'Frequency',
    1,
    30,
    1,
    currentFrequency,
    (val) => {
      currentFrequency = val;
    },
    'transition-frequency',
    'Wave repetitions for oscillating transitions. Higher = more waves.',
  );
  const intensityEl = createSliderRow(
    'Intensity',
    0.1,
    3,
    0.1,
    currentIntensity,
    (val) => {
      currentIntensity = val;
    },
    'transition-intensity',
    'Overall strength multiplier for distortion transitions.',
  );
  const waveCountEl = createSliderRow(
    'Wave Count',
    1,
    15,
    1,
    currentWaveCount,
    (val) => {
      currentWaveCount = val;
    },
    'transition-wave-count',
    'Number of concurrent waves for multi-wave effects.',
  );
  const pointCountEl = createSliderRow(
    'Star Points',
    3,
    12,
    1,
    currentPointCount,
    (val) => {
      currentPointCount = val;
    },
    'transition-star-points',
    'Number of points on the star shape for star-wipe transitions.',
  );

  // Assemble context controls map
  const contextControls: Record<string, HTMLElement> = {
    direction: directionEl,
    openFromCenter: openFromCenterEl,
    centerX: centerXEl,
    centerY: centerYEl,
    count: countEl,
    gridSize: gridSizeEl,
    angle: angleEl,
    clockwise: clockwiseEl,
    bladeCount: bladeCountEl,
    noiseScale: noiseScaleEl,
    noiseSeed: noiseSeedEl,
    matrixSize: matrixSizeEl,
    lineWidth: lineWidthEl,
    maxBlockSize: maxBlockSizeEl,
    scanlines: scanlinesEl,
    swirlStrength: swirlStrengthEl,
    swirlRadius: swirlRadiusEl,
    lineCount: lineCountEl,
    zoomLineWidth: zoomLineWidthEl,
    cellCount: cellCountEl,
    amplitude: amplitudeEl,
    frequency: frequencyEl,
    intensity: intensityEl,
    glitchIntensity: intensityEl,
    waveCount: waveCountEl,
    pointCount: pointCountEl,
  };

  // Append all controls and initially hide them
  const contextContainer = document.createElement('div');
  contextContainer.id = 'transition-context-params';
  for (const [key, el] of Object.entries(contextControls)) {
    el.dataset['transParam'] = key;
    el.style.display = 'none';
    contextContainer.append(el);
  }
  container.append(contextContainer);

  /**
   * Shows/hides context-sensitive controls based on the current transition type.
   */
  function updateContextParams(): void {
    const visibleParams = TYPE_PARAMS[currentType] ?? [];
    typeOptionsHeader.style.display = visibleParams.length > 0 ? '' : 'none';
    for (const [key, el] of Object.entries(contextControls)) {
      el.style.display = visibleParams.includes(key) ? '' : 'none';
    }
  }

  updateContextParams();
}

// =============================================================================
// Fog UI Builder
// =============================================================================

// =============================================================================
// Fog State
// =============================================================================

/** Current fog configuration state. */
let _fogConfig: FogConfig = {
  mode: 'none',
  color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
  density: 0.01,
  start: 50,
  end: 300,
  maxOpacity: 1,
  startDistance: 0,
  cutoffDistance: 0,
  excludeSkybox: true,
  skyAffect: 0,
  overlays: [],
};

/** Active fog handle (null until fog is applied). */
let _fogHandle: FogHandle | null = null;

/** Currently selected fog preset name (tracks dropdown selection). */
let _currentFogPreset: FogPresetName = 'clear';

/**
 * Updates fog config and applies changes via the fog manager.
 *
 * @param scene - The Babylon.js scene.
 * @param camera - The camera.
 * @param engine - The engine.
 */
function applyFogConfig(
  scene: BABYLON.Scene,
  camera: BABYLON.Camera,
  engine: BABYLON.AbstractEngine,
): void {
  if (_fogHandle) {
    updateFog(_fogHandle, _fogConfig);
  } else {
    const result = applyFog(scene, camera, engine, _fogConfig);
    if (result.ok) {
      _fogHandle = result.data;
    }
  }
}

/** Human-friendly labels for fog preset names. */
const FOG_PRESET_LABELS: Readonly<Record<FogPresetName, string>> = {
  clear: 'Clear',
  lightMist: 'Light Mist',
  morningFog: 'Morning Fog',
  denseFog: 'Dense Fog',
  dungeon: 'Dungeon',
  underwater: 'Underwater',
  forest: 'Forest',
  mountain: 'Mountain',
  sandstorm: 'Sandstorm',
  snowstorm: 'Snowstorm',
  dream: 'Dream',
  volcanic: 'Volcanic',
  swamp: 'Swamp',
  nightMist: 'Night Mist',
};

/**
 * Builds expanded fog controls with 12 sub-groups covering 77+ options.
 *
 * @param scene - The Babylon.js scene.
 * @param camera - The camera for PostProcess attachment.
 * @param engine - The engine reference.
 */
// eslint-disable-next-line max-lines-per-function
function buildFogUI(
  scene: BABYLON.Scene,
  camera: BABYLON.Camera,
  engine: BABYLON.AbstractEngine,
): void {
  const container = document.querySelector('#fog-body') as HTMLElement | null;
  if (!container) return;

  container.innerHTML = '';

  /** Helper to update config and re-apply. */
  const update = (): void => {
    applyFogConfig(scene, camera, engine);
  };

  // =========================================================================
  // Presets
  // =========================================================================

  container.append(
    createDropdown(
      'Fog Preset',
      FOG_PRESET_NAMES.map((name) => ({
        value: name,
        label: FOG_PRESET_LABELS[name],
      })),
      _currentFogPreset,
      (val) => {
        const presetName = val as FogPresetName;
        _currentFogPreset = presetName;
        const preset = FOG_PRESETS[presetName];
        _fogConfig = { ...preset };
        if (_fogHandle) {
          applyFogPreset(_fogHandle, presetName);
        } else {
          update();
        }
        // Rebuild UI to reflect preset values
        buildFogUI(scene, camera, engine);
      },
      'fog-preset',
      'Quick-load a pre-configured fog setup.',
    ),
  );

  // =========================================================================
  // Core
  // =========================================================================

  const coreGroup = createCollapsibleGroup('Core', false);

  coreGroup.body.append(
    createDropdown(
      'Mode',
      [
        { value: 'none', label: 'None' },
        { value: 'linear', label: 'Linear' },
        { value: 'exponential', label: 'Exponential' },
        { value: 'exponential2', label: 'Exponential²' },
      ],
      _fogConfig.mode,
      (mode) => {
        _fogConfig = { ..._fogConfig, mode: mode as FogConfig['mode'] };
        update();
      },
      'fog-mode',
      'Fog falloff algorithm. Linear = distance, Exponential = density-based.',
    ),
  );

  coreGroup.body.append(
    createSliderRow(
      'Density',
      0,
      0.1,
      0.001,
      _fogConfig.density,
      (v) => {
        _fogConfig = { ..._fogConfig, density: v };
        update();
      },
      'fog-density',
      'Exponential fog thickness. Higher = fog appears closer.',
    ),
  );

  coreGroup.body.append(
    createSliderRow(
      'Start',
      0,
      500,
      5,
      _fogConfig.start,
      (v) => {
        _fogConfig = { ..._fogConfig, start: v };
        update();
      },
      'fog-start',
      'Distance where linear fog begins (world units).',
    ),
  );

  coreGroup.body.append(
    createSliderRow(
      'End',
      10,
      1000,
      10,
      _fogConfig.end,
      (v) => {
        _fogConfig = { ..._fogConfig, end: v };
        update();
      },
      'fog-end',
      'Distance where linear fog reaches full opacity.',
    ),
  );

  coreGroup.body.append(
    createSliderRow(
      'Color R',
      0,
      1,
      0.01,
      _fogConfig.color.r,
      (v) => {
        _fogConfig = { ..._fogConfig, color: { ..._fogConfig.color, r: v } };
        update();
      },
      'fog-color-r',
      'Red channel of the base fog color.',
    ),
  );

  coreGroup.body.append(
    createSliderRow(
      'Color G',
      0,
      1,
      0.01,
      _fogConfig.color.g,
      (v) => {
        _fogConfig = { ..._fogConfig, color: { ..._fogConfig.color, g: v } };
        update();
      },
      'fog-color-g',
      'Green channel of the base fog color.',
    ),
  );

  coreGroup.body.append(
    createSliderRow(
      'Color B',
      0,
      1,
      0.01,
      _fogConfig.color.b,
      (v) => {
        _fogConfig = { ..._fogConfig, color: { ..._fogConfig.color, b: v } };
        update();
      },
      'fog-color-b',
      'Blue channel of the base fog color.',
    ),
  );

  coreGroup.body.append(
    createSliderRow(
      'Max Opacity',
      0,
      1,
      0.01,
      _fogConfig.maxOpacity,
      (v) => {
        _fogConfig = { ..._fogConfig, maxOpacity: v };
        update();
      },
      'fog-max-opacity',
      'Maximum fog opacity cap (0–1). Prevents full whiteout.',
    ),
  );

  coreGroup.body.append(
    createSliderRow(
      'Start Distance',
      0,
      200,
      1,
      _fogConfig.startDistance,
      (v) => {
        _fogConfig = { ..._fogConfig, startDistance: v };
        update();
      },
      'fog-start-distance',
      'Offset before fog begins. Objects closer are fog-free.',
    ),
  );

  coreGroup.body.append(
    createSliderRow(
      'Cutoff Distance',
      0,
      1000,
      5,
      _fogConfig.cutoffDistance,
      (v) => {
        _fogConfig = { ..._fogConfig, cutoffDistance: v };
        update();
      },
      'fog-cutoff-distance',
      'Beyond this distance fog is fully opaque.',
    ),
  );

  coreGroup.body.append(
    createToggleRow(
      'Exclude Skybox',
      _fogConfig.excludeSkybox,
      (on) => {
        _fogConfig = { ..._fogConfig, excludeSkybox: on };
        update();
      },
      'fog-exclude-skybox',
      'Skip fog on the skybox mesh so the sky stays clear.',
    ),
  );

  coreGroup.body.append(
    createSliderRow(
      'Sky Affect',
      0,
      1,
      0.01,
      _fogConfig.skyAffect,
      (v) => {
        _fogConfig = { ..._fogConfig, skyAffect: v };
        update();
      },
      'fog-sky-affect',
      'How much fog tints the sky. 0 = unaffected, 1 = fully fogged.',
    ),
  );
  container.append(coreGroup.root);

  // =========================================================================
  // Height Fog
  // =========================================================================

  const heightGroup = createCollapsibleGroup('Height Fog', true);
  const hf = _fogConfig.heightFog ?? {
    enabled: false,
    baseHeight: 0,
    falloff: 0.5,
    density: 0.1,
    offset: 0,
  };

  heightGroup.body.append(
    createToggleRow(
      'Enabled',
      hf.enabled,
      (on) => {
        _fogConfig = { ..._fogConfig, heightFog: { ...hf, enabled: on } };
        update();
      },
      'fog-height-enabled',
      'Turn height-based fog on or off.',
    ),
  );
  heightGroup.body.append(
    createSliderRow(
      'Base Height',
      -20,
      50,
      0.5,
      hf.baseHeight,
      (v) => {
        const cur = _fogConfig.heightFog ?? hf;
        _fogConfig = { ..._fogConfig, heightFog: { ...cur, baseHeight: v } };
        update();
      },
      'fog-height-base-height',
      'World Y where height fog is densest.',
    ),
  );
  heightGroup.body.append(
    createSliderRow(
      'Falloff',
      0.01,
      10,
      0.01,
      hf.falloff,
      (v) => {
        const cur = _fogConfig.heightFog ?? hf;
        _fogConfig = { ..._fogConfig, heightFog: { ...cur, falloff: v } };
        update();
      },
      'fog-height-falloff',
      'How quickly height fog fades above the base.',
    ),
  );
  heightGroup.body.append(
    createSliderRow(
      'Density',
      0,
      1,
      0.01,
      hf.density,
      (v) => {
        const cur = _fogConfig.heightFog ?? hf;
        _fogConfig = { ..._fogConfig, heightFog: { ...cur, density: v } };
        update();
      },
      'fog-height-density',
      'Height fog thickness at the base level.',
    ),
  );
  heightGroup.body.append(
    createSliderRow(
      'Offset',
      -20,
      20,
      0.5,
      hf.offset,
      (v) => {
        const cur = _fogConfig.heightFog ?? hf;
        _fogConfig = { ..._fogConfig, heightFog: { ...cur, offset: v } };
        update();
      },
      'fog-height-offset',
      'Vertical shift for the entire height fog layer.',
    ),
  );
  container.append(heightGroup.root);

  // =========================================================================
  // Second Layer
  // =========================================================================

  const slGroup = createCollapsibleGroup('Second Layer', true);
  const sl = _fogConfig.secondLayer ?? {
    enabled: false,
    density: 0.05,
    heightFalloff: 0.2,
    heightOffset: 0,
    color: { r: 0.7, g: 0.75, b: 0.8, a: 1 },
  };

  slGroup.body.append(
    createToggleRow(
      'Enabled',
      sl.enabled,
      (on) => {
        _fogConfig = { ..._fogConfig, secondLayer: { ...sl, enabled: on } };
        update();
      },
      'fog-second-layer-enabled',
      'Turn the second fog layer on or off.',
    ),
  );
  slGroup.body.append(
    createSliderRow(
      'Density',
      0,
      1,
      0.01,
      sl.density,
      (v) => {
        const cur = _fogConfig.secondLayer ?? sl;
        _fogConfig = { ..._fogConfig, secondLayer: { ...cur, density: v } };
        update();
      },
      'fog-second-layer-density',
      'Thickness of the second fog layer.',
    ),
  );
  slGroup.body.append(
    createSliderRow(
      'Height Falloff',
      0.01,
      10,
      0.01,
      sl.heightFalloff,
      (v) => {
        const cur = _fogConfig.secondLayer ?? sl;
        _fogConfig = { ..._fogConfig, secondLayer: { ...cur, heightFalloff: v } };
        update();
      },
      'fog-second-layer-height-falloff',
      'Vertical decay rate for the second layer.',
    ),
  );
  slGroup.body.append(
    createSliderRow(
      'Height Offset',
      -20,
      50,
      0.5,
      sl.heightOffset,
      (v) => {
        const cur = _fogConfig.secondLayer ?? sl;
        _fogConfig = { ..._fogConfig, secondLayer: { ...cur, heightOffset: v } };
        update();
      },
      'fog-second-layer-height-offset',
      'Vertical position offset for the second layer.',
    ),
  );
  container.append(slGroup.root);

  // =========================================================================
  // Inscattering
  // =========================================================================

  const insGroup = createCollapsibleGroup('Inscattering', true);
  const ins = _fogConfig.inscattering ?? {
    enabled: false,
    color: { r: 1, g: 0.9, b: 0.7, a: 1 },
    exponent: 4,
    startDistance: 50,
    intensity: 1,
  };

  insGroup.body.append(
    createToggleRow(
      'Enabled',
      ins.enabled,
      (on) => {
        _fogConfig = { ..._fogConfig, inscattering: { ...ins, enabled: on } };
        update();
      },
      'fog-inscattering-enabled',
      'Turn light inscattering effect on or off.',
    ),
  );
  insGroup.body.append(
    createSliderRow(
      'Exponent',
      1,
      32,
      1,
      ins.exponent,
      (v) => {
        const cur = _fogConfig.inscattering ?? ins;
        _fogConfig = { ..._fogConfig, inscattering: { ...cur, exponent: v } };
        update();
      },
      'fog-inscattering-exponent',
      'Tightness of the light halo. Higher = more focused.',
    ),
  );
  insGroup.body.append(
    createSliderRow(
      'Start Dist',
      0,
      200,
      5,
      ins.startDistance,
      (v) => {
        const cur = _fogConfig.inscattering ?? ins;
        _fogConfig = { ..._fogConfig, inscattering: { ...cur, startDistance: v } };
        update();
      },
      'fog-inscattering-start-dist',
      'Distance before inscattering begins.',
    ),
  );
  insGroup.body.append(
    createSliderRow(
      'Intensity',
      0,
      5,
      0.1,
      ins.intensity,
      (v) => {
        const cur = _fogConfig.inscattering ?? ins;
        _fogConfig = { ..._fogConfig, inscattering: { ...cur, intensity: v } };
        update();
      },
      'fog-inscattering-intensity',
      'Brightness of the inscattered light.',
    ),
  );
  container.append(insGroup.root);

  // =========================================================================
  // Atmospheric
  // =========================================================================

  const atmGroup = createCollapsibleGroup('Atmospheric', true);
  const atm = _fogConfig.atmospheric ?? {
    enabled: false,
    extinctionR: 0.02,
    extinctionG: 0.03,
    extinctionB: 0.05,
    inscatteringR: 0.04,
    inscatteringG: 0.04,
    inscatteringB: 0.06,
  };

  atmGroup.body.append(
    createToggleRow(
      'Enabled',
      atm.enabled,
      (on) => {
        _fogConfig = { ..._fogConfig, atmospheric: { ...atm, enabled: on } };
        update();
      },
      'fog-atmospheric-enabled',
      'Turn wavelength-dependent atmospheric fog on or off.',
    ),
  );
  atmGroup.body.append(
    createSliderRow(
      'Extinct. R',
      0,
      0.5,
      0.001,
      atm.extinctionR,
      (v) => {
        const cur = _fogConfig.atmospheric ?? atm;
        _fogConfig = { ..._fogConfig, atmospheric: { ...cur, extinctionR: v } };
        update();
      },
      'fog-atmospheric-extinct-r',
      'Red channel light absorption rate.',
    ),
  );
  atmGroup.body.append(
    createSliderRow(
      'Extinct. G',
      0,
      0.5,
      0.001,
      atm.extinctionG,
      (v) => {
        const cur = _fogConfig.atmospheric ?? atm;
        _fogConfig = { ..._fogConfig, atmospheric: { ...cur, extinctionG: v } };
        update();
      },
      'fog-atmospheric-extinct-g',
      'Green channel light absorption rate.',
    ),
  );
  atmGroup.body.append(
    createSliderRow(
      'Extinct. B',
      0,
      0.5,
      0.001,
      atm.extinctionB,
      (v) => {
        const cur = _fogConfig.atmospheric ?? atm;
        _fogConfig = { ..._fogConfig, atmospheric: { ...cur, extinctionB: v } };
        update();
      },
      'fog-atmospheric-extinct-b',
      'Blue channel absorption. Higher = warmer sunset tones.',
    ),
  );
  atmGroup.body.append(
    createSliderRow(
      'Inscatter R',
      0,
      0.5,
      0.001,
      atm.inscatteringR,
      (v) => {
        const cur = _fogConfig.atmospheric ?? atm;
        _fogConfig = { ..._fogConfig, atmospheric: { ...cur, inscatteringR: v } };
        update();
      },
      'fog-atmospheric-inscatter-r',
      'Red channel of light scattered into the view.',
    ),
  );
  atmGroup.body.append(
    createSliderRow(
      'Inscatter G',
      0,
      0.5,
      0.001,
      atm.inscatteringG,
      (v) => {
        const cur = _fogConfig.atmospheric ?? atm;
        _fogConfig = { ..._fogConfig, atmospheric: { ...cur, inscatteringG: v } };
        update();
      },
      'fog-atmospheric-inscatter-g',
      'Green channel of light scattered into the view.',
    ),
  );
  atmGroup.body.append(
    createSliderRow(
      'Inscatter B',
      0,
      0.5,
      0.001,
      atm.inscatteringB,
      (v) => {
        const cur = _fogConfig.atmospheric ?? atm;
        _fogConfig = { ..._fogConfig, atmospheric: { ...cur, inscatteringB: v } };
        update();
      },
      'fog-atmospheric-inscatter-b',
      'Blue channel of light scattered into the view.',
    ),
  );
  container.append(atmGroup.root);

  // =========================================================================
  // Noise
  // =========================================================================

  const noiseGroup = createCollapsibleGroup('Noise', true);
  const noise = _fogConfig.noise ?? {
    enabled: false,
    scale: 1,
    amplitude: 0.5,
    speed: 0.1,
    octaves: 3,
    lacunarity: 2,
    persistence: 0.5,
  };

  noiseGroup.body.append(
    createToggleRow(
      'Enabled',
      noise.enabled,
      (on) => {
        _fogConfig = { ..._fogConfig, noise: { ...noise, enabled: on } };
        update();
      },
      'fog-noise-enabled',
      'Add Perlin noise variation to fog density.',
    ),
  );
  noiseGroup.body.append(
    createSliderRow(
      'Scale',
      0.001,
      10,
      0.01,
      noise.scale,
      (v) => {
        const cur = _fogConfig.noise ?? noise;
        _fogConfig = { ..._fogConfig, noise: { ...cur, scale: v } };
        update();
      },
      'fog-noise-scale',
      'Noise pattern size. Smaller = finer detail.',
    ),
  );
  noiseGroup.body.append(
    createSliderRow(
      'Amplitude',
      0,
      1,
      0.01,
      noise.amplitude,
      (v) => {
        const cur = _fogConfig.noise ?? noise;
        _fogConfig = { ..._fogConfig, noise: { ...cur, amplitude: v } };
        update();
      },
      'fog-noise-amplitude',
      'Noise strength. How much density varies.',
    ),
  );
  noiseGroup.body.append(
    createSliderRow(
      'Speed',
      0,
      2,
      0.01,
      noise.speed,
      (v) => {
        const cur = _fogConfig.noise ?? noise;
        _fogConfig = { ..._fogConfig, noise: { ...cur, speed: v } };
        update();
      },
      'fog-noise-speed',
      'How fast the noise pattern animates.',
    ),
  );
  noiseGroup.body.append(
    createSliderRow(
      'Octaves',
      1,
      6,
      1,
      noise.octaves,
      (v) => {
        const cur = _fogConfig.noise ?? noise;
        _fogConfig = { ..._fogConfig, noise: { ...cur, octaves: v } };
        update();
      },
      'fog-noise-octaves',
      'Noise layers. More = finer detail, higher GPU cost.',
    ),
  );
  noiseGroup.body.append(
    createSliderRow(
      'Lacunarity',
      1,
      4,
      0.1,
      noise.lacunarity,
      (v) => {
        const cur = _fogConfig.noise ?? noise;
        _fogConfig = { ..._fogConfig, noise: { ...cur, lacunarity: v } };
        update();
      },
      'fog-noise-lacunarity',
      'Frequency multiplier between octaves.',
    ),
  );
  noiseGroup.body.append(
    createSliderRow(
      'Persistence',
      0.1,
      0.9,
      0.01,
      noise.persistence,
      (v) => {
        const cur = _fogConfig.noise ?? noise;
        _fogConfig = { ..._fogConfig, noise: { ...cur, persistence: v } };
        update();
      },
      'fog-noise-persistence',
      'Amplitude falloff per octave. Lower = smoother.',
    ),
  );
  container.append(noiseGroup.root);

  // =========================================================================
  // Wind
  // =========================================================================

  const windGroup = createCollapsibleGroup('Wind', true);
  const wind = _fogConfig.wind ?? {
    enabled: false,
    directionAngle: 0,
    speed: 0.5,
    turbulence: 0.2,
  };

  windGroup.body.append(
    createToggleRow(
      'Enabled',
      wind.enabled,
      (on) => {
        _fogConfig = { ..._fogConfig, wind: { ...wind, enabled: on } };
        update();
      },
      'fog-wind-enabled',
      'Enable wind-driven fog movement.',
    ),
  );
  windGroup.body.append(
    createSliderRow(
      'Direction°',
      0,
      360,
      1,
      wind.directionAngle,
      (v) => {
        const cur = _fogConfig.wind ?? wind;
        _fogConfig = { ..._fogConfig, wind: { ...cur, directionAngle: v } };
        update();
      },
      'fog-wind-direction',
      'Wind compass angle (0–360). Drives fog drift.',
    ),
  );
  windGroup.body.append(
    createSliderRow(
      'Speed',
      0,
      5,
      0.1,
      wind.speed,
      (v) => {
        const cur = _fogConfig.wind ?? wind;
        _fogConfig = { ..._fogConfig, wind: { ...cur, speed: v } };
        update();
      },
      'fog-wind-speed',
      'Wind speed. Higher = faster fog drift.',
    ),
  );
  windGroup.body.append(
    createSliderRow(
      'Turbulence',
      0,
      1,
      0.01,
      wind.turbulence,
      (v) => {
        const cur = _fogConfig.wind ?? wind;
        _fogConfig = { ..._fogConfig, wind: { ...cur, turbulence: v } };
        update();
      },
      'fog-wind-turbulence',
      'Random wind variation. 0 = steady, 1 = chaotic.',
    ),
  );
  container.append(windGroup.root);

  // =========================================================================
  // Overlay Layers (4 layers)
  // =========================================================================

  const overlayTextureOptions = [
    { value: 'perlin', label: 'Perlin Noise' },
    { value: 'worley', label: 'Worley Cells' },
    { value: 'clouds', label: 'Cloud Wisps' },
    { value: 'wisps', label: 'Ethereal Wisps' },
    { value: 'smoke', label: 'Smoke Billows' },
  ] as const;
  const blendModeOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'additive', label: 'Additive (Glow)' },
    { value: 'multiply', label: 'Multiply (Darken)' },
    { value: 'screen', label: 'Screen (Lighten)' },
  ] as const;
  const vignetteOptions = [
    { value: 'none', label: 'None' },
    { value: 'radial', label: 'Radial' },
    { value: 'border', label: 'Full Border' },
    { value: 'horizontal', label: 'Horizontal Band' },
    { value: 'vertical', label: 'Vertical Band' },
    { value: 'upper', label: 'Upper Half' },
    { value: 'lower', label: 'Lower Half' },
    { value: 'left', label: 'Left Half' },
    { value: 'right', label: 'Right Half' },
  ] as const;

  /**
   * Builds controls for a single overlay layer (extracted to avoid no-loop-func).
   *
   * @param idx - Overlay layer index (0–3).
   * @returns The collapsible group root element.
   */
  const buildOverlayLayer = (idx: Num): HTMLElement => {
    const ovGroup = createCollapsibleGroup(`Fog Layer ${idx + 1}`, true);
    const defaultOv = {
      enabled: false,
      texture: 'perlin' as const,
      opacity: 0.3,
      blendMode: 'additive' as const,
      scrollX: 0.5,
      scrollY: 0,
      scale: 1,
      tint: { r: 1, g: 1, b: 1, a: 1 },
      hue: 0,
      hueSpeed: 0,
      mapLocked: false,
      vignette: 'none' as const,
      vignetteIntensity: 0.5,
    };
    const ov = _fogConfig.overlays?.[idx] ?? defaultOv;

    /**
     * Helper to update a single overlay property.
     *
     * @param prop - Overlay property key.
     * @param val - New value.
     */
    const setOverlayProp = (prop: string, val: unknown): void => {
      const overlays = [...(_fogConfig.overlays ?? [])];
      while (overlays.length <= idx) overlays.push({ ...defaultOv });
      overlays[idx] = { ...overlays[idx], [prop]: val };
      _fogConfig = { ..._fogConfig, overlays };
      update();
    };

    ovGroup.body.append(
      createToggleRow(
        'Enabled',
        ov.enabled,
        (on) => {
          setOverlayProp('enabled', on);
        },
        `fog-overlay-${idx}-enabled`,
        'Turn this fog overlay layer on or off.',
      ),
    );
    ovGroup.body.append(
      createDropdown(
        'Texture',
        [...overlayTextureOptions],
        ov.texture,
        (v) => {
          const overlays = [...(_fogConfig.overlays ?? [])];
          while (overlays.length <= idx) overlays.push({ ...defaultOv });
          overlays[idx] = { ...overlays[idx], texture: v as typeof ov.texture };
          _fogConfig = { ..._fogConfig, overlays };
          // Need to recreate handle for new textures
          if (_fogHandle) {
            disposeFog(_fogHandle);
            _fogHandle = null;
          }
          update();
        },
        `fog-overlay-${idx}-texture`,
        'Noise pattern type for this overlay layer.',
      ),
    );
    ovGroup.body.append(
      createSliderRow(
        'Opacity',
        0,
        1,
        0.01,
        ov.opacity,
        (v) => {
          setOverlayProp('opacity', v);
        },
        `fog-overlay-${idx}-opacity`,
        'Layer transparency. 0 = invisible, 1 = opaque.',
      ),
    );
    ovGroup.body.append(
      createDropdown(
        'Blend',
        [...blendModeOptions],
        ov.blendMode,
        (v) => {
          setOverlayProp('blendMode', v);
        },
        `fog-overlay-${idx}-blend`,
        'How this layer combines with the scene.',
      ),
    );
    ovGroup.body.append(
      createSliderRow(
        'Scroll X',
        -2,
        2,
        0.01,
        ov.scrollX,
        (v) => {
          setOverlayProp('scrollX', v);
        },
        `fog-overlay-${idx}-scroll-x`,
        'Horizontal drift speed. Negative = left.',
      ),
    );
    ovGroup.body.append(
      createSliderRow(
        'Scroll Y',
        -2,
        2,
        0.01,
        ov.scrollY,
        (v) => {
          setOverlayProp('scrollY', v);
        },
        `fog-overlay-${idx}-scroll-y`,
        'Vertical drift speed. Negative = down.',
      ),
    );
    ovGroup.body.append(
      createSliderRow(
        'Scale',
        0.1,
        10,
        0.1,
        ov.scale,
        (v) => {
          setOverlayProp('scale', v);
        },
        `fog-overlay-${idx}-scale`,
        'Texture scale. Larger = bigger pattern.',
      ),
    );
    ovGroup.body.append(
      createSliderRow(
        'Hue',
        0,
        360,
        1,
        ov.hue,
        (v) => {
          setOverlayProp('hue', v);
        },
        `fog-overlay-${idx}-hue`,
        'Color rotation in degrees.',
      ),
    );
    ovGroup.body.append(
      createSliderRow(
        'Hue Speed',
        -10,
        10,
        0.1,
        ov.hueSpeed,
        (v) => {
          setOverlayProp('hueSpeed', v);
        },
        `fog-overlay-${idx}-hue-speed`,
        'Auto hue rotation speed (deg/sec). 0 = static.',
      ),
    );
    ovGroup.body.append(
      createDropdown(
        'Vignette',
        [...vignetteOptions],
        ov.vignette,
        (v) => {
          setOverlayProp('vignette', v);
        },
        `fog-overlay-${idx}-vignette`,
        'Edge fade shape for this overlay layer.',
      ),
    );
    ovGroup.body.append(
      createSliderRow(
        'Vig. Intensity',
        0,
        1,
        0.01,
        ov.vignetteIntensity,
        (v) => {
          setOverlayProp('vignetteIntensity', v);
        },
        `fog-overlay-${idx}-vig-intensity`,
        'Strength of the edge fade effect.',
      ),
    );
    return ovGroup.root;
  };

  for (let layerIdx = 0; layerIdx < 4; layerIdx++) {
    container.append(buildOverlayLayer(layerIdx));
  }

  // =========================================================================
  // Animation
  // =========================================================================

  const animGroup = createCollapsibleGroup('Animation', true);
  const anim = _fogConfig.animation ?? {
    enabled: false,
    speed: 0.5,
    amplitude: 0.3,
    waveform: 'sine' as const,
  };

  animGroup.body.append(
    createToggleRow(
      'Enabled',
      anim.enabled,
      (on) => {
        _fogConfig = { ..._fogConfig, animation: { ...anim, enabled: on } };
        update();
      },
      'fog-animation-enabled',
      'Animate fog density over time.',
    ),
  );
  animGroup.body.append(
    createSliderRow(
      'Speed',
      0.01,
      5,
      0.01,
      anim.speed,
      (v) => {
        const cur = _fogConfig.animation ?? anim;
        _fogConfig = { ..._fogConfig, animation: { ...cur, speed: v } };
        update();
      },
      'fog-animation-speed',
      'Animation cycle speed.',
    ),
  );
  animGroup.body.append(
    createSliderRow(
      'Amplitude',
      0,
      0.5,
      0.01,
      anim.amplitude,
      (v) => {
        const cur = _fogConfig.animation ?? anim;
        _fogConfig = { ..._fogConfig, animation: { ...cur, amplitude: v } };
        update();
      },
      'fog-animation-amplitude',
      'How much density varies during animation.',
    ),
  );
  animGroup.body.append(
    createDropdown(
      'Waveform',
      [
        { value: 'sine', label: 'Sine' },
        { value: 'triangle', label: 'Triangle' },
        { value: 'sawtooth', label: 'Sawtooth' },
      ],
      anim.waveform,
      (v) => {
        const cur = _fogConfig.animation ?? anim;
        _fogConfig = { ..._fogConfig, animation: { ...cur, waveform: v as typeof anim.waveform } };
        update();
      },
      'fog-animation-waveform',
      'Oscillation shape. Sine = smooth, Triangle = angular.',
    ),
  );
  container.append(animGroup.root);

  // =========================================================================
  // Day/Night
  // =========================================================================

  const dnGroup = createCollapsibleGroup('Day/Night', true);
  const dn = _fogConfig.dayNight ?? {
    enabled: false,
    dayColor: { r: 0.8, g: 0.85, b: 0.9, a: 1 },
    nightColor: { r: 0.1, g: 0.1, b: 0.2, a: 1 },
    dawnColor: { r: 0.9, g: 0.7, b: 0.5, a: 1 },
    dayDensity: 0.005,
    nightDensity: 0.02,
  };

  dnGroup.body.append(
    createToggleRow(
      'Enabled',
      dn.enabled,
      (on) => {
        _fogConfig = { ..._fogConfig, dayNight: { ...dn, enabled: on } };
        update();
      },
      'fog-daynight-enabled',
      'Auto-adjust fog with the day/night cycle.',
    ),
  );
  dnGroup.body.append(
    createSliderRow(
      'Day Density',
      0,
      0.1,
      0.001,
      dn.dayDensity,
      (v) => {
        const cur = _fogConfig.dayNight ?? dn;
        _fogConfig = { ..._fogConfig, dayNight: { ...cur, dayDensity: v } };
        update();
      },
      'fog-daynight-day-density',
      'Fog density during daytime.',
    ),
  );
  dnGroup.body.append(
    createSliderRow(
      'Night Density',
      0,
      0.1,
      0.001,
      dn.nightDensity,
      (v) => {
        const cur = _fogConfig.dayNight ?? dn;
        _fogConfig = { ..._fogConfig, dayNight: { ...cur, nightDensity: v } };
        update();
      },
      'fog-daynight-night-density',
      'Fog density at night. Usually denser than day.',
    ),
  );
  container.append(dnGroup.root);

  // =========================================================================
  // Per-Mesh
  // =========================================================================

  const pmGroup = createCollapsibleGroup('Per-Mesh', true);
  const pm = _fogConfig.perMesh ?? { excludeGround: false, excludeSprites: false };

  pmGroup.body.append(
    createToggleRow(
      'Exclude Ground',
      pm.excludeGround,
      (on) => {
        _fogConfig = { ..._fogConfig, perMesh: { ...pm, excludeGround: on } };
        update();
      },
      'fog-per-mesh-exclude-ground',
      'Skip fog on the ground fill plane.',
    ),
  );
  pmGroup.body.append(
    createToggleRow(
      'Exclude Sprites',
      pm.excludeSprites,
      (on) => {
        _fogConfig = { ..._fogConfig, perMesh: { ...pm, excludeSprites: on } };
        update();
      },
      'fog-per-mesh-exclude-sprites',
      'Skip fog on sprite meshes (characters, items).',
    ),
  );
  container.append(pmGroup.root);
}

// =============================================================================
// Camera Details UI Builder
// =============================================================================

/**
 * Builds live camera parameter controls and readouts.
 *
 * @param runtime - The runtime instance.
 */
function buildCameraDetailsUI(runtime: RuntimeInstance): void {
  const container = document.querySelector('#camdetails-body') as HTMLElement | null;
  if (!container) return;

  container.innerHTML = '';
  const cam = runtime.camera;

  if (cam instanceof BABYLON.ArcRotateCamera) {
    container.append(
      createSliderRow(
        'FOV',
        0.3,
        2.0,
        0.05,
        cam.fov,
        (v) => {
          cam.fov = v;
        },
        'cam-fov',
        'Field of view in radians. ~0.8 = 45°, ~1.4 = 80°.',
      ),
    );
    container.append(
      createSliderRow(
        'Radius',
        1,
        500,
        1,
        cam.radius,
        (v) => {
          cam.radius = v;
        },
        'cam-radius',
        'Distance from camera to target (world units).',
      ),
    );
    container.append(
      createSliderRow(
        'Inertia',
        0,
        1,
        0.05,
        cam.inertia,
        (v) => {
          cam.inertia = v;
        },
        'cam-inertia',
        'Movement smoothing. 0 = instant response, 1 = heavy damping.',
      ),
    );
    container.append(
      createSliderRow(
        'Scroll Sensitivity',
        1,
        50,
        1,
        cam.wheelPrecision,
        (v) => {
          cam.wheelPrecision = v;
        },
        'cam-wheel-prec',
        'Mouse wheel zoom sensitivity. Higher = finer zoom control.',
      ),
    );
    container.append(
      createSliderRow(
        'Pan Sensitivity',
        0,
        200,
        5,
        cam.panningSensibility,
        (v) => {
          cam.panningSensibility = v;
        },
        'cam-pan-sens',
        'Right-click pan speed. Higher value = slower panning.',
      ),
    );
    container.append(
      createSliderRow(
        'Min Distance',
        1,
        200,
        1,
        cam.lowerRadiusLimit ?? 1,
        (v) => {
          cam.lowerRadiusLimit = v;
        },
        'cam-lower-radius',
        'Closest allowed zoom distance from the target.',
      ),
    );
    container.append(
      createSliderRow(
        'Max Distance',
        10,
        1000,
        10,
        cam.upperRadiusLimit ?? 300,
        (v) => {
          cam.upperRadiusLimit = v;
        },
        'cam-upper-radius',
        'Farthest allowed zoom distance from the target.',
      ),
    );

    // Live readout of alpha/beta/radius
    const readout = document.createElement('div');
    readout.style.cssText = 'font-size: 9px; color: #666; padding: 4px 0;';
    container.append(readout);

    runtime.engine.scene.registerAfterRender(() => {
      if (document.querySelector('#section-camdetails')?.classList.contains('collapsed')) return;
      readout.textContent = `α=${cam.alpha.toFixed(2)} β=${cam.beta.toFixed(2)} r=${cam.radius.toFixed(1)}`;
    });
  } else {
    const status = document.createElement('div');
    status.className = 'status-text';
    status.textContent = 'Non-ArcRotate camera — limited controls';
    container.append(status);
    container.append(
      createSliderRow(
        'FOV',
        0.3,
        2.0,
        0.05,
        cam.fov,
        (v) => {
          cam.fov = v;
        },
        'cam-fov',
        'Field of view in radians. ~0.8 = 45°, ~1.4 = 80°.',
      ),
    );
  }
}

// =============================================================================
// Glow Layer Details UI Builder
// =============================================================================

/**
 * Builds glow layer parameter controls.
 *
 * Controls: enabled, intensity, blur kernel, quality presets,
 * custom emissive override + color picker, mesh glow toggles
 * per category (chunks, UI overlays, ground fill, other).
 *
 * @param debug - Debug API reference.
 */
function buildGlowDetailsUI(debug: DevDebugApi): void {
  const container = document.querySelector('#glowdetails-body') as HTMLElement | null;
  const glow = debug.tilemap?.lighting?.glowLayer;
  if (!container) return;

  container.innerHTML = '';

  if (!glow) {
    const status = document.createElement('div');
    status.className = 'status-text';
    status.textContent = 'No glow layer configured';
    container.append(status);
    return;
  }

  // ── Basic Controls ──────────────────────────────────────────────
  container.append(
    createToggleRow(
      'Enabled',
      glow.isEnabled,
      (on) => {
        glow.isEnabled = on;
      },
      'glow-enabled',
      'Turn the glow post-process layer on or off.',
    ),
  );
  container.append(
    createSliderRow(
      'Intensity',
      0,
      5,
      0.05,
      glow.intensity,
      (val) => {
        glow.intensity = val;
      },
      'glow-intensity',
      'Glow brightness multiplier. Higher = stronger bloom on emissive surfaces.',
    ),
  );
  container.append(
    createSliderRow(
      'Blur Kernel',
      1,
      256,
      1,
      glow.blurKernelSize,
      (val) => {
        glow.blurKernelSize = val;
      },
      'glow-blur-kernel',
      'Blur kernel size in pixels. Larger = softer, wider glow.',
    ),
  );

  // ── Quality Presets ─────────────────────────────────────────────
  container.append(createSubHeader('Quality Presets'));

  const presetRow = document.createElement('div');
  presetRow.className = 'control-row';
  presetRow.style.flexWrap = 'wrap';

  const presetLabel = document.createElement('span');
  presetLabel.className = 'control-label';
  presetLabel.textContent = 'Preset';

  const btnGroup = document.createElement('div');
  btnGroup.className = 'btn-group';
  btnGroup.style.flex = '1';
  btnGroup.style.justifyContent = 'flex-end';

  const presetNames: GlowQualityPresetName[] = ['low', 'medium', 'high', 'ultra'];
  for (const name of presetNames) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    btn.dataset['preset'] = name;
    btn.addEventListener('click', () => {
      const preset = GLOW_QUALITY_PRESETS[name];
      // Apply runtime-changeable property
      glow.blurKernelSize = preset.blurKernelSize;
      // Update the blur kernel slider to reflect preset value
      const blurSlider = container.querySelector(
        '[data-control="glow-blur-kernel"] input[type="range"]',
      ) as HTMLInputElement | null;
      if (blurSlider) {
        blurSlider.value = String(preset.blurKernelSize);
        const valEl = blurSlider.nextElementSibling as HTMLElement | null;
        if (valEl) valEl.textContent = String(preset.blurKernelSize);
      }
      // Mark active
      for (const b of btnGroup.querySelectorAll('.btn')) {
        b.classList.remove('active');
      }
      btn.classList.add('active');
    });
    btnGroup.append(btn);
  }

  presetRow.append(presetLabel, btnGroup);
  container.append(presetRow);

  // ── Custom Emissive Override ─────────────────────────────────────
  container.append(createSubHeader('Custom Emissive Override'));

  let emissiveOverrideEnabled = false;
  let emissiveHex = '#ff6600';

  container.append(
    createToggleRow(
      'Override Emissive',
      false,
      (on) => {
        emissiveOverrideEnabled = on;
        if (on) {
          const c = BABYLON.Color4.FromHexString(`${emissiveHex}ff`);
          setCustomEmissiveColor({ glowLayer: glow, color: c });
        } else {
          clearCustomEmissiveColor({ glowLayer: glow });
        }
      },
      'glow-emissive-override',
      'Replace per-mesh emissive colors with a single custom color.',
    ),
  );

  const GLOW_COLOR_PRESETS: ReadonlyArray<{ readonly name: string; readonly hex: string }> = [
    { name: 'Orange', hex: '#ff6600' },
    { name: 'Cyan', hex: '#00ffff' },
    { name: 'Purple', hex: '#9933ff' },
    { name: 'Gold', hex: '#ffcc00' },
    { name: 'White', hex: '#ffffff' },
  ];

  container.append(
    createColorPickerRow('Glow Color', GLOW_COLOR_PRESETS, emissiveHex, (hex) => {
      emissiveHex = hex;
      if (emissiveOverrideEnabled) {
        const c = BABYLON.Color4.FromHexString(`${hex}ff`);
        setCustomEmissiveColor({ glowLayer: glow, color: c });
      }
    }),
  );

  // ── Mesh Glow Control ───────────────────────────────────────────
  container.append(createSubHeader('Mesh Glow Control'));

  const { scene } = debug;
  const chunkMeshes: BABYLON.AbstractMesh[] = [];
  const otherMeshes: BABYLON.AbstractMesh[] = [];

  // UI overlay meshes (grid, selection) now live in the UtilityLayerRenderer
  // scene and are immune to all post-processing. No glow exclusion needed.
  for (const mesh of scene.meshes) {
    if (mesh.name.startsWith('chunk-') || mesh.name.startsWith('cliff-')) {
      chunkMeshes.push(mesh);
    } else if (
      mesh.name !== 'tilemap-ground-fill' &&
      !mesh.name.startsWith('sky-') &&
      !mesh.name.startsWith('BackgroundHelper') &&
      !mesh.name.startsWith('BackgroundPlane') &&
      mesh.name !== 'hdrSkyBox'
    ) {
      otherMeshes.push(mesh);
    }
  }

  container.append(
    createToggleRow(
      `Tilemap Chunks (${String(chunkMeshes.length)})`,
      true,
      (on) => {
        for (const mesh of chunkMeshes) {
          if (mesh instanceof BABYLON.Mesh) {
            if (on) {
              removeMeshFromGlow({ glowLayer: glow, mesh });
            } else {
              excludeMeshFromGlow({ glowLayer: glow, mesh });
            }
          }
        }
      },
      'glow-chunks',
      'Include tilemap chunks in the glow pass. Off = exclude from glow.',
    ),
  );

  if (otherMeshes.length > 0) {
    container.append(
      createToggleRow(
        `Other Meshes (${String(otherMeshes.length)})`,
        true,
        (on) => {
          for (const mesh of otherMeshes) {
            if (mesh instanceof BABYLON.Mesh) {
              if (on) {
                removeMeshFromGlow({ glowLayer: glow, mesh });
              } else {
                excludeMeshFromGlow({ glowLayer: glow, mesh });
              }
            }
          }
        },
        'glow-other',
        'Include non-tilemap meshes (sprites, props) in the glow pass.',
      ),
    );
  }

  const groundFill = scene.getMeshByName('tilemap-ground-fill');
  if (groundFill && groundFill instanceof BABYLON.Mesh) {
    container.append(
      createToggleRow(
        'Ground Fill',
        true,
        (on) => {
          if (on) {
            removeMeshFromGlow({ glowLayer: glow, mesh: groundFill });
          } else {
            excludeMeshFromGlow({ glowLayer: glow, mesh: groundFill });
          }
        },
        'glow-ground',
        'Include the ground fill plane in the glow pass.',
      ),
    );
  }
}

// =============================================================================
// Layer UI Builder — helper
// =============================================================================

/**
 * Builds a single layer row with visibility toggle, opacity slider,
 * and expanded controls for all layer properties.
 *
 * @param tilemap - The rendered tilemap.
 * @param layer - The layer data (tile, object, or group).
 * @param index - The layer index.
 * @param container - The parent container element.
 * @param totalLayers - Total number of layers (for disabling buttons).
 * @param onReorder - Callback to swap layer positions.
 * @param debug - Debug API reference (for clearing layers).
 */
function buildLayerRow(
  tilemap: RenderedTilemap,
  layer: Layer,
  index: number,
  container: HTMLElement,
  totalLayers: number,
  onReorder: (fromIndex: number, toIndex: number) => void,
  debug: DevDebugApi,
): void {
  const idx = String(index);
  const row: HTMLElement = document.createElement('div');
  row.className = 'layer-row collapsed';

  // -- Styled layer header --
  const displayName: string = layer.name
    ? layer.name
        .replaceAll('_', ' ')
        .split(' ')
        .map((w: string) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ')
    : `Layer ${idx}`;

  let kindLabel = 'GRP';
  let kindClass = 'layer-kind-group';
  if (layer.kind === 'tile') {
    kindLabel = 'TILE';
    kindClass = 'layer-kind-tile';
  } else if (layer.kind === 'object') {
    kindLabel = 'OBJ';
    kindClass = 'layer-kind-object';
  }

  const header: HTMLElement = document.createElement('div');
  header.className = 'layer-header';

  const titleArea: HTMLElement = document.createElement('div');
  titleArea.className = 'layer-title';

  const kindBadge: HTMLElement = document.createElement('span');
  kindBadge.className = `layer-kind ${kindClass}`;
  kindBadge.textContent = kindLabel;

  const nameSpan: HTMLElement = document.createElement('span');
  nameSpan.textContent = displayName;

  titleArea.append(kindBadge, nameSpan);

  // -- Reorder buttons --
  const reorderWrap: HTMLElement = document.createElement('div');
  reorderWrap.className = 'layer-reorder';

  const upBtn: HTMLButtonElement = document.createElement('button');
  upBtn.innerHTML =
    '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 7L5 3L8 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  upBtn.title = 'Move this layer up in the draw order (closer to foreground).';
  upBtn.disabled = index === 0;
  upBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onReorder(index, index - 1);
  });

  const downBtn: HTMLButtonElement = document.createElement('button');
  downBtn.innerHTML =
    '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3L5 7L8 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  downBtn.title = 'Move this layer down in the draw order (closer to background).';
  downBtn.disabled = index === totalLayers - 1;
  downBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onReorder(index, index + 1);
  });

  reorderWrap.append(upBtn, downBtn);

  const chevron: HTMLElement = document.createElement('span');
  chevron.className = 'layer-chevron';
  chevron.innerHTML =
    '<svg viewBox="0 0 12 12"><polyline points="2,4 6,8 10,4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  header.append(titleArea, reorderWrap, chevron);
  header.addEventListener('click', (e) => {
    // Don't toggle when clicking reorder buttons
    if ((e.target as HTMLElement).closest('.layer-reorder')) return;
    row.classList.toggle('collapsed');
  });
  row.append(header);

  // -- Expandable body --
  const body: HTMLElement = document.createElement('div');
  body.className = 'layer-row-body';

  // Visibility + Opacity (always visible at top of body)
  body.append(
    createToggleRow(
      'Visible',
      layer.visible,
      (on) => {
        setLayerVisibility({ tilemap, layerIndex: index as Num, visible: on as Bool });
      },
      `layer-${idx}-visible`,
      'Show or hide this layer in the viewport.',
    ),
  );
  body.append(
    createSliderRow(
      'Opacity',
      0,
      1,
      0.05,
      layer.opacity,
      (val) => {
        setLayerOpacity({ tilemap, layerIndex: index as Num, opacity: val as Num });
      },
      `layer-${idx}-opacity`,
      'Layer transparency. 0 = invisible, 1 = fully opaque.',
    ),
  );

  // -- Visual group (collapsed) --
  const visual = createCollapsibleGroup('Visual', true);
  const gpuLayer = tilemap.gpuLayers.find((l) => l.layerIndex === index);
  const tintState = {
    r: layer.tintColor.r,
    g: layer.tintColor.g,
    b: layer.tintColor.b,
    a: layer.tintColor.a,
  };
  visual.body.append(
    createSliderRow(
      'Tint R',
      0,
      1,
      0.01,
      layer.tintColor.r,
      (val) => {
        tintState.r = val;
        if (gpuLayer) setGpuLayerTint({ layer: gpuLayer, ...tintState });
      },
      `layer-${idx}-tint-r`,
      'Red tint channel (0–1).',
    ),
  );
  visual.body.append(
    createSliderRow(
      'Tint G',
      0,
      1,
      0.01,
      layer.tintColor.g,
      (val) => {
        tintState.g = val;
        if (gpuLayer) setGpuLayerTint({ layer: gpuLayer, ...tintState });
      },
      `layer-${idx}-tint-g`,
      'Green tint channel (0–1).',
    ),
  );
  visual.body.append(
    createSliderRow(
      'Tint B',
      0,
      1,
      0.01,
      layer.tintColor.b,
      (val) => {
        tintState.b = val;
        if (gpuLayer) setGpuLayerTint({ layer: gpuLayer, ...tintState });
      },
      `layer-${idx}-tint-b`,
      'Blue tint channel (0–1).',
    ),
  );
  visual.body.append(
    createSliderRow(
      'Tint A',
      0,
      1,
      0.01,
      layer.tintColor.a,
      (val) => {
        tintState.a = val;
        if (gpuLayer) setGpuLayerTint({ layer: gpuLayer, ...tintState });
      },
      `layer-${idx}-tint-a`,
      'Alpha tint channel (0–1).',
    ),
  );
  visual.body.append(
    createSliderRow(
      'Brightness',
      -1,
      1,
      0.01,
      layer.brightness,
      (val) => {
        if (gpuLayer) setGpuLayerBrightness({ layer: gpuLayer, brightness: val as Num });
      },
      `layer-${idx}-brightness`,
      'Lighten or darken the layer. 0 = normal, -1 = black, 1 = white.',
    ),
  );
  visual.body.append(
    createSliderRow(
      'Saturation',
      0,
      2,
      0.01,
      layer.saturation,
      (val) => {
        if (gpuLayer) setGpuLayerSaturation({ layer: gpuLayer, saturation: val as Num });
      },
      `layer-${idx}-saturation`,
      'Color intensity. 0 = grayscale, 1 = normal, 2 = vivid.',
    ),
  );
  visual.body.append(
    createSliderRow(
      'Contrast',
      0,
      2,
      0.01,
      layer.contrast,
      (val) => {
        if (gpuLayer) setGpuLayerContrast({ layer: gpuLayer, contrast: val as Num });
      },
      `layer-${idx}-contrast`,
      'Tone range. 0 = flat, 1 = normal, 2 = high contrast.',
    ),
  );
  body.append(visual.root);

  // -- Transform group (collapsed) --
  const transform = createCollapsibleGroup('Transform', true);
  const offsetState = { x: layer.offsetX, y: layer.offsetY };
  transform.body.append(
    createSliderRow(
      'Offset X',
      -100,
      100,
      1,
      layer.offsetX,
      (val) => {
        offsetState.x = val;
        if (gpuLayer)
          setGpuLayerOffset({ layer: gpuLayer, x: offsetState.x as Num, y: offsetState.y as Num });
      },
      `layer-${idx}-offset-x`,
      'Pixel offset from default position. Useful for parallax tuning.',
    ),
  );
  transform.body.append(
    createSliderRow(
      'Offset Y',
      -100,
      100,
      1,
      layer.offsetY,
      (val) => {
        offsetState.y = val;
        if (gpuLayer)
          setGpuLayerOffset({ layer: gpuLayer, x: offsetState.x as Num, y: offsetState.y as Num });
      },
      `layer-${idx}-offset-y`,
      'Pixel offset from default position. Useful for parallax tuning.',
    ),
  );
  transform.body.append(
    createToggleRow(
      'Locked',
      layer.locked,
      noop,
      `layer-${idx}-locked`,
      'Prevent accidental edits to this layer in the editor.',
    ),
  );
  body.append(transform.root);

  // -- Tile-layer-specific groups --
  if (layer.kind === 'tile') {
    const parallax = createCollapsibleGroup('Parallax', true);
    parallax.body.append(
      createSliderRow(
        'Factor X',
        0,
        2,
        0.01,
        layer.parallaxFactorX,
        noop,
        `layer-${idx}-parallax-x`,
        'Parallax scroll multiplier. 0 = static, 1 = normal, >1 = foreground.',
      ),
    );
    parallax.body.append(
      createSliderRow(
        'Factor Y',
        0,
        2,
        0.01,
        layer.parallaxFactorY,
        noop,
        `layer-${idx}-parallax-y`,
        'Parallax scroll multiplier. 0 = static, 1 = normal, >1 = foreground.',
      ),
    );
    parallax.body.append(
      createSliderRow(
        'Origin X',
        -500,
        500,
        1,
        layer.parallaxOriginX,
        noop,
        `layer-${idx}-porigin-x`,
        'Parallax scroll origin point in world coordinates.',
      ),
    );
    parallax.body.append(
      createSliderRow(
        'Origin Y',
        -500,
        500,
        1,
        layer.parallaxOriginY,
        noop,
        `layer-${idx}-porigin-y`,
        'Parallax scroll origin point in world coordinates.',
      ),
    );
    body.append(parallax.root);

    const rendering = createCollapsibleGroup('Rendering', true);
    rendering.body.append(
      createSliderRow(
        'Scale X',
        0.1,
        10,
        0.1,
        layer.scaleX,
        noop,
        `layer-${idx}-scale-x`,
        'Tile rendering scale multiplier. 1 = normal size.',
      ),
    );
    rendering.body.append(
      createSliderRow(
        'Scale Y',
        0.1,
        10,
        0.1,
        layer.scaleY,
        noop,
        `layer-${idx}-scale-y`,
        'Tile rendering scale multiplier. 1 = normal size.',
      ),
    );
    rendering.body.append(
      createSliderRow(
        'Render Order',
        -10,
        10,
        1,
        layer.renderOrder,
        noop,
        `layer-${idx}-renderorder`,
        'Draw priority. Higher = drawn later (on top of lower values).',
      ),
    );
    rendering.body.append(
      createSliderRow(
        'Anim Frame',
        0,
        60,
        1,
        0,
        (val) => {
          if (gpuLayer) setGpuAnimationFrame({ layer: gpuLayer, frame: val as Num });
        },
        `layer-${idx}-animframe`,
        'Animation frame index for tile animation cycling.',
      ),
    );
    rendering.body.append(
      createToggleRow(
        'Cast Shadows',
        layer.castShadows,
        noop,
        `layer-${idx}-castshadows`,
        'Layer geometry casts shadows onto lower layers.',
      ),
    );
    rendering.body.append(
      createToggleRow(
        'Receive Shadows',
        layer.receiveShadows,
        noop,
        `layer-${idx}-receiveshadows`,
        'Layer receives shadow projections from above.',
      ),
    );
    rendering.body.append(
      createToggleRow(
        'Depth Write',
        layer.depthWrite,
        noop,
        `layer-${idx}-depthwrite`,
        'Write to the depth buffer (affects occlusion with other layers).',
      ),
    );
    rendering.body.append(
      createToggleRow(
        'Y-Sort',
        layer.ySortEnabled,
        noop,
        `layer-${idx}-ysort`,
        'Sort sprites by Y position for correct overlap in top-down view.',
      ),
    );
    rendering.body.append(
      createSliderRow(
        'Culling Pad',
        0,
        16,
        1,
        layer.cullingPadding,
        noop,
        `layer-${idx}-cullingpad`,
        'Extra tiles rendered beyond viewport edges to prevent pop-in.',
      ),
    );
    body.append(rendering.root);
  }

  // -- Object-layer info --
  if (layer.kind === 'object') {
    const objGroup = createCollapsibleGroup('Objects', false);
    const objInfo: HTMLElement = infoRow('Count', `layer-${idx}-objects`);
    const objVal: HTMLElement | null = objInfo.querySelector(`#layer-${idx}-objects`);
    if (objVal) objVal.textContent = String(layer.objects.length);
    objGroup.body.append(objInfo);
    body.append(objGroup.root);
  }

  // -- Group-layer info --
  if (layer.kind === 'group') {
    const grpGroup = createCollapsibleGroup('Children', false);
    const grpInfo: HTMLElement = infoRow('Count', `layer-${idx}-children`);
    const grpVal: HTMLElement | null = grpInfo.querySelector(`#layer-${idx}-children`);
    if (grpVal) grpVal.textContent = String(layer.children.length);
    grpGroup.body.append(grpInfo);
    body.append(grpGroup.root);
  }

  // -- Clear Layer button (tile layers only) --
  if (layer.kind === 'tile') {
    const clearBtn: HTMLButtonElement = document.createElement('button');
    clearBtn.className = 'btn btn-danger';
    clearBtn.textContent = 'Clear Layer';
    clearBtn.title = `Clear all tiles on ${displayName}`;
    clearBtn.style.width = '100%';
    clearBtn.style.marginTop = '4px';
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // oxlint-disable-next-line no-alert
      if (!window.confirm(`Clear all tiles on "${displayName}"?`)) return;
      clearLayer(debug, index as Num);
    });
    body.append(clearBtn);
  }

  row.append(body);
  container.append(row);
}

// =============================================================================
// Tile Inspector UI Builder
// =============================================================================

/**
 * Extracts the toggle-switch div from a toggle row created by
 * {@link createToggleRow}. The toggle switch is the second child.
 *
 * @param row - The toggle row element.
 * @returns The inner toggle-switch div.
 */
function getToggleSwitch(row: HTMLElement): HTMLElement {
  return row.children[1] as HTMLElement;
}

/**
 * Programmatically sets a toggle switch to a given state without
 * firing the change callback.
 *
 * @param toggle - The toggle-switch div.
 * @param on - Whether it should be on.
 */
function setToggleState(toggle: HTMLElement, on: boolean): void {
  toggle.classList.toggle('on', on);
}

/**
 * Extracts the slider input and value display span from a slider
 * row created by {@link createSliderRow}.
 *
 * @param row - The slider row element.
 * @returns Tuple of [input, valueSpan].
 */
function getSliderParts(row: HTMLElement): [HTMLInputElement, HTMLElement] {
  return [row.children[1] as HTMLInputElement, row.children[2] as HTMLElement];
}

/**
 * Programmatically sets a slider to a given value without firing
 * the change callback. Also updates the display span.
 *
 * @param input - The range input element.
 * @param valSpan - The value display span.
 * @param value - New numeric value.
 * @param step - Slider step (for formatting).
 */
function setSliderValue(
  input: HTMLInputElement,
  valSpan: HTMLElement,
  value: number,
  step: number,
): void {
  input.value = String(value);
  valSpan.textContent = formatSliderValue(value, step);
}

/**
 * Extracts the select element from a dropdown row created by
 * {@link createDropdown}.
 *
 * @param row - The dropdown row element.
 * @returns The inner select element.
 */
function getDropdownSelect(row: HTMLElement): HTMLSelectElement {
  return row.children[1] as HTMLSelectElement;
}

/**
 * Writes a property value back to the selected tile's properties
 * in the tileset config. Creates a default entry if none exists.
 * Uses Object.assign for type-safe dynamic property update.
 *
 * @param patch - Partial TileProperties object with the field(s) to update.
 */
function writeTileProp(patch: Partial<TileProperties>): void {
  const props: TileProperties | null = getOrCreateSelectedProps();
  if (!props) return;
  Object.assign(props, patch);
}

/**
 * Writes a single passability direction flag back to the selected
 * tile's properties.
 *
 * @param dirIndex - Direction index (0=down, 1=left, 2=right, 3=up).
 * @param value - Whether the direction is passable.
 */
function writePassability(dirIndex: Num, value: boolean): void {
  const props: TileProperties | null = getOrCreateSelectedProps();
  if (!props) return;
  // passability is a readonly tuple from the schema; we must replace the whole array
  const updated: [boolean, boolean, boolean, boolean] = [...props.passability];
  updated[dirIndex] = value;
  writeTileProp({ passability: updated });
}

/** Cache of loaded tileset images for tile preview rendering. */
const _tilesetImages = new Map<string, HTMLImageElement>();

/**
 * Draws a tile preview on the given canvas from the resolved tile data.
 *
 * @param canvas - The 2D canvas to draw on.
 * @param resolved - Resolved tile data (tileset + local index), or null.
 */
function drawTilePreview(canvas: HTMLCanvasElement, resolved: ResolvedTile | null): void {
  const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!resolved) return;

  const { tileset, localIndex } = resolved;
  const { columns, tileWidth, tileHeight } = tileset.config;
  const srcX: Num = (localIndex % columns) * tileWidth;
  const srcY: Num = Math.floor(localIndex / columns) * tileHeight;

  // Get or load the tileset image
  const imgUrl: string = tileset.texture.name;
  const cached: HTMLImageElement | undefined = _tilesetImages.get(imgUrl);

  if (cached?.complete) {
    ctx.drawImage(cached, srcX, srcY, tileWidth, tileHeight, 0, 0, canvas.width, canvas.height);
    return;
  }

  if (!cached) {
    const img: HTMLImageElement = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.src = imgUrl;
    _tilesetImages.set(imgUrl, img);
    img.addEventListener('load', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, srcX, srcY, tileWidth, tileHeight, 0, 0, canvas.width, canvas.height);
    });
  }
}

/**
 * Finds the layer index of the topmost non-empty tile at the given position.
 * Falls back to layer 0 if all layers are empty at that position.
 *
 * @param tilemap - The rendered tilemap.
 * @param x - Grid X coordinate.
 * @param z - Grid Z coordinate.
 * @returns The layer index with the topmost non-empty tile.
 */
function findTopmostLayerAt(tilemap: RenderedTilemap, x: Num, z: Num): Num {
  const { layers } = tilemap.mapData;
  const tileIndex: Num = z * tilemap.mapData.width + x;
  for (let li: Num = layers.length - 1; li >= 0; li--) {
    const tileId: Num = layers[li]?.data[tileIndex] ?? 0;
    if (tileId > 0) return li;
  }
  return 0;
}

/**
 * Looks up the global tile ID at the given flat index, respecting the
 * current layer selection (`_inspectLayerIndex`).
 *
 * - When `_inspectLayerIndex` is -1, iterates layers top-to-bottom and
 *   returns the first non-empty tile (topmost).
 * - Otherwise returns the tile from the specific layer.
 *
 * @param tilemap - The rendered tilemap.
 * @param tileIndex - Flat row-major tile index.
 * @returns The global tile ID (0 = empty).
 */
function lookupTileAtIndex(tilemap: RenderedTilemap, tileIndex: Num): Num {
  const { layers } = tilemap.mapData;

  // Specific layer selected
  if (_inspectLayerIndex >= 0 && _inspectLayerIndex < layers.length) {
    return layers[_inspectLayerIndex]?.data[tileIndex] ?? 0;
  }

  // Topmost non-empty (iterate top-to-bottom)
  for (let li: Num = layers.length - 1; li >= 0; li--) {
    const layerTile: Num = layers[li]?.data[tileIndex] ?? 0;
    if (layerTile > 0) return layerTile;
  }

  // Fallback to ground layer
  return layers[0]?.data[tileIndex] ?? 0;
}

/** Reference to the floating tile picker panel so we don't create duplicates. */
let _tilePickerPanel: HTMLElement | null = null;

/** Callback to redraw the tile picker palette (set when panel is open, null when closed). */
let _tilePickerRedraw: (() => void) | null = null;

/** Callback to sync the tile picker to the inspected tile's tileset (set when panel is open). */
let _tilePickerSyncTileset: (() => void) | null = null;

/** Zoom level for the tile picker palette (1×–6×). */
let _tilePickerZoom: Num = 2;

/** Whether the tile picker grid overlay is enabled. */
let _tilePickerGrid = true;

/** Recently placed tile global IDs (most recent first, max 12). */
let _recentTiles: Num[] = [];

/** Maximum number of recent tiles to track. */
const RECENT_TILES_MAX: Num = 12;

/**
 * Adds a global tile ID to the recently-used list.
 * Deduplicates, prepends to front, caps at RECENT_TILES_MAX.
 *
 * @param globalId - Global tile ID to add.
 */
function addRecentTile(globalId: Num): void {
  _recentTiles = _recentTiles.filter((id: Num) => id !== globalId);
  _recentTiles.unshift(globalId);
  if (_recentTiles.length > RECENT_TILES_MAX) {
    _recentTiles = _recentTiles.slice(0, RECENT_TILES_MAX);
  }
}

/**
 * Closes the floating tile picker panel if it is currently open.
 */
function closeTilePickerPanel(): void {
  if (_tilePickerPanel) {
    _tilePickerPanel.remove();
    _tilePickerPanel = null;
  }
  _tilePickerRedraw = null;
  _tilePickerSyncTileset = null;
  const tip: HTMLElement | null = document.querySelector('#tile-picker-tooltip');
  if (tip) tip.remove();
}

/**
 * Opens (or focuses) a floating tile picker panel with the full tileset
 * atlas. Features: tileset tabs, zoom slider, grid overlay, hover highlight
 * with tooltip, keyboard navigation, recently-used tiles, status bar,
 * and a resizable/draggable panel. Clicking a tile in the palette replaces
 * the currently selected map tile.
 *
 * @param debug - Debug API reference.
 * @param tilemap - The rendered tilemap.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: dev harness UI builder
function openTilePickerPanel(debug: DevDebugApi, tilemap: RenderedTilemap): void {
  // If already open, just bring to front
  if (_tilePickerPanel && document.body.contains(_tilePickerPanel)) {
    _tilePickerPanel.style.zIndex = '10001';
    return;
  }

  const tilesetNames: string[] = tilemap.tilesets.map((ts) => ts.config.name);
  let pickerTsIdx: Num = 0;
  let hoveredLocal: Num = -1;
  let kbCursorCol: Num = -1;
  let kbCursorRow: Num = -1;

  // ── Panel container ──────────────────────────────────────────
  const panel: HTMLElement = document.createElement('div');
  panel.style.cssText = [
    'position:fixed',
    'top:80px',
    'left:320px',
    'width:340px',
    'min-width:280px',
    'min-height:300px',
    'height:500px',
    'background:rgba(18,18,24,0.93)',
    'border:1px solid rgba(255,255,255,0.08)',
    'border-radius:8px',
    'backdrop-filter:blur(12px)',
    '-webkit-backdrop-filter:blur(12px)',
    'box-shadow:0 4px 20px rgba(0,0,0,0.5)',
    'z-index:10001',
    'display:flex',
    'flex-direction:column',
    'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Inter,Roboto,Helvetica,Arial,sans-serif',
    'font-size:11px',
    'color:#e0e0e0',
  ].join(';');
  _tilePickerPanel = panel;

  // ── Title bar (draggable) ────────────────────────────────────
  const titleBar: HTMLElement = document.createElement('div');
  titleBar.style.cssText = [
    'display:flex',
    'align-items:center',
    'justify-content:space-between',
    'padding:8px 12px',
    'background:rgba(18,18,24,0.98)',
    'border-bottom:1px solid rgba(255,255,255,0.06)',
    'border-radius:8px 8px 0 0',
    'cursor:grab',
    'user-select:none',
    'flex-shrink:0',
    'backdrop-filter:blur(12px)',
    'transition:background 0.12s',
  ].join(';');
  const titleText: HTMLElement = document.createElement('span');
  titleText.textContent = 'Tile Picker';
  titleText.style.cssText =
    'font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.8px;color:#6ecfcf;';
  const closeBtn: HTMLButtonElement = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText =
    'background:none;border:none;color:#888;cursor:pointer;font-size:14px;line-height:1;opacity:0.6;padding:0 2px;border-radius:3px;transition:all 0.12s;';
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.opacity = '1';
    closeBtn.style.background = 'rgba(255,255,255,0.1)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.opacity = '0.6';
    closeBtn.style.background = 'none';
  });
  closeBtn.addEventListener('pointerdown', (e: PointerEvent) => {
    e.stopPropagation();
  });
  closeBtn.addEventListener('click', () => {
    closeTilePickerPanel();
  });
  titleBar.append(titleText, closeBtn);
  panel.append(titleBar);

  // Make title bar draggable
  let isDragging = false;
  let dragOffX: Num = 0;
  let dragOffY: Num = 0;
  titleBar.addEventListener('pointerdown', (e: PointerEvent) => {
    isDragging = true;
    dragOffX = e.clientX - panel.offsetLeft;
    dragOffY = e.clientY - panel.offsetTop;
    titleBar.style.cursor = 'grabbing';
    titleBar.setPointerCapture(e.pointerId);
  });
  titleBar.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDragging) return;
    panel.style.left = `${String(e.clientX - dragOffX)}px`;
    panel.style.top = `${String(e.clientY - dragOffY)}px`;
  });
  titleBar.addEventListener('pointerup', () => {
    isDragging = false;
    titleBar.style.cursor = 'grab';
  });

  // Tileset dropdown is built later and placed in the bottom action bar.

  // ── Recently used tiles (collapsible subsection) ────────────
  const recentGroup = createCollapsibleGroup('Recent Tiles', false);
  const recentRow: HTMLElement = recentGroup.root;
  recentRow.style.flexShrink = '0';
  const recentContainer: HTMLElement = document.createElement('div');
  recentContainer.style.cssText =
    'display:flex;gap:3px;align-items:center;overflow-x:auto;padding:2px 0;';
  recentGroup.body.append(recentContainer);
  // recentRow is appended after actionBar below (bottom of panel).

  /**
   * Redraws the recently-used tiles row from `_recentTiles`.
   */
  const refreshRecentRow = (): void => {
    recentContainer.innerHTML = '';
    if (_recentTiles.length === 0) {
      const emptyMsg: HTMLElement = document.createElement('span');
      emptyMsg.style.cssText = 'color:rgba(255,255,255,0.2);font-size:9px;font-style:italic;';
      emptyMsg.textContent = 'No recent tiles';
      recentContainer.append(emptyMsg);
      return;
    }
    for (const gid of _recentTiles) {
      const miniCanvas: HTMLCanvasElement = document.createElement('canvas');
      miniCanvas.width = 32;
      miniCanvas.height = 32;
      miniCanvas.style.cssText =
        'width:32px;height:32px;flex-shrink:0;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);cursor:pointer;image-rendering:pixelated;border-radius:3px;transition:border-color 0.12s;';
      miniCanvas.addEventListener('mouseenter', () => {
        miniCanvas.style.borderColor = 'rgba(80,200,200,0.5)';
      });
      miniCanvas.addEventListener('mouseleave', () => {
        miniCanvas.style.borderColor = 'rgba(255,255,255,0.1)';
      });
      // Draw the tile image into mini canvas
      drawRecentTile(miniCanvas, gid, tilemap);
      // Click to re-place
      miniCanvas.addEventListener('click', () => {
        placeTileByGlobalId(debug, gid);
      });
      recentContainer.append(miniCanvas);
    }
  };

  // Zoom + grid controls are built later and placed in the bottom action bar.

  // ── Palette viewport (scrollable) ────────────────────────────
  const viewport: HTMLElement = document.createElement('div');
  viewport.style.cssText = 'overflow:auto;flex:1;min-height:0;background:rgba(0,0,0,0.3);';

  const paletteCanvas: HTMLCanvasElement = document.createElement('canvas');
  paletteCanvas.tabIndex = 0;
  paletteCanvas.style.cssText =
    'display:block;image-rendering:pixelated;cursor:crosshair;outline:none;';

  // Tooltip element (positioned near cursor)
  const tooltip: HTMLElement = document.createElement('div');
  tooltip.id = 'tile-picker-tooltip';
  tooltip.style.cssText = [
    'position:fixed',
    'background:rgba(18,18,24,0.95)',
    'color:#e0e0e0',
    'padding:3px 8px',
    'border:1px solid rgba(255,255,255,0.1)',
    'border-radius:4px',
    'font-size:10px',
    'font-family:inherit',
    'pointer-events:none',
    'z-index:10002',
    'display:none',
    'white-space:nowrap',
    'backdrop-filter:blur(8px)',
  ].join(';');

  viewport.append(paletteCanvas);
  panel.append(viewport);

  // ── Bottom action bar (structured control rows) ──
  const actionBar: HTMLElement = document.createElement('div');
  actionBar.style.cssText = [
    'display:flex',
    'flex-direction:column',
    'gap:0',
    'padding:4px 8px 0',
    'border-top:1px solid rgba(255,255,255,0.1)',
    'flex-shrink:0',
  ].join(';');

  // Row 1: Tileset dropdown (uses standard helper)
  const tsOptions: Array<{ value: string; label: string }> = tilesetNames.map(
    (name: string, i: number) => ({
      value: String(i),
      label: name || `Tileset ${String(i)}`,
    }),
  );
  const tsRow: HTMLElement = createDropdown(
    'Tileset',
    tsOptions,
    '0',
    (val: string) => {
      pickerTsIdx = Number(val);
      hoveredLocal = -1;
      kbCursorCol = -1;
      kbCursorRow = -1;
      drawPalette(pickerTsIdx);
    },
    'tp-tileset',
    'Select which tileset to browse.',
  );

  // Row 2: Zoom slider (uses standard helper)
  const zoomRow: HTMLElement = createSliderRow(
    'Zoom',
    1,
    6,
    1,
    _tilePickerZoom,
    (val: Num) => {
      _tilePickerZoom = val;
      drawPalette(pickerTsIdx);
    },
    'tp-zoom',
    'Tile picker zoom level (1×–6×).',
  );

  // Row 3: Grid toggle (uses standard helper — matches toggle-switch pattern)
  const gridRow: HTMLElement = createToggleRow(
    'Grid',
    _tilePickerGrid,
    (on: boolean) => {
      _tilePickerGrid = on;
      drawPalette(pickerTsIdx);
    },
    'tp-grid',
    'Toggle tile grid lines in the picker.',
  );

  // Row 4: Selected tile preview + hover info
  const statusRow: HTMLElement = document.createElement('div');
  statusRow.style.cssText =
    'display:flex;align-items:center;gap:8px;padding:6px 8px;border-top:1px solid rgba(255,255,255,0.08);min-height:36px;';

  // Mini preview canvas for selected tile
  const statusPreview: HTMLCanvasElement = document.createElement('canvas');
  statusPreview.width = 16;
  statusPreview.height = 16;
  statusPreview.style.cssText =
    'width:32px;height:32px;border:1px solid rgba(110,207,207,0.25);border-radius:3px;background:#181820;image-rendering:pixelated;flex-shrink:0;display:none;';

  const statusSelected: HTMLElement = document.createElement('span');
  statusSelected.style.cssText =
    'color:#ccc;font-size:10px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.4;';

  const statusHover: HTMLElement = document.createElement('span');
  statusHover.style.cssText = 'color:#777;font-size:9px;flex-shrink:0;white-space:nowrap;';

  const statusEmpty: HTMLElement = document.createElement('span');
  statusEmpty.style.cssText = 'color:#555;font-size:10px;font-style:italic;';
  statusEmpty.textContent = 'No tile selected';

  statusRow.append(statusPreview, statusSelected, statusEmpty, statusHover);

  actionBar.append(tsRow, zoomRow, gridRow, statusRow);
  panel.append(actionBar);
  panel.append(recentRow);

  // ── Resize handle ────────────────────────────────────────────
  const resizeHandle: HTMLElement = document.createElement('div');
  resizeHandle.style.cssText = [
    'position:absolute',
    'bottom:0',
    'right:0',
    'width:14px',
    'height:14px',
    'cursor:nwse-resize',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'color:rgba(255,255,255,0.2)',
    'font-size:8px',
    'user-select:none',
    'border-radius:0 0 8px 0',
    'transition:color 0.12s',
  ].join(';');
  resizeHandle.textContent = '⋱';
  panel.style.position = 'fixed'; // ensure relative for absolute child
  panel.append(resizeHandle);

  let isResizing = false;
  let resizeStartX: Num = 0;
  let resizeStartY: Num = 0;
  let resizeStartW: Num = 0;
  let resizeStartH: Num = 0;
  resizeHandle.addEventListener('pointerdown', (e: PointerEvent) => {
    e.stopPropagation();
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartW = panel.offsetWidth;
    resizeStartH = panel.offsetHeight;
    resizeHandle.setPointerCapture(e.pointerId);
  });
  resizeHandle.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isResizing) return;
    const newW: Num = Math.max(280, resizeStartW + (e.clientX - resizeStartX));
    const newH: Num = Math.max(300, resizeStartH + (e.clientY - resizeStartY));
    panel.style.width = `${String(newW)}px`;
    panel.style.height = `${String(newH)}px`;
  });
  resizeHandle.addEventListener('pointerup', () => {
    isResizing = false;
  });

  // ── Helper: effective grid dimensions (accounts for autotile expansion) ──
  const getEffectiveDims = (ts: (typeof tilemap.tilesets)[number]): { columns: Num; rows: Num } => {
    const { autotileType, columns, rows } = ts.config;
    if (autotileType === 'terrain_48' && columns === 2 && rows === 3) {
      return { columns: 8, rows: 6 };
    }
    return { columns, rows };
  };

  // ── Helper: get selected local index for a tileset ───────────
  const getSelectedLocalForTileset = (tsIdx: Num): Num => {
    if (_lastInspectX < 0 || _lastInspectZ < 0) return -1;
    const currentTm: RenderedTilemap | null = debug.tilemap;
    if (!currentTm) return -1;
    const tileIndex: Num = _lastInspectZ * currentTm.mapData.width + _lastInspectX;
    const globalId: Num = lookupTileAtIndex(currentTm, tileIndex);
    if (globalId === 0) return -1;
    const ts = currentTm.tilesets[tsIdx];
    if (!ts) return -1;
    const { firstGid } = ts.config;
    const { columns, rows } = getEffectiveDims(ts);
    const local: Num = globalId - firstGid;
    if (local < 0 || local >= columns * rows) return -1;
    return local;
  };

  // ── Draw palette with zoom + grid + highlights ───────────────
  const drawPalette = (tsIdx: Num): void => {
    const ts = tilemap.tilesets[tsIdx];
    if (!ts) return;
    const { tileWidth, tileHeight } = ts.config;
    const { columns, rows } = getEffectiveDims(ts);
    const zoom: Num = _tilePickerZoom;
    const cw: Num = columns * tileWidth * zoom;
    const ch: Num = rows * tileHeight * zoom;
    paletteCanvas.width = cw;
    paletteCanvas.height = ch;
    paletteCanvas.style.width = `${String(cw)}px`;
    paletteCanvas.style.height = `${String(ch)}px`;
    const ctx: CanvasRenderingContext2D | null = paletteCanvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cw, ch);

    const selectedLocal: Num = getSelectedLocalForTileset(tsIdx);

    const drawOverlays = (): void => {
      // Grid overlay
      if (_tilePickerGrid) {
        const gc: BABYLON.Color3 = _gridColor;
        ctx.strokeStyle = `rgba(${Math.round(gc.r * 255)},${Math.round(gc.g * 255)},${Math.round(gc.b * 255)},${String(_gridAlpha)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let c: Num = 1; c < columns; c++) {
          const x: Num = c * tileWidth * zoom;
          ctx.moveTo(x + 0.5, 0);
          ctx.lineTo(x + 0.5, ch);
        }
        for (let r: Num = 1; r < rows; r++) {
          const y: Num = r * tileHeight * zoom;
          ctx.moveTo(0, y + 0.5);
          ctx.lineTo(cw, y + 0.5);
        }
        ctx.stroke();
      }

      // Selected tile highlight (matches dev harness selection style)
      if (selectedLocal >= 0) {
        const sCol: Num = selectedLocal % columns;
        const sRow: Num = Math.floor(selectedLocal / columns);
        const sx: Num = sCol * tileWidth * zoom;
        const sy: Num = sRow * tileHeight * zoom;
        const sw: Num = tileWidth * zoom;
        const sh: Num = tileHeight * zoom;
        // Fill
        const fc: BABYLON.Color3 = _selectionFillColor;
        ctx.fillStyle = `rgba(${Math.round(fc.r * 255)},${Math.round(fc.g * 255)},${Math.round(fc.b * 255)},${String(_selectionFillAlpha)})`;
        ctx.fillRect(sx, sy, sw, sh);
        // Edge
        const ec: BABYLON.Color3 = _selectionColor;
        ctx.strokeStyle = `rgba(${Math.round(ec.r * 255)},${Math.round(ec.g * 255)},${Math.round(ec.b * 255)},${String(_selectionAlpha)})`;
        ctx.lineWidth = Math.max(1, Math.round(_selectionEdgeWidth * zoom * 16));
        const hw: Num = ctx.lineWidth / 2;
        ctx.strokeRect(sx + hw, sy + hw, sw - ctx.lineWidth, sh - ctx.lineWidth);
      }

      // Hover highlight (white overlay)
      if (hoveredLocal >= 0) {
        const hCol: Num = hoveredLocal % columns;
        const hRow: Num = Math.floor(hoveredLocal / columns);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(
          hCol * tileWidth * zoom,
          hRow * tileHeight * zoom,
          tileWidth * zoom,
          tileHeight * zoom,
        );
      }

      // Keyboard cursor (dashed cyan)
      if (kbCursorCol >= 0 && kbCursorRow >= 0) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(
          kbCursorCol * tileWidth * zoom + 1,
          kbCursorRow * tileHeight * zoom + 1,
          tileWidth * zoom - 2,
          tileHeight * zoom - 2,
        );
        ctx.setLineDash([]);
      }
    };

    const imgUrl: string = ts.texture.name;
    const cached: HTMLImageElement | undefined = _tilesetImages.get(imgUrl);
    if (cached?.complete) {
      ctx.drawImage(cached, 0, 0, cw, ch);
      drawOverlays();
      updateStatusSelected(selectedLocal, tsIdx);
      return;
    }
    if (!cached) {
      const img: HTMLImageElement = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.src = imgUrl;
      _tilesetImages.set(imgUrl, img);
      img.addEventListener('load', () => {
        ctx.drawImage(img, 0, 0, cw, ch);
        drawOverlays();
        updateStatusSelected(selectedLocal, tsIdx);
      });
    }
  };

  // ── Draw a single tile into a mini canvas (for recent row + status preview) ─
  const drawRecentTile = (canvas: HTMLCanvasElement, gid: Num, tm: RenderedTilemap): void => {
    const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find which tileset this gid belongs to
    const resolved = resolveGlobalTileId({
      globalId: gid,
      tilesets: tm.tilesets,
    });
    if (!resolved.ok || resolved.data === null) return;
    const { tileset, localIndex } = resolved.data;
    const { tileWidth, tileHeight } = tileset.config;
    const { columns } = getEffectiveDims(tileset);
    const srcCol: Num = localIndex % columns;
    const srcRow: Num = Math.floor(localIndex / columns);

    const imgUrl: string = tileset.texture.name;
    const cached: HTMLImageElement | undefined = _tilesetImages.get(imgUrl);
    if (cached?.complete) {
      ctx.drawImage(
        cached,
        srcCol * tileWidth,
        srcRow * tileHeight,
        tileWidth,
        tileHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    }
  };

  // ── Status bar update helpers ────────────────────────────────
  const updateStatusHover = (localIdx: Num, tsIdx: Num): void => {
    if (localIdx < 0) {
      statusHover.textContent = '';
      return;
    }
    const ts = tilemap.tilesets[tsIdx];
    if (!ts) return;
    const { columns } = getEffectiveDims(ts);
    const col: Num = localIdx % columns;
    const row: Num = Math.floor(localIdx / columns);
    statusHover.textContent = `#${String(localIdx)} (${String(col)}, ${String(row)})`;
  };

  const updateStatusSelected = (localIdx: Num, tsIdx: Num): void => {
    if (localIdx < 0) {
      statusSelected.textContent = '';
      statusPreview.style.display = 'none';
      statusEmpty.style.display = '';
      return;
    }
    const ts = tilemap.tilesets[tsIdx];
    if (!ts) return;
    const { columns } = getEffectiveDims(ts);
    const col: Num = localIdx % columns;
    const row: Num = Math.floor(localIdx / columns);
    const tsName: string = tilesetNames[tsIdx] ?? `Tileset ${String(tsIdx)}`;
    statusSelected.textContent = `${tsName} #${String(localIdx)} (${String(col)}, ${String(row)})`;
    statusPreview.style.display = '';
    statusEmpty.style.display = 'none';

    // Draw the selected tile into the mini preview
    const gid: Num = localIdx + (ts.config.firstGid ?? 0);
    drawRecentTile(statusPreview, gid, tilemap);
  };

  // ── Place tile helper (shared by click, keyboard, recent) ────
  const placeTileByGlobalId = (dbg: DevDebugApi, newGlobalId: Num): void => {
    if (_lastInspectX < 0 || _lastInspectZ < 0) return;
    const currentTilemap: RenderedTilemap | null = dbg.tilemap;
    if (!currentTilemap) return;
    const editLayer: Num =
      _inspectLayerIndex >= 0
        ? _inspectLayerIndex
        : findTopmostLayerAt(currentTilemap, _lastInspectX, _lastInspectZ);

    const result = updateTile({
      tilemap: currentTilemap,
      layerIndex: editLayer,
      x: _lastInspectX,
      z: _lastInspectZ,
      newTileId: newGlobalId,
    });
    if (result.ok) {
      dbg.tilemap = result.data;
      refreshInspector(result.data, _lastInspectX, _lastInspectZ);
      addRecentTile(newGlobalId);
      refreshRecentRow();
      drawPalette(pickerTsIdx);
    }
  };

  // ── Hover handler ────────────────────────────────────────────
  paletteCanvas.addEventListener('pointermove', (evt: PointerEvent) => {
    const ts = tilemap.tilesets[pickerTsIdx];
    if (!ts) return;
    const { tileWidth, tileHeight } = ts.config;
    const { columns, rows } = getEffectiveDims(ts);
    const zoom: Num = _tilePickerZoom;
    const rect: DOMRect = paletteCanvas.getBoundingClientRect();
    const scaleX: Num = paletteCanvas.width / rect.width;
    const scaleY: Num = paletteCanvas.height / rect.height;
    const px: Num = (evt.clientX - rect.left) * scaleX;
    const py: Num = (evt.clientY - rect.top) * scaleY;
    const col: Num = Math.floor(px / (tileWidth * zoom));
    const row: Num = Math.floor(py / (tileHeight * zoom));
    const localIdx: Num = row * columns + col;

    if (col < 0 || col >= columns || row < 0 || row >= rows) {
      if (hoveredLocal >= 0) {
        hoveredLocal = -1;
        drawPalette(pickerTsIdx);
        tooltip.style.display = 'none';
        updateStatusHover(-1, pickerTsIdx);
      }
      return;
    }

    if (localIdx !== hoveredLocal) {
      hoveredLocal = localIdx;
      drawPalette(pickerTsIdx);
      updateStatusHover(localIdx, pickerTsIdx);
    }

    // Position tooltip near cursor
    tooltip.textContent = `#${String(localIdx)} (${String(col)}, ${String(row)})`;
    tooltip.style.display = 'block';
    tooltip.style.left = `${String(evt.clientX + 12)}px`;
    tooltip.style.top = `${String(evt.clientY + 12)}px`;
  });

  paletteCanvas.addEventListener('pointerleave', () => {
    if (hoveredLocal >= 0) {
      hoveredLocal = -1;
      drawPalette(pickerTsIdx);
    }
    tooltip.style.display = 'none';
    updateStatusHover(-1, pickerTsIdx);
  });

  // ── Click handler ────────────────────────────────────────────
  paletteCanvas.addEventListener('pointerdown', (evt: PointerEvent) => {
    if (_lastInspectX < 0 || _lastInspectZ < 0) return;
    const currentTilemap: RenderedTilemap | null = debug.tilemap;
    if (!currentTilemap) return;
    const ts = currentTilemap.tilesets[pickerTsIdx];
    if (!ts) return;

    const { tileWidth, tileHeight, firstGid } = ts.config;
    const { columns } = getEffectiveDims(ts);
    const zoom: Num = _tilePickerZoom;
    const rect: DOMRect = paletteCanvas.getBoundingClientRect();
    const scaleX: Num = paletteCanvas.width / rect.width;
    const scaleY: Num = paletteCanvas.height / rect.height;
    const px: Num = (evt.clientX - rect.left) * scaleX;
    const py: Num = (evt.clientY - rect.top) * scaleY;
    const col: Num = Math.floor(px / (tileWidth * zoom));
    const row: Num = Math.floor(py / (tileHeight * zoom));
    const localIndex: Num = row * columns + col;
    const newGlobalId: Num = firstGid + localIndex;

    placeTileByGlobalId(debug, newGlobalId);
    paletteCanvas.focus();
  });

  // ── Keyboard handler ─────────────────────────────────────────
  paletteCanvas.addEventListener('keydown', (evt: KeyboardEvent) => {
    const ts = tilemap.tilesets[pickerTsIdx];
    if (!ts) return;
    const { tileWidth, tileHeight, firstGid } = ts.config;
    const { columns, rows } = getEffectiveDims(ts);

    // Initialize keyboard cursor if not set
    if (kbCursorCol < 0 || kbCursorRow < 0) {
      const selected: Num = getSelectedLocalForTileset(pickerTsIdx);
      if (selected >= 0) {
        kbCursorCol = selected % columns;
        kbCursorRow = Math.floor(selected / columns);
      } else {
        kbCursorCol = 0;
        kbCursorRow = 0;
      }
    }

    let handled = true;
    switch (evt.key) {
      case 'ArrowLeft': {
        kbCursorCol = Math.max(0, kbCursorCol - 1);
        break;
      }
      case 'ArrowRight': {
        kbCursorCol = Math.min(columns - 1, kbCursorCol + 1);
        break;
      }
      case 'ArrowUp': {
        kbCursorRow = Math.max(0, kbCursorRow - 1);
        break;
      }
      case 'ArrowDown': {
        kbCursorRow = Math.min(rows - 1, kbCursorRow + 1);
        break;
      }
      case 'Enter':
      case ' ': {
        const localIdx: Num = kbCursorRow * columns + kbCursorCol;
        const gid: Num = firstGid + localIdx;
        placeTileByGlobalId(debug, gid);
        break;
      }
      case 'Escape': {
        closeTilePickerPanel();
        return;
      }
      default: {
        handled = false;
      }
    }

    if (handled) {
      evt.preventDefault();
      evt.stopPropagation();
      drawPalette(pickerTsIdx);
      const kbLocal: Num = kbCursorRow * columns + kbCursorCol;
      updateStatusHover(kbLocal, pickerTsIdx);

      // Scroll keyboard cursor into view
      const tileX: Num = kbCursorCol * tileWidth * _tilePickerZoom;
      const tileY: Num = kbCursorRow * tileHeight * _tilePickerZoom;
      const tileW: Num = tileWidth * _tilePickerZoom;
      const tileH: Num = tileHeight * _tilePickerZoom;
      if (tileX < viewport.scrollLeft) {
        viewport.scrollLeft = tileX;
      } else if (tileX + tileW > viewport.scrollLeft + viewport.clientWidth) {
        viewport.scrollLeft = tileX + tileW - viewport.clientWidth;
      }
      if (tileY < viewport.scrollTop) {
        viewport.scrollTop = tileY;
      } else if (tileY + tileH > viewport.scrollTop + viewport.clientHeight) {
        viewport.scrollTop = tileY + tileH - viewport.clientHeight;
      }
    }
  });

  // ── Assemble and mount ───────────────────────────────────────
  document.body.append(tooltip);
  document.body.append(panel);
  refreshRecentRow();
  drawPalette(0);

  // Expose redraw so external handlers (selection style, grid color) can trigger it
  _tilePickerRedraw = () => {
    drawPalette(pickerTsIdx);
  };

  // Expose sync so map clicks auto-switch the picker to the inspected tile's tileset
  const tsSelect: HTMLSelectElement | null = tsRow.querySelector('select');
  _tilePickerSyncTileset = () => {
    if (_lastInspectX < 0 || _lastInspectZ < 0) return;
    const currentTm: RenderedTilemap | null = debug.tilemap;
    if (!currentTm) return;
    const tileIndex: Num = _lastInspectZ * currentTm.mapData.width + _lastInspectX;
    const globalId: Num = lookupTileAtIndex(currentTm, tileIndex);
    if (globalId === 0) return;
    // Find which tileset index this global ID belongs to
    for (let i: Num = 0; i < currentTm.tilesets.length; i++) {
      const ts = currentTm.tilesets[i];
      if (!ts) continue;
      const { firstGid } = ts.config;
      const { columns, rows } = getEffectiveDims(ts);
      const local: Num = globalId - firstGid;
      if (local >= 0 && local < columns * rows) {
        if (i !== pickerTsIdx) {
          pickerTsIdx = i;
          if (tsSelect) tsSelect.value = String(i);
        }
        drawPalette(pickerTsIdx);
        return;
      }
    }
  };
}

/**
 * Populates the tile inspector section with editable controls
 * and attaches a canvas click handler for pick-to-inspect.
 * Controls are created once; their values are updated when a tile
 * is clicked.
 *
 * @param debug - Debug API reference.
 * @param scene - Babylon.js scene.
 */
function buildTileInspectorUI(debug: DevDebugApi, scene: BABYLON.Scene): void {
  const container = document.querySelector('#tileinspector-body') as HTMLElement | null;
  if (!container || !debug.tilemap) return;

  container.innerHTML = '';

  // -- Empty state (shown until a tile is clicked) --
  const emptyState: HTMLElement = document.createElement('div');
  emptyState.className = 'ti-empty';
  emptyState.id = 'ti-empty-state';
  const emptyIcon: HTMLElement = document.createElement('div');
  emptyIcon.className = 'ti-empty-icon';
  emptyIcon.textContent = '\u25E7'; // ◧
  const emptyText: HTMLElement = document.createElement('div');
  emptyText.className = 'ti-empty-text';
  emptyText.textContent = 'Select a tile on the map to inspect';
  emptyState.append(emptyIcon, emptyText);
  container.append(emptyState);

  // -- Selection summary (shown during rectangular selection) --
  const selSummary: HTMLElement = document.createElement('div');
  selSummary.id = 'ti-selection-summary';
  selSummary.style.display = 'none';
  selSummary.style.padding = '12px 8px';
  // Delegate click for the Clear Selection button (recreated each render)
  selSummary.addEventListener('click', (evt: MouseEvent) => {
    const target = evt.target as HTMLElement;
    if (target.id === 'ti-clear-selection-btn') {
      clearSelectionRect(debug);
    }
  });
  container.append(selSummary);

  // -- Controls wrapper (hidden until a tile is clicked) --
  const controlsWrap: HTMLElement = document.createElement('div');
  controlsWrap.id = 'ti-controls';
  controlsWrap.style.display = 'none';
  container.append(controlsWrap);

  // -- Tile preview canvas with edit overlay --
  const previewRow: HTMLElement = document.createElement('div');
  previewRow.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 8px;';

  // Wrapper for preview + edit overlay
  const previewWrap: HTMLElement = document.createElement('div');
  previewWrap.style.cssText = 'position:relative;width:48px;height:48px;flex-shrink:0;';

  const previewCanvas: HTMLCanvasElement = document.createElement('canvas');
  previewCanvas.id = 'ti-preview';
  previewCanvas.width = 16;
  previewCanvas.height = 16;
  previewCanvas.style.cssText =
    'width:48px;height:48px;border:1px solid #555;background:#222;image-rendering:pixelated;';

  // Edit icon overlay (pencil) — shown on hover, opens tile picker
  const editOverlay: HTMLElement = document.createElement('div');
  editOverlay.style.cssText = [
    'position:absolute',
    'inset:0',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'background:rgba(0,0,0,0.55)',
    'opacity:0',
    'transition:opacity 0.15s',
    'cursor:pointer',
    'border:1px solid #555',
    'font-size:18px',
  ].join(';');
  editOverlay.textContent = '\u270E'; // ✎ pencil
  editOverlay.title = 'Open Tile Picker';
  previewWrap.addEventListener('mouseenter', () => {
    editOverlay.style.opacity = '1';
  });
  previewWrap.addEventListener('mouseleave', () => {
    editOverlay.style.opacity = '0';
  });

  previewWrap.append(previewCanvas, editOverlay);

  const previewLabel: HTMLElement = document.createElement('span');
  previewLabel.style.cssText = 'color:#888;font-size:10px;';
  previewLabel.textContent = '';
  previewLabel.id = 'ti-preview-label';
  previewRow.append(previewWrap, previewLabel);
  controlsWrap.append(previewRow);

  // -- Layer selector dropdown --
  const { tilemap: tiTilemap } = debug;
  const layerNames: string[] = ['Topmost'];
  if (tiTilemap) {
    for (const layer of tiTilemap.mapData.layers) {
      layerNames.push(layer.name);
    }
  }
  const layerSelectRow: HTMLElement = createDropdown(
    'Inspect Layer',
    layerNames,
    'Topmost',
    (val: string) => {
      const idx: Num = layerNames.indexOf(val) - 1; // -1 = Topmost, 0+ = layer index
      _inspectLayerIndex = idx;
      // Re-inspect the last-clicked tile with the new layer
      if (_lastInspectX >= 0 && _lastInspectZ >= 0 && debug.tilemap) {
        refreshInspector(debug.tilemap, _lastInspectX, _lastInspectZ);
      }
      // Update dim layers when switching layers
      applyDimLayers(debug.tilemap);
    },
    'ti-inspect-layer',
    "Which map layer to inspect. 'Topmost' picks the highest non-empty layer.",
  );
  controlsWrap.append(layerSelectRow);

  // -- Identity (expanded by default — most-used) --
  const identity = createCollapsibleGroup('Identity', false);
  identity.body.append(
    infoRow(
      'Tile ID (global)',
      'ti-global-id',
      'Unique numeric ID across all tilesets in the project.',
    ),
  );
  identity.body.append(
    infoRow('Tile ID (local)', 'ti-local-id', 'Tile index within its parent tileset (0-based).'),
  );
  identity.body.append(
    infoRow('Tileset', 'ti-tileset', 'Name of the tileset image this tile belongs to.'),
  );
  identity.body.append(
    infoRow('Grid Position', 'ti-grid-pos', 'Column and row of this tile on the map grid (X, Z).'),
  );
  identity.body.append(infoRow('Layer', 'ti-layer', 'Map layer index where this tile is placed.'));
  controlsWrap.append(identity.root);

  // -- Passability (collapsed) --
  const pass = createCollapsibleGroup('Passability', true);

  const passDownRow: HTMLElement = createToggleRow(
    'Pass ↓',
    true,
    (on: boolean) => {
      writePassability(0, on);
    },
    'ti-pass-down',
    'Allow character movement downward through this tile.',
  );
  pass.body.append(passDownRow);

  const passLeftRow: HTMLElement = createToggleRow(
    'Pass ←',
    true,
    (on: boolean) => {
      writePassability(1, on);
    },
    'ti-pass-left',
    'Allow character movement leftward through this tile.',
  );
  pass.body.append(passLeftRow);

  const passRightRow: HTMLElement = createToggleRow(
    'Pass →',
    true,
    (on: boolean) => {
      writePassability(2, on);
    },
    'ti-pass-right',
    'Allow character movement rightward through this tile.',
  );
  pass.body.append(passRightRow);

  const passUpRow: HTMLElement = createToggleRow(
    'Pass ↑',
    true,
    (on: boolean) => {
      writePassability(3, on);
    },
    'ti-pass-up',
    'Allow character movement upward through this tile.',
  );
  pass.body.append(passUpRow);

  const passAboveRow: HTMLElement = createToggleRow(
    'Pass Above',
    false,
    (on: boolean) => {
      writeTileProp({ passAbove: on });
    },
    'ti-pass-above',
    'Allow passage to the layer above (vertical stacking).',
  );
  pass.body.append(passAboveRow);

  const passBelowRow: HTMLElement = createToggleRow(
    'Pass Below',
    false,
    (on: boolean) => {
      writeTileProp({ passBelow: on });
    },
    'ti-pass-below',
    'Allow passage to the layer below (vertical stacking).',
  );
  pass.body.append(passBelowRow);

  const passEventRow: HTMLElement = createToggleRow(
    'Event Passable',
    true,
    (on: boolean) => {
      writeTileProp({ passEvent: on });
    },
    'ti-pass-event',
    'Can events (NPCs, objects) traverse this tile?',
  );
  pass.body.append(passEventRow);

  const starPassageRow: HTMLElement = createToggleRow(
    'Star Passage',
    false,
    (on: boolean) => {
      writeTileProp({ starPassage: on });
    },
    'ti-star-passage',
    'Special RPG Maker passage mode: passable regardless of other flags.',
  );
  pass.body.append(starPassageRow);

  const passVehicleRow: HTMLElement = createSliderRow(
    'Vehicle Flags',
    0,
    31,
    1,
    0,
    (val: number) => {
      writeTileProp({ passVehicle: val });
    },
    'ti-pass-vehicle',
    'Bitmask for which vehicle types can traverse (0 = none, 31 = all).',
  );
  pass.body.append(passVehicleRow);

  const passHeightRow: HTMLElement = createSliderRow(
    'Pass Height',
    0,
    15,
    1,
    0,
    (val: number) => {
      writeTileProp({ passHeight: val });
    },
    'ti-pass-height',
    'Tile collision height in half-tile units (0–15).',
  );
  pass.body.append(passHeightRow);
  controlsWrap.append(pass.root);

  // -- Terrain (collapsed) --
  const terrain = createCollapsibleGroup('Terrain', true);

  const terrainTagRow: HTMLElement = createSliderRow(
    'Terrain Tag',
    0,
    15,
    1,
    0,
    (val: number) => {
      writeTileProp({ terrainTag: val });
    },
    'ti-terrain-tag',
    'Numeric tag for gameplay logic (0–15). Used by events and scripts.',
  );
  terrain.body.append(terrainTagRow);

  const terrainTypeRow: HTMLElement = createDropdown(
    'Terrain Type',
    TERRAIN_TYPE_OPTIONS,
    'normal',
    (val: string) => {
      writeTileProp({ terrainType: val });
    },
    'ti-terrain-type',
    'Surface type affecting footstep sounds and movement behavior.',
  );
  terrain.body.append(terrainTypeRow);

  terrain.body.append(
    infoRow(
      'Footstep Sound',
      'ti-footstep',
      'Sound effect played when a character steps on this terrain type.',
    ),
  );

  const encounterRateRow: HTMLElement = createSliderRow(
    'Encounter Rate',
    0,
    10,
    0.1,
    1,
    (val: number) => {
      writeTileProp({ encounterRate: val });
    },
    'ti-encounter-rate',
    'Random encounter multiplier. 0 = no encounters, higher = more frequent.',
  );
  terrain.body.append(encounterRateRow);

  const slipperinessRow: HTMLElement = createSliderRow(
    'Slipperiness',
    0,
    1,
    0.01,
    0,
    (val: number) => {
      writeTileProp({ slipperiness: val });
    },
    'ti-slipperiness',
    'Ice-like sliding factor. 0 = normal grip, 1 = full slide.',
  );
  terrain.body.append(slipperinessRow);

  const movementSpeedRow: HTMLElement = createSliderRow(
    'Move Speed',
    0.1,
    5,
    0.1,
    1,
    (val: number) => {
      writeTileProp({ movementSpeed: val });
    },
    'ti-move-speed',
    'Movement speed multiplier on this tile. 1 = normal, <1 = slow, >1 = fast.',
  );
  terrain.body.append(movementSpeedRow);

  const regionIdRow: HTMLElement = createSliderRow(
    'Region ID',
    0,
    255,
    1,
    0,
    (val: number) => {
      writeTileProp({ regionId: val });
    },
    'ti-region-id',
    'Map region identifier (0–255). Used for area triggers and scripting.',
  );
  terrain.body.append(regionIdRow);
  controlsWrap.append(terrain.root);

  // -- Flags (collapsed) --
  const flags = createCollapsibleGroup('Flags', true);

  const heightRow: HTMLElement = createSliderRow(
    'Height Level',
    0,
    15,
    1,
    0,
    (val: number) => {
      writeTileProp({ height: val });
    },
    'ti-height',
    'Tile height for layered rendering (0–15 half-tile increments).',
  );
  flags.body.append(heightRow);

  const damageFloorRow: HTMLElement = createToggleRow(
    'Damage Floor',
    false,
    (on: boolean) => {
      writeTileProp({ damageFloor: on });
    },
    'ti-damage-floor',
    'Tile deals damage to characters standing on it each step.',
  );
  flags.body.append(damageFloorRow);

  const bushRow: HTMLElement = createToggleRow(
    'Bush Tile',
    false,
    (on: boolean) => {
      writeTileProp({ bush: on });
    },
    'ti-bush',
    'Character sprite is partially hidden (bush/tall grass effect).',
  );
  flags.body.append(bushRow);

  const counterRow: HTMLElement = createToggleRow(
    'Counter Tile',
    false,
    (on: boolean) => {
      writeTileProp({ counter: on });
    },
    'ti-counter',
    'Tile acts as a counter — interactions pass through to the tile behind.',
  );
  flags.body.append(counterRow);

  const ladderRow: HTMLElement = createToggleRow(
    'Ladder Tile',
    false,
    (on: boolean) => {
      writeTileProp({ ladder: on });
    },
    'ti-ladder',
    'Tile acts as a ladder — character sprite faces upward while climbing.',
  );
  flags.body.append(ladderRow);

  const slipRow: HTMLElement = createToggleRow(
    'Slip Tile',
    false,
    (on: boolean) => {
      writeTileProp({ slip: on });
    },
    'ti-slip',
    'Character slides across this tile without stopping (ice).',
  );
  flags.body.append(slipRow);

  const shelterRow: HTMLElement = createToggleRow(
    'Shelter Tile',
    false,
    (on: boolean) => {
      writeTileProp({ shelter: on });
    },
    'ti-shelter',
    'Protects from weather effects when standing on this tile.',
  );
  flags.body.append(shelterRow);

  const bushDepthRow: HTMLElement = createSliderRow(
    'Bush Depth (px)',
    0,
    48,
    1,
    12,
    (val: number) => {
      writeTileProp({ bushDepth: val });
    },
    'ti-bush-depth',
    'Pixels of character hidden by bush effect (0–48).',
  );
  flags.body.append(bushDepthRow);

  const coverHeightRow: HTMLElement = createSliderRow(
    'Cover Fraction',
    0,
    1,
    0.01,
    0,
    (val: number) => {
      writeTileProp({ coverHeight: val });
    },
    'ti-cover-height',
    'Fraction of character sprite covered by terrain (0–1).',
  );
  flags.body.append(coverHeightRow);

  const soundAbsorbRow: HTMLElement = createToggleRow(
    'Sound Absorb',
    false,
    (on: boolean) => {
      writeTileProp({ soundAbsorb: on });
    },
    'ti-sound-absorb',
    'Dampens footstep and ambient sounds on this tile.',
  );
  flags.body.append(soundAbsorbRow);
  controlsWrap.append(flags.root);

  // -- Damage (collapsed) --
  const damage = createCollapsibleGroup('Damage', true);

  const damageAmountRow: HTMLElement = createSliderRow(
    'Damage HP',
    0,
    9999,
    1,
    0,
    (val: number) => {
      writeTileProp({ damageAmount: val });
    },
    'ti-damage-amount',
    'HP lost per damage tick when standing on a damage floor.',
  );
  damage.body.append(damageAmountRow);

  const damagePercentRow: HTMLElement = createSliderRow(
    'Damage % HP',
    0,
    100,
    0.1,
    0,
    (val: number) => {
      writeTileProp({ damagePercent: val });
    },
    'ti-damage-percent',
    'Percentage of max HP lost per tick (0–100%).',
  );
  damage.body.append(damagePercentRow);

  const damageElementRow: HTMLElement = createTextInputRow(
    'Damage Element',
    '',
    (val: string) => {
      writeTileProp({ damageElement: val });
    },
    'ti-damage-element',
    "Element type name for damage floor (e.g., 'fire', 'poison').",
  );
  damage.body.append(damageElementRow);

  const damageIntervalRow: HTMLElement = createSliderRow(
    'Damage Interval',
    1,
    999,
    1,
    1,
    (val: number) => {
      writeTileProp({ damageInterval: val });
    },
    'ti-damage-interval',
    'Frames between each damage tick on a damage floor.',
  );
  damage.body.append(damageIntervalRow);
  controlsWrap.append(damage.root);

  // -- Reflection (collapsed) --
  const reflect = createCollapsibleGroup('Reflection', true);

  const reflectionRow: HTMLElement = createToggleRow(
    'Reflection',
    false,
    (on: boolean) => {
      writeTileProp({ reflection: on });
    },
    'ti-reflection',
    'Render a reflected copy of characters below this tile.',
  );
  reflect.body.append(reflectionRow);

  const reflectionOpacityRow: HTMLElement = createSliderRow(
    'Reflect Opacity',
    0,
    1,
    0.01,
    0.5,
    (val: number) => {
      writeTileProp({ reflectionOpacity: val });
    },
    'ti-reflect-opacity',
    'Transparency of the reflection (0 = invisible, 1 = mirror).',
  );
  reflect.body.append(reflectionOpacityRow);
  controlsWrap.append(reflect.root);

  // -- Glow (collapsed) --
  const glowGroup = createCollapsibleGroup('Glow', true);

  const glowRow: HTMLElement = createToggleRow(
    'Tile Glow',
    false,
    (on: boolean) => {
      writeTileProp({ glow: on });
    },
    'ti-glow',
    'Emit a glow effect from this tile (uses glow layer).',
  );
  glowGroup.body.append(glowRow);

  const TILE_GLOW_PRESETS: ReadonlyArray<{ readonly name: string; readonly hex: string }> = [
    { name: 'White', hex: '#ffffff' },
    { name: 'Orange', hex: '#ff8800' },
    { name: 'Cyan', hex: '#00ffff' },
    { name: 'Purple', hex: '#9933ff' },
    { name: 'Gold', hex: '#ffcc00' },
  ];
  const glowColorRow: HTMLElement = createColorPickerRow(
    'Glow Color',
    TILE_GLOW_PRESETS,
    '#ffffff',
    (hex: string) => {
      writeTileProp({ glowColor: `${hex}ff` });
    },
    'ti-glow-color',
    'Color of the tile glow emission. Pick from presets or use the color picker.',
  );
  glowGroup.body.append(glowColorRow);

  const glowIntensityRow: HTMLElement = createSliderRow(
    'Glow Strength',
    0,
    1,
    0.01,
    0,
    (val: number) => {
      writeTileProp({ glowIntensity: val });
    },
    'ti-glow-intensity',
    'Brightness of the tile glow effect (0–1).',
  );
  glowGroup.body.append(glowIntensityRow);
  controlsWrap.append(glowGroup.root);

  // -- Collision (collapsed) --
  const collision = createCollapsibleGroup('Collision', true);
  collision.body.append(infoRow('Collision Shapes', 'ti-collision-count'));
  controlsWrap.append(collision.root);

  // -- Custom Properties (collapsed) --
  const custom = createCollapsibleGroup('Custom Properties', true);
  custom.body.append(infoRow('Properties', 'ti-properties'));
  custom.body.append(infoRow('Class', 'ti-class'));
  custom.body.append(infoRow('Tags', 'ti-tags'));
  custom.body.append(infoRow('Script Hook', 'ti-script-hook'));
  controlsWrap.append(custom.root);

  // -- Animation (collapsed) --
  const anim = createCollapsibleGroup('Animation', true);
  anim.body.append(infoRow('Frames', 'ti-anim-frames'));
  anim.body.append(infoRow('Playback Mode', 'ti-anim-mode'));
  anim.body.append(infoRow('Global Sync', 'ti-anim-sync'));
  anim.body.append(infoRow('Speed Multiplier', 'ti-anim-speed'));
  anim.body.append(infoRow('Pause Offscreen', 'ti-anim-pause'));
  controlsWrap.append(anim.root);

  // -- Clear Tile(s) button --
  const clearTileBtn: HTMLButtonElement = document.createElement('button');
  clearTileBtn.className = 'btn btn-danger';
  clearTileBtn.textContent = 'Clear Tile';
  clearTileBtn.title = 'Clear selected tile(s) on current layer (Delete key)';
  clearTileBtn.style.marginTop = '6px';
  clearTileBtn.style.width = '100%';
  clearTileBtn.addEventListener('click', () => {
    const rect = getSelectionRect();
    if (rect) {
      clearSelectionRect(debug);
    } else {
      clearSelectedTile(debug);
    }
  });
  controlsWrap.append(clearTileBtn);
  (window as Record<string, unknown>)._clearTileBtn = clearTileBtn;

  // -- Wire edit overlay to open tile picker --
  if (tiTilemap) {
    editOverlay.addEventListener('click', () => {
      openTilePickerPanel(debug, tiTilemap);
    });
  }

  // -- Extract control references for external updates --
  const [passVehicleInput, passVehicleVal] = getSliderParts(passVehicleRow);
  const [passHeightInput, passHeightValEl] = getSliderParts(passHeightRow);
  const [terrainTagInput, terrainTagVal] = getSliderParts(terrainTagRow);
  const [encounterRateInput, encounterRateVal] = getSliderParts(encounterRateRow);
  const [slipperinessInput, slipperinessVal] = getSliderParts(slipperinessRow);
  const [movementSpeedInput, movementSpeedVal] = getSliderParts(movementSpeedRow);
  const [regionIdInput, regionIdVal] = getSliderParts(regionIdRow);
  const [heightInput, heightVal] = getSliderParts(heightRow);
  const [bushDepthInput, bushDepthVal] = getSliderParts(bushDepthRow);
  const [coverHeightInput, coverHeightVal] = getSliderParts(coverHeightRow);
  const [damageAmountInput, damageAmountVal] = getSliderParts(damageAmountRow);
  const [damagePercentInput, damagePercentVal] = getSliderParts(damagePercentRow);
  const [damageIntervalInput, damageIntervalVal] = getSliderParts(damageIntervalRow);
  const [reflectionOpacityInput, reflectionOpacityVal] = getSliderParts(reflectionOpacityRow);
  const [glowIntensityInput, glowIntensityVal] = getSliderParts(glowIntensityRow);
  const damageElementInput: HTMLInputElement = getTextInput(damageElementRow);
  const glowColorInput: HTMLInputElement = getTextInput(glowColorRow);

  _tiControls = {
    passDown: getToggleSwitch(passDownRow),
    passLeft: getToggleSwitch(passLeftRow),
    passRight: getToggleSwitch(passRightRow),
    passUp: getToggleSwitch(passUpRow),
    passAbove: getToggleSwitch(passAboveRow),
    passBelow: getToggleSwitch(passBelowRow),
    passEvent: getToggleSwitch(passEventRow),
    starPassage: getToggleSwitch(starPassageRow),
    passVehicle: passVehicleInput,
    passVehicleVal,
    passHeight: passHeightInput,
    passHeightVal: passHeightValEl,
    terrainTag: terrainTagInput,
    terrainTagVal,
    terrainType: getDropdownSelect(terrainTypeRow),
    encounterRate: encounterRateInput,
    encounterRateVal,
    slipperiness: slipperinessInput,
    slipperinessVal,
    movementSpeed: movementSpeedInput,
    movementSpeedVal,
    regionId: regionIdInput,
    regionIdVal,
    height: heightInput,
    heightVal,
    damageFloor: getToggleSwitch(damageFloorRow),
    bush: getToggleSwitch(bushRow),
    counter: getToggleSwitch(counterRow),
    ladder: getToggleSwitch(ladderRow),
    slip: getToggleSwitch(slipRow),
    shelter: getToggleSwitch(shelterRow),
    bushDepth: bushDepthInput,
    bushDepthVal,
    coverHeight: coverHeightInput,
    coverHeightVal,
    soundAbsorb: getToggleSwitch(soundAbsorbRow),
    damageAmount: damageAmountInput,
    damageAmountVal,
    damagePercent: damagePercentInput,
    damagePercentVal,
    damageElement: damageElementInput,
    damageInterval: damageIntervalInput,
    damageIntervalVal,
    reflection: getToggleSwitch(reflectionRow),
    reflectionOpacity: reflectionOpacityInput,
    reflectionOpacityVal,
    glow: getToggleSwitch(glowRow),
    glowColor: glowColorInput,
    glowIntensity: glowIntensityInput,
    glowIntensityVal,
  };

  // Create selection meshes in the utility layer scene so they render AFTER
  // all post-processing (fog, bloom, glow, SSAO, vignette, tone mapping, etc.)
  const utilScene: BABYLON.Scene = ensureUtilityLayer(scene).utilityLayerScene;

  // Create a reusable selection highlight (cyan wireframe)
  const highlightMesh: BABYLON.Mesh = BABYLON.MeshBuilder.CreateGround(
    'tile-inspector-highlight',
    { width: 1, height: 1 },
    utilScene,
  );
  const highlightMat: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(
    'tile-inspector-highlight-mat',
    utilScene,
  );
  highlightMat.emissiveColor = _selectionColor;
  highlightMat.disableLighting = true;
  highlightMat.wireframe = true;
  highlightMat.zOffset = -2;
  highlightMesh.material = highlightMat;
  highlightMesh.isPickable = false;
  highlightMesh.visibility = _selectionAlpha;
  highlightMesh.setEnabled(false);

  // Create a hollow frame border mesh around the highlight.
  // WebGL clamps lineWidth to 1px, so edgesWidth cannot produce thick borders.
  // Instead, a hollow frame mesh (annulus) built with custom vertex data
  // provides a visible colored border around the selection.
  const borderMesh: BABYLON.Mesh = new BABYLON.Mesh('tile-inspector-border', utilScene);
  rebuildBorderGeometry(borderMesh, 1, 1, _selectionEdgeWidth);
  const borderMat: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(
    'tile-inspector-border-mat',
    utilScene,
  );
  borderMat.emissiveColor = _selectionColor;
  borderMat.disableLighting = true;
  borderMat.zOffset = -1;
  borderMesh.material = borderMat;
  borderMesh.isPickable = false;
  borderMesh.visibility = _selectionAlpha;
  borderMesh.setEnabled(false);

  // Create a solid fill mesh behind the wireframe and border for the interior color
  const fillMesh: BABYLON.Mesh = BABYLON.MeshBuilder.CreateGround(
    'tile-inspector-fill',
    { width: 1, height: 1 },
    utilScene,
  );
  const fillMat: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(
    'tile-inspector-fill-mat',
    utilScene,
  );
  fillMat.emissiveColor = _selectionFillColor;
  fillMat.disableLighting = true;
  fillMesh.material = fillMat;
  fillMesh.isPickable = false;
  fillMesh.visibility = _selectionFillAlpha;
  fillMesh.setEnabled(false);

  // Store meshes globally for selection scaling
  (window as Record<string, unknown>)._highlightMesh = highlightMesh;
  (window as Record<string, unknown>)._borderMesh = borderMesh;
  (window as Record<string, unknown>)._selectionFillMesh = fillMesh;

  // Attach canvas click handler
  const canvas: HTMLCanvasElement | null =
    document.querySelector<HTMLCanvasElement>('#game-canvas');
  if (!canvas) return;

  // Click-vs-drag threshold (px). If pointer moves less than this between
  // pointerdown and pointerup it counts as a click, otherwise it's a drag
  // (camera rotation) and tile inspection is skipped.
  const CLICK_THRESHOLD = 6;

  canvas.addEventListener('pointerdown', (evt: PointerEvent) => {
    // Only react to left-click; ignore when dragging camera
    if (evt.button !== 0) return;

    const { tilemap }: { tilemap: RenderedTilemap | null } = debug;
    if (!tilemap) return;

    const pickResult: BABYLON.PickingInfo = scene.pick(evt.offsetX, evt.offsetY);

    if (!pickResult.hit || !pickResult.pickedPoint) return;

    // Convert world position to grid coordinates (tileWorldSize = 1)
    const gridX: Num = Math.floor(pickResult.pickedPoint.x);
    const gridZ: Num = Math.floor(pickResult.pickedPoint.z);
    const mapW: Num = tilemap.mapData.width;
    const mapH: Num = tilemap.mapData.height;

    // Bounds check
    if (gridX < 0 || gridX >= mapW || gridZ < 0 || gridZ >= mapH) return;

    // ── Shift+click: start rectangular selection ──
    if (evt.shiftKey) {
      _isRectSelecting = true;
      _selStartX = gridX;
      _selStartZ = gridZ;
      _selEndX = gridX;
      _selEndZ = gridZ;

      // Temporarily detach camera input so shift+drag doesn't rotate/pan
      const activeCam: BABYLON.Nullable<BABYLON.Camera> = scene.activeCamera;
      if (activeCam) activeCam.detachControl();

      // Capture pointer to ensure we get pointerup even if cursor leaves canvas
      canvas.setPointerCapture(evt.pointerId);
      const capturedPointerId: number = evt.pointerId;

      const highlightY: Num = pickResult.pickedPoint.y + 0.02;
      highlightMesh.position.y = highlightY;
      highlightMesh.setEnabled(true);
      updateHighlightForSelection();
      showSelectionSummary();

      const onMove = (moveEvt: PointerEvent): void => {
        const moveResult: BABYLON.PickingInfo = scene.pick(moveEvt.offsetX, moveEvt.offsetY);
        if (!moveResult.hit || !moveResult.pickedPoint) return;
        const mx: Num = Math.floor(moveResult.pickedPoint.x);
        const mz: Num = Math.floor(moveResult.pickedPoint.z);
        if (mx < 0 || mx >= mapW || mz < 0 || mz >= mapH) return;
        _selEndX = mx;
        _selEndZ = mz;
        updateHighlightForSelection();
        showSelectionSummary();
      };

      const cleanup = (): void => {
        _isRectSelecting = false;
        // Reattach camera input after selection ends
        if (activeCam && canvas) activeCam.attachControl(canvas, true);
        if (canvas.hasPointerCapture(capturedPointerId)) {
          canvas.releasePointerCapture(capturedPointerId);
        }
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', cleanup);
        canvas.removeEventListener('pointercancel', cleanup);
        canvas.removeEventListener('lostpointercapture', cleanup);
      };

      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', cleanup);
      canvas.addEventListener('pointercancel', cleanup);
      canvas.addEventListener('lostpointercapture', cleanup);
      return;
    }

    // ── Normal click: use click-vs-drag detection ──
    // Record start position; only inspect tile if pointer didn't move far
    // (i.e. it was a click, not a camera rotation drag).
    const downX: number = evt.clientX;
    const downY: number = evt.clientY;

    const onClickUp = (upEvt: PointerEvent): void => {
      canvas.removeEventListener('pointerup', onClickUp);

      const dx: number = upEvt.clientX - downX;
      const dy: number = upEvt.clientY - downY;
      if (dx * dx + dy * dy > CLICK_THRESHOLD * CLICK_THRESHOLD) return;

      // This was a click, not a drag — perform tile inspection
      _selStartX = -1;
      _selStartZ = -1;
      _selEndX = -1;
      _selEndZ = -1;

      // Cache grid position for re-inspection when switching layers
      _lastInspectX = gridX;
      _lastInspectZ = gridZ;

      // Position the highlight mesh over the selected tile (use picked Y for cliffs)
      const highlightY: Num = (pickResult.pickedPoint?.y ?? 0) + 0.02;
      highlightMesh.position.y = highlightY;
      highlightMesh.setEnabled(true);
      updateHighlightForSelection();

      // Enable selection-dependent buttons in the Navigation section
      const selBtnRef = (window as Record<string, unknown>)._selBtn as
        | HTMLButtonElement
        | undefined;
      const centerBtnRef = (window as Record<string, unknown>)._centerBtn as
        | HTMLButtonElement
        | undefined;
      const clearTileBtnRef = (window as Record<string, unknown>)._clearTileBtn as
        | HTMLButtonElement
        | undefined;
      if (selBtnRef) selBtnRef.disabled = false;
      if (centerBtnRef) centerBtnRef.disabled = false;
      if (clearTileBtnRef) clearTileBtnRef.disabled = false;

      // Update dim layers on tile selection (topmost layer may change)
      applyDimLayers(tilemap);

      refreshInspector(tilemap, gridX, gridZ);

      // Sync tile picker to the inspected tile's tileset
      _tilePickerSyncTileset?.();
    };

    canvas.addEventListener('pointerup', onClickUp);
  });

  // ── Selection Style controls ──
  container.append(createSubHeader('Selection Style'));
  container.append(
    createColorPickerRow(
      'Edge Color',
      SELECTION_COLOR_PRESETS,
      '#44ccdd',
      (hex: string) => {
        _selectionColor = BABYLON.Color3.FromHexString(hex);
        updateSelectionAppearance();
      },
      'ti-sel-edge-color',
      'Outline color of the selection highlight drawn around selected tiles.',
    ),
  );
  container.append(
    createSliderRow(
      'Edge Width',
      0.02,
      0.2,
      0.01,
      _selectionEdgeWidth,
      (val: Num) => {
        _selectionEdgeWidth = val;
        updateHighlightForSelection();
      },
      'ti-sel-edge-width',
      'Thickness of the selection outline in world units.',
    ),
  );
  container.append(
    createSliderRow(
      'Edge Opacity',
      0.1,
      1,
      0.05,
      _selectionAlpha,
      (val: Num) => {
        _selectionAlpha = val;
        updateSelectionAppearance();
      },
      'ti-sel-edge-opacity',
      'Transparency of the selection outline. 1 = fully opaque.',
    ),
  );
  container.append(
    createSliderRow(
      'Fill Opacity',
      0,
      1,
      0.05,
      _selectionFillAlpha,
      (val: Num) => {
        _selectionFillAlpha = val;
        updateSelectionAppearance();
      },
      'ti-sel-fill-opacity',
      'Transparency of the selection fill overlay. 0 = outline only.',
    ),
  );
  container.append(
    createColorPickerRow(
      'Fill Color',
      SELECTION_COLOR_PRESETS,
      '#44ccdd',
      (hex: string) => {
        _selectionFillColor = BABYLON.Color3.FromHexString(hex);
        updateSelectionAppearance();
      },
      'ti-sel-fill-color',
      'Color of the semi-transparent fill inside the selection outline.',
    ),
  );
}

/**
 * Shows the rectangular selection summary in the Tile Inspector,
 * hiding single-tile controls and the empty state.
 */
function showSelectionSummary(): void {
  const emptyEl: HTMLElement | null = document.querySelector('#ti-empty-state');
  const ctrlsEl: HTMLElement | null = document.querySelector('#ti-controls');
  const summaryEl: HTMLElement | null = document.querySelector('#ti-selection-summary');
  if (emptyEl) emptyEl.style.display = 'none';
  if (ctrlsEl) ctrlsEl.style.display = 'none';
  if (!summaryEl) return;

  const rect = getSelectionRect();
  if (!rect) return;

  const w: Num = rect.maxX - rect.minX + 1;
  const h: Num = rect.maxZ - rect.minZ + 1;
  const total: Num = w * h;

  summaryEl.style.display = '';
  summaryEl.innerHTML = '';

  const icon: HTMLDivElement = document.createElement('div');
  icon.style.cssText = 'font-size:24px;text-align:center;color:#7dd;margin-bottom:6px;';
  icon.textContent = '\u25A3'; // ▣

  const title: HTMLDivElement = document.createElement('div');
  title.style.cssText = 'text-align:center;font-size:13px;color:#ccc;margin-bottom:8px;';
  title.textContent = `${String(w)}\u00D7${String(h)} Selection (${String(total)} tiles)`;

  const bounds: HTMLDivElement = document.createElement('div');
  bounds.style.cssText = 'font-size:11px;color:#888;text-align:center;';
  bounds.textContent = `(${String(rect.minX)}, ${String(rect.minZ)}) \u2192 (${String(rect.maxX)}, ${String(rect.maxZ)})`;

  const clearBtn: HTMLButtonElement = document.createElement('button');
  clearBtn.className = 'btn btn-danger';
  clearBtn.textContent = 'Clear Selection';
  clearBtn.title = 'Clear all tiles in selection on current layer (Delete key)';
  clearBtn.style.marginTop = '8px';
  clearBtn.style.width = '100%';
  clearBtn.id = 'ti-clear-selection-btn';

  summaryEl.append(icon, title, bounds, clearBtn);
}

/**
 * Updates all tile inspector controls for the tile at the given grid
 * position. Called on canvas click and when the layer dropdown changes.
 *
 * @param tilemap - The rendered tilemap.
 * @param gridX - Grid X coordinate.
 * @param gridZ - Grid Z coordinate.
 */
function refreshInspector(tilemap: RenderedTilemap, gridX: Num, gridZ: Num): void {
  // Show controls, hide empty state and selection summary
  const emptyEl: HTMLElement | null = document.querySelector('#ti-empty-state');
  const ctrlsEl: HTMLElement | null = document.querySelector('#ti-controls');
  const summaryEl: HTMLElement | null = document.querySelector('#ti-selection-summary');
  if (emptyEl) emptyEl.style.display = 'none';
  if (ctrlsEl) ctrlsEl.style.display = '';
  if (summaryEl) summaryEl.style.display = 'none';

  const mapW: Num = tilemap.mapData.width;
  const tileIndex: Num = gridZ * mapW + gridX;
  const globalTileId: Num = lookupTileAtIndex(tilemap, tileIndex);

  // Resolve to tileset + local index
  const resolved = resolveGlobalTileId({
    globalId: globalTileId,
    tilesets: tilemap.tilesets,
  });

  let localId: Num = 0;
  let tilesetName = '(none)';

  if (resolved.ok && resolved.data !== null) {
    localId = resolved.data.localIndex;
    tilesetName = resolved.data.tileset.config.name;
    _selectedTileset = resolved.data.tileset;
    _selectedLocalIndex = localId;
  } else {
    _selectedTileset = null;
    _selectedLocalIndex = 0;
  }

  // Get tile properties
  const propsResult = getTileProperties({
    tilesets: tilemap.tilesets,
    globalTileId,
  });

  // Determine which layer was inspected
  const inspectedLayerIdx: Num =
    _inspectLayerIndex >= 0 ? _inspectLayerIndex : findTopmostLayerAt(tilemap, gridX, gridZ);
  const layerLabel: string =
    tilemap.mapData.layers[inspectedLayerIdx]?.name ?? `#${String(inspectedLayerIdx)}`;

  // Update identity fields (read-only)
  setInfoValue('ti-global-id', String(globalTileId));
  setInfoValue('ti-local-id', String(localId));
  setInfoValue('ti-tileset', tilesetName);
  setInfoValue('ti-grid-pos', `${String(gridX)}, ${String(gridZ)}`);
  setInfoValue('ti-layer', layerLabel);

  // Draw tile preview + update label
  const previewCanvas: HTMLCanvasElement | null =
    document.querySelector<HTMLCanvasElement>('#ti-preview');
  if (previewCanvas) {
    drawTilePreview(previewCanvas, resolved.ok ? resolved.data : null);
  }
  const previewLabel: HTMLElement | null = document.querySelector('#ti-preview-label');
  if (previewLabel) {
    previewLabel.textContent = `${layerLabel} · ${tilesetName} #${String(localId)} · tile (${String(gridX)}, ${String(gridZ)})`;
  }

  // Update editable controls with tile properties
  if (propsResult.ok && _tiControls) {
    const props: TileProperties = propsResult.data;
    const c: TileInspectorControls = _tiControls;

    // Passability direction toggles
    setToggleState(c.passDown, props.passability[0]);
    setToggleState(c.passLeft, props.passability[1]);
    setToggleState(c.passRight, props.passability[2]);
    setToggleState(c.passUp, props.passability[3]);

    setToggleState(c.passAbove, props.passAbove);
    setToggleState(c.passBelow, props.passBelow);
    setToggleState(c.passEvent, props.passEvent);
    setToggleState(c.starPassage, props.starPassage);
    setSliderValue(c.passVehicle, c.passVehicleVal, props.passVehicle, 1);
    setSliderValue(c.passHeight, c.passHeightVal, props.passHeight, 1);

    // Terrain
    setSliderValue(c.terrainTag, c.terrainTagVal, props.terrainTag, 1);
    c.terrainType.value = props.terrainType;
    setInfoValue('ti-footstep', props.footstepSound || '(none)');
    setSliderValue(c.encounterRate, c.encounterRateVal, props.encounterRate, 0.1);
    setSliderValue(c.slipperiness, c.slipperinessVal, props.slipperiness, 0.01);
    setSliderValue(c.movementSpeed, c.movementSpeedVal, props.movementSpeed, 0.1);
    setSliderValue(c.regionId, c.regionIdVal, props.regionId, 1);

    // Flags
    setSliderValue(c.height, c.heightVal, props.height, 1);
    setToggleState(c.damageFloor, props.damageFloor);
    setToggleState(c.bush, props.bush);
    setToggleState(c.counter, props.counter);
    setToggleState(c.ladder, props.ladder);

    // Tile flags
    setToggleState(c.slip, props.slip);
    setToggleState(c.shelter, props.shelter);
    setSliderValue(c.bushDepth, c.bushDepthVal, props.bushDepth, 1);
    setSliderValue(c.coverHeight, c.coverHeightVal, props.coverHeight, 0.01);
    setToggleState(c.soundAbsorb, props.soundAbsorb);
    setSliderValue(c.damageAmount, c.damageAmountVal, props.damageAmount, 1);
    setSliderValue(c.damagePercent, c.damagePercentVal, props.damagePercent, 0.1);
    c.damageElement.value = props.damageElement;
    setSliderValue(c.damageInterval, c.damageIntervalVal, props.damageInterval, 1);
    setToggleState(c.reflection, props.reflection);
    setSliderValue(c.reflectionOpacity, c.reflectionOpacityVal, props.reflectionOpacity, 0.01);
    setToggleState(c.glow, props.glow);
    c.glowColor.value = props.glowColor;
    setSliderValue(c.glowIntensity, c.glowIntensityVal, props.glowIntensity, 0.01);

    // Collision/Custom/Animation info
    const shapeCount: number = props.collisionShapes.length;
    setInfoValue('ti-collision-count', shapeCount > 0 ? `${String(shapeCount)} shapes` : 'None');
    const propCount: number = Object.keys(props.properties).length;
    setInfoValue('ti-properties', propCount > 0 ? `${String(propCount)} props` : 'None');
    setInfoValue('ti-class', props['class'] || '(none)');
    setInfoValue('ti-tags', props.tags.length > 0 ? props.tags.join(', ') : '(none)');
    setInfoValue('ti-script-hook', props.scriptHook || '(none)');
    setInfoValue('ti-anim-frames', `${String(props.frames.length)} frames`);
    setInfoValue('ti-anim-mode', props.playbackMode);
    setInfoValue('ti-anim-sync', String(props.globalSync));
    setInfoValue('ti-anim-speed', String(props.speedMultiplier));
    setInfoValue('ti-anim-pause', String(props.pauseWhenOffscreen));
  }

  // Auto-expand the tile inspector section if collapsed
  const section: HTMLElement | null = document.querySelector('#section-tileinspector');
  if (section?.classList.contains('collapsed')) {
    section.classList.remove('collapsed');
  }
}

/**
 * Sets the text content of an info-value element by ID.
 *
 * @param id - Element ID.
 * @param value - Text to display.
 */
function setInfoValue(id: string, value: string): void {
  const el: HTMLElement | null = document.querySelector(`#${id}`);
  if (el) el.textContent = value;
}

// =============================================================================
// Layer UI Builder
// =============================================================================

/**
 * Populates the layer controls section with one row per tilemap layer.
 *
 * @param debug - Debug API reference.
 */
function buildLayerUI(debug: DevDebugApi): void {
  const container = document.querySelector('#layers-body');
  if (!container || !debug.tilemap) return;

  const { tilemap } = debug;
  const { layers } = tilemap.mapData;
  container.innerHTML = '';

  const onReorder = (fromIdx: number, toIdx: number): void => {
    if (toIdx < 0 || toIdx >= layers.length) return;

    // Create a mutable copy of map data with swapped layers
    const mutableLayers = [...layers];
    const temp = mutableLayers[fromIdx];
    if (!temp || !mutableLayers[toIdx]) return;
    mutableLayers[fromIdx] = mutableLayers[toIdx];
    mutableLayers[toIdx] = temp;
    const newMapData = { ...tilemap.mapData, layers: mutableLayers };

    // Dispose current tilemap and re-render with new order
    const { scene } = tilemap;
    disposeTilemap({ tilemap });
    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: newMapData,
      assetBasePath: '/',
    });
    if (result.ok) {
      debug.tilemap = result.data;
      buildLayerUI(debug);
      void applyMegaAtlas({ tilemap: result.data }).then((megaResult) => {
        if (megaResult.ok) debug.tilemap = megaResult.data;
      });
    }
  };

  // -- Dim Other Layers toggle --
  const dimToggleRow: HTMLElement = createToggleRow(
    'Dim Other Layers',
    _dimOtherLayers,
    (on: boolean) => {
      _dimOtherLayers = on;
      applyDimLayers(debug.tilemap);
    },
    'layers-dim-others',
    'Fade all non-selected layers to 25% opacity for easier editing.',
  );
  (container as HTMLElement).append(dimToggleRow);

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (!layer) continue;

    buildLayerRow(tilemap, layer, i, container as HTMLElement, layers.length, onReorder, debug);
  }

  // -- Clear All Layers button --
  const clearAllBtn: HTMLButtonElement = document.createElement('button');
  clearAllBtn.className = 'btn btn-danger';
  clearAllBtn.textContent = 'Clear All Layers';
  clearAllBtn.title = 'Clear all tiles on every layer';
  clearAllBtn.style.width = '100%';
  clearAllBtn.style.marginTop = '6px';
  clearAllBtn.addEventListener('click', () => {
    // oxlint-disable-next-line no-alert
    if (!window.confirm('Clear ALL tiles on ALL layers? This cannot be undone.')) return;
    clearAllLayers(debug);
  });
  (container as HTMLElement).append(clearAllBtn);
}

// =============================================================================
// Lights UI Builder
// =============================================================================

/**
 * Populates the lights info section.
 *
 * @param debug - Debug API reference.
 */
function buildLightsUI(debug: DevDebugApi): void {
  const container = document.querySelector('#lights-body');
  if (!container || !debug.tilemap?.lighting) return;

  const { lights } = debug.tilemap.lighting;
  container.innerHTML = '';

  for (const ml of lights) {
    const lightDisplayName = ml.config.id
      .replaceAll('_', ' ')
      .replaceAll('-', ' ')
      .split(' ')
      .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');

    const typeColors: Record<string, string> = {
      hemispheric: '#6ab',
      directional: '#5b9',
      point: '#b96',
      spot: '#8bb',
    };
    const typeColor = typeColors[ml.config.type] ?? '#888';
    const lightGroup = createCollapsibleGroup(`${lightDisplayName} (${ml.config.type})`, true);
    // Style the label with type color
    const groupLabel = lightGroup.root.querySelector('.cg-header > span:first-child');
    if (groupLabel instanceof HTMLElement) {
      groupLabel.style.color = typeColor;
    }
    const row = lightGroup.body;

    const lightId = ml.config.id;

    // Enabled toggle
    row.append(
      createToggleRow(
        'Enabled',
        ml.light.isEnabled(),
        (on) => {
          ml.light.setEnabled(on);
        },
        `light-${lightId}-enabled`,
        'Turn this light source on or off.',
      ),
    );

    // Intensity slider
    row.append(
      createSliderRow(
        'Intensity',
        0,
        5,
        0.05,
        ml.light.intensity,
        (v) => {
          ml.light.intensity = v;
        },
        `light-${lightId}-intensity`,
        'Brightness of this light source.',
      ),
    );

    // Color temperature slider (if light has diffuse color)
    if ('diffuse' in ml.light) {
      const diffuse = ml.light.diffuse as BABYLON.Color3;
      row.append(
        createSliderRow(
          'Color R',
          0,
          1,
          0.01,
          diffuse.r,
          (v) => {
            diffuse.r = v;
          },
          `light-${lightId}-diffuse-r`,
          'Red channel of this light\u2019s diffuse color.',
        ),
      );
      row.append(
        createSliderRow(
          'Color G',
          0,
          1,
          0.01,
          diffuse.g,
          (v) => {
            diffuse.g = v;
          },
          `light-${lightId}-diffuse-g`,
          'Green channel of this light\u2019s diffuse color.',
        ),
      );
      row.append(
        createSliderRow(
          'Color B',
          0,
          1,
          0.01,
          diffuse.b,
          (v) => {
            diffuse.b = v;
          },
          `light-${lightId}-diffuse-b`,
          'Blue channel of this light\u2019s diffuse color.',
        ),
      );
    }

    // Range slider (point/spot lights)
    if ('range' in ml.light && typeof ml.light.range === 'number') {
      const currentRange = Math.min(ml.light.range, 200);
      row.append(
        createSliderRow(
          'Range',
          0,
          200,
          1,
          currentRange,
          (v) => {
            (ml.light as BABYLON.PointLight).range = v;
          },
          `light-${lightId}-range`,
          'Maximum illumination distance (world units). 0 = infinite.',
        ),
      );
    }

    // ── Per-Light Properties sub-group ──
    if (ml.config.type !== 'hemispheric') {
      const propsGroup = createCollapsibleGroup('Light Properties', true);

      // Radius (point/spot only)
      if (ml.config.type === 'point' || ml.config.type === 'spot') {
        const pointLight = ml.light as BABYLON.PointLight;
        propsGroup.body.append(
          createSliderRow(
            'Radius',
            0,
            10,
            0.1,
            pointLight.radius ?? 0,
            (v) => {
              pointLight.radius = v;
            },
            `light-${lightId}-radius`,
            'Light source radius for soft shadow penumbra.',
          ),
        );
      }

      // Render Priority
      propsGroup.body.append(
        createSliderRow(
          'Render Priority',
          0,
          10,
          1,
          ml.light.renderPriority,
          (v) => {
            ml.light.renderPriority = v;
          },
          `light-${lightId}-render-priority`,
          'Order in which this light is processed during rendering.',
        ),
      );

      // Inner Angle (spot only)
      if (ml.config.type === 'spot') {
        propsGroup.body.append(
          createSliderRow(
            'Inner Angle',
            0,
            Math.PI,
            0.01,
            (ml.light as BABYLON.SpotLight).innerAngle,
            (v) => {
              (ml.light as BABYLON.SpotLight).innerAngle = v;
            },
            `light-${lightId}-inner-angle`,
            'Inner cone angle in radians where light is at full intensity.',
          ),
        );
      }

      // Shadow Frustum Size (directional only)
      if (ml.config.type === 'directional') {
        propsGroup.body.append(
          createSliderRow(
            'Shadow Frustum Size',
            0,
            100,
            1,
            (ml.light as BABYLON.DirectionalLight).shadowFrustumSize,
            (v) => {
              (ml.light as BABYLON.DirectionalLight).shadowFrustumSize = v;
            },
            `light-${lightId}-shadow-frustum-size`,
            'Fixed frustum size for shadow map. 0 = auto-compute.',
          ),
        );

        propsGroup.body.append(
          createSliderRow(
            'Shadow Ortho Scale',
            0,
            2,
            0.01,
            (ml.light as BABYLON.DirectionalLight).shadowOrthoScale,
            (v) => {
              (ml.light as BABYLON.DirectionalLight).shadowOrthoScale = v;
            },
            `light-${lightId}-shadow-ortho-scale`,
            'Scale factor for orthographic shadow projection.',
          ),
        );

        propsGroup.body.append(
          createToggleRow(
            'Auto Update Extends',
            (ml.light as BABYLON.DirectionalLight).autoUpdateExtends,
            (on) => {
              (ml.light as BABYLON.DirectionalLight).autoUpdateExtends = on;
            },
            `light-${lightId}-auto-update-extends`,
            'Automatically recompute shadow bounds each frame.',
          ),
        );
      }

      // Shadow Min Z (directional/point/spot)
      const shadowLight = ml.light as BABYLON.ShadowLight;
      propsGroup.body.append(
        createSliderRow(
          'Shadow Min Z',
          0,
          100,
          0.1,
          shadowLight.shadowMinZ ?? 0,
          (v) => {
            shadowLight.shadowMinZ = v;
          },
          `light-${lightId}-shadow-min-z`,
          'Near clipping plane for shadow generation.',
        ),
      );

      // Shadow Max Z (directional/point/spot — on the light itself)
      propsGroup.body.append(
        createSliderRow(
          'Shadow Max Z',
          0,
          500,
          1,
          shadowLight.shadowMaxZ ?? 200,
          (v) => {
            shadowLight.shadowMaxZ = v;
          },
          `light-${lightId}-light-shadow-max-z`,
          'Far clipping plane for shadow generation.',
        ),
      );

      // Lightmap Mode
      const lightmapModeMap: Record<number, string> = {
        0: 'default',
        1: 'specular',
        2: 'shadowsOnly',
      };
      const lightmapModeReverseMap: Record<string, number> = {
        default: 0,
        specular: 1,
        shadowsOnly: 2,
      };
      propsGroup.body.append(
        createDropdown(
          'Lightmap Mode',
          ['default', 'specular', 'shadowsOnly'],
          lightmapModeMap[ml.light.lightmapMode] ?? 'default',
          (v) => {
            ml.light.lightmapMode = lightmapModeReverseMap[v] ?? 0;
          },
          `light-${lightId}-lightmap-mode`,
          'How this light interacts with lightmaps.',
        ),
      );

      row.append(propsGroup.root);
    }

    // Shadow darkness slider
    if (ml.shadowGenerator && 'darkness' in ml.shadowGenerator) {
      const sg = ml.shadowGenerator;
      row.append(
        createSliderRow(
          'Shadow Darkness',
          0,
          1,
          0.05,
          sg.darkness,
          (v) => {
            sg.darkness = v;
          },
          `light-${lightId}-shadow-dark`,
          'Shadow intensity. 0 = no shadow, 1 = fully dark.',
        ),
      );
    }

    // ── Shadow Details sub-group ──
    if (ml.shadowGenerator) {
      const sg = ml.shadowGenerator as BABYLON.ShadowGenerator;
      const sgRecord = sg as unknown as Record<string, unknown>;
      const isCascaded = 'numCascades' in sg;
      const shadowGroup = createCollapsibleGroup('Shadow Details', true);

      // Filter Type dropdown — cascaded generators only support PCF/PCSS/none
      const cfgRecord = ml.config as unknown as Record<string, Record<string, unknown>>;
      const currentFilter = (cfgRecord['shadow']?.['filterType'] as string) ?? 'none';
      const filterOptions: readonly string[] = isCascaded
        ? ['none', 'pcf', 'pcss']
        : ['none', 'esm', 'blurredEsm', 'closeEsm', 'blurredCloseEsm', 'pcf', 'pcss', 'poisson'];
      shadowGroup.body.append(
        createDropdown(
          'Filter Type',
          filterOptions,
          currentFilter,
          (v) => {
            // Reset supported filter flags
            sg.usePercentageCloserFiltering = false;
            sg.useContactHardeningShadowMap = false;
            if (!isCascaded) {
              sg.useExponentialShadowMap = false;
              sg.useBlurExponentialShadowMap = false;
              sg.useCloseExponentialShadowMap = false;
              sg.useBlurCloseExponentialShadowMap = false;
              sg.usePoissonSampling = false;
            }
            switch (v) {
              case 'esm': {
                sg.useExponentialShadowMap = true;
                break;
              }
              case 'blurredEsm': {
                sg.useBlurExponentialShadowMap = true;
                break;
              }
              case 'closeEsm': {
                sg.useCloseExponentialShadowMap = true;
                break;
              }
              case 'blurredCloseEsm': {
                sg.useBlurCloseExponentialShadowMap = true;
                break;
              }
              case 'pcf': {
                sg.usePercentageCloserFiltering = true;
                break;
              }
              case 'pcss': {
                sg.useContactHardeningShadowMap = true;
                break;
              }
              case 'poisson': {
                sg.usePoissonSampling = true;
                break;
              }
            }
          },
          `light-${lightId}-shadow-filter`,
          'Shadow filtering algorithm. PCF/PCSS give softer shadows.',
        ),
      );

      // Force Back Faces toggle
      shadowGroup.body.append(
        createToggleRow(
          'Force Back Faces',
          sg.forceBackFacesOnly ?? false,
          (on) => {
            sg.forceBackFacesOnly = on;
          },
          `light-${lightId}-shadow-backfaces`,
          'Only render back faces into the shadow map to reduce self-shadowing artifacts.',
        ),
      );

      // Frustum Edge Falloff slider
      shadowGroup.body.append(
        createSliderRow(
          'Frustum Edge Falloff',
          0,
          1,
          0.01,
          sg.frustumEdgeFalloff ?? 0,
          (v) => {
            sg.frustumEdgeFalloff = v;
          },
          `light-${lightId}-shadow-frustum-falloff`,
          'Fade shadow at frustum edges to avoid hard cutoffs.',
        ),
      );

      // Contact Hardening Size slider
      shadowGroup.body.append(
        createSliderRow(
          'Contact Hardening Size',
          0,
          1,
          0.01,
          sg.contactHardeningLightSizeUVRatio ?? 0.1,
          (v) => {
            sg.contactHardeningLightSizeUVRatio = v;
          },
          `light-${lightId}-shadow-ch-size`,
          'Light size ratio for PCSS contact hardening. Larger = softer penumbra.',
        ),
      );

      // Use Kernel Blur toggle
      shadowGroup.body.append(
        createToggleRow(
          'Use Kernel Blur',
          sg.useKernelBlur ?? false,
          (on) => {
            sg.useKernelBlur = on;
          },
          `light-${lightId}-shadow-kernelblur`,
          'Enable kernel-based blur for shadow map smoothing.',
        ),
      );

      // Blur Kernel slider
      shadowGroup.body.append(
        createSliderRow(
          'Blur Kernel',
          1,
          64,
          1,
          sg.blurKernel ?? 1,
          (v) => {
            sg.blurKernel = v;
          },
          `light-${lightId}-shadow-blurkernel`,
          'Shadow blur kernel size. Larger = softer but more expensive.',
        ),
      );

      // Blur Scale slider
      shadowGroup.body.append(
        createSliderRow(
          'Blur Scale',
          0.5,
          4,
          0.1,
          sg.blurScale ?? 2,
          (v) => {
            sg.blurScale = v;
          },
          `light-${lightId}-shadow-blurscale`,
          'Scale factor for the shadow blur pass.',
        ),
      );

      // Depth Scale slider
      shadowGroup.body.append(
        createSliderRow(
          'Depth Scale',
          0,
          1000,
          1,
          sg.depthScale ?? 50,
          (v) => {
            sg.depthScale = v;
          },
          `light-${lightId}-shadow-depthscale`,
          'Depth scale for ESM shadow maps. Higher reduces light bleed.',
        ),
      );

      // Opacity Tex Shadows toggle
      shadowGroup.body.append(
        createToggleRow(
          'Opacity Tex Shadows',
          sg.useOpacityTextureForTransparentShadow ?? false,
          (on) => {
            sg.useOpacityTextureForTransparentShadow = on;
          },
          `light-${lightId}-shadow-opacity-tex`,
          'Use opacity textures to cast transparent shadows.',
        ),
      );

      // Cascaded-only properties
      if ('penumbraDarkness' in sg) {
        shadowGroup.body.append(
          createSliderRow(
            'Penumbra Darkness',
            0,
            1,
            0.01,
            (sgRecord['penumbraDarkness'] as number) ?? 1,
            (v) => {
              sgRecord['penumbraDarkness'] = v;
            },
            `light-${lightId}-shadow-penumbra`,
            'Darkness of the shadow penumbra region (cascaded only).',
          ),
        );
      }

      if ('lambda' in sg) {
        shadowGroup.body.append(
          createSliderRow(
            'Lambda',
            0,
            1,
            0.01,
            (sgRecord['lambda'] as number) ?? 0.5,
            (v) => {
              sgRecord['lambda'] = v;
            },
            `light-${lightId}-shadow-lambda`,
            'Blend between logarithmic and uniform cascade splits (cascaded only).',
          ),
        );
      }

      if ('depthClamp' in sg) {
        shadowGroup.body.append(
          createToggleRow(
            'Depth Clamp',
            (sgRecord['depthClamp'] as boolean) ?? true,
            (on) => {
              sgRecord['depthClamp'] = on;
            },
            `light-${lightId}-shadow-depthclamp`,
            'Clamp shadow depth to reduce artifacts (cascaded only).',
          ),
        );
      }

      if ('shadowMaxZ' in sg) {
        shadowGroup.body.append(
          createSliderRow(
            'Shadow Max Z',
            0,
            500,
            1,
            (sgRecord['shadowMaxZ'] as number) ?? 200,
            (v) => {
              sgRecord['shadowMaxZ'] = v;
            },
            `light-${lightId}-shadow-maxz`,
            'Maximum depth for cascaded shadow generation.',
          ),
        );
      }

      // Freeze Casters toggle
      shadowGroup.body.append(
        createToggleRow(
          'Freeze Casters',
          sg.freezeShadowCastersBoundingInfo ?? false,
          (on) => {
            sg.freezeShadowCastersBoundingInfo = on;
          },
          `light-${lightId}-shadow-freeze`,
          'Freeze shadow caster bounding info for performance.',
        ),
      );

      row.append(shadowGroup.root);
    }

    // Flicker controls — mutate config properties directly
    if (ml.flickerInstance) {
      const flickerCfg = ml.flickerInstance.config as Record<string, unknown>;
      row.append(
        createSliderRow(
          'Flicker Intensity',
          0,
          1,
          0.05,
          (flickerCfg['intensity'] as number) ?? 0.3,
          (v) => {
            flickerCfg['intensity'] = v;
          },
          `light-${lightId}-flicker-int`,
          'How much the light flickers. 0 = steady, 1 = extreme.',
        ),
      );
      row.append(
        createSliderRow(
          'Flicker Speed',
          0.1,
          10,
          0.1,
          (flickerCfg['speed'] as number) ?? 1.0,
          (v) => {
            flickerCfg['speed'] = v;
          },
          `light-${lightId}-flicker-spd`,
          'Flicker animation speed. Higher = faster pulsing.',
        ),
      );

      // Flicker Type dropdown
      const flickerTypes = [
        'candle',
        'torch',
        'campfire',
        'pulse',
        'strobe',
        'breathing',
        'fluorescent',
        'storm',
        'heartbeat',
        'random',
        'neon',
        'dying',
        'siren',
      ];
      const flickerConfigRecord = ml.config as unknown as Record<
        string,
        Record<string, unknown> | undefined
      >;
      const currentFlickerType = (flickerConfigRecord['flicker']?.['type'] as string) ?? 'candle';
      row.append(
        createDropdown(
          'Flicker Type',
          flickerTypes,
          currentFlickerType,
          (v) => {
            flickerCfg['type'] = v;
          },
          `light-${lightId}-flicker-type`,
          'Flicker animation pattern preset.',
        ),
      );
    }

    // God rays controls
    if (ml.volumetricPostProcess) {
      const vl = ml.volumetricPostProcess;
      row.append(
        createSliderRow(
          'God Ray Decay',
          0,
          1,
          0.01,
          vl.decay,
          (v) => {
            vl.decay = v;
          },
          `light-${lightId}-gr-decay`,
          'Light falloff per sample step. Lower = rays travel farther.',
        ),
      );
      row.append(
        createSliderRow(
          'God Ray Weight',
          0,
          1,
          0.01,
          vl.weight,
          (v) => {
            vl.weight = v;
          },
          `light-${lightId}-gr-weight`,
          'Brightness contribution of the volumetric rays.',
        ),
      );
      row.append(
        createSliderRow(
          'God Ray Density',
          0,
          1,
          0.01,
          vl.density,
          (v) => {
            vl.density = v;
          },
          `light-${lightId}-gr-density`,
          'Number of samples per ray. Higher = smoother but heavier.',
        ),
      );

      // God Ray Exposure slider
      row.append(
        createSliderRow(
          'God Ray Exposure',
          0,
          2,
          0.01,
          vl.exposure,
          (v) => {
            vl.exposure = v;
          },
          `light-${lightId}-gr-exposure`,
          'Exposure multiplier for volumetric light scattering.',
        ),
      );

      // God Ray Color R/G/B
      const grMesh = vl.mesh;
      const grMatRecord = grMesh?.material as unknown as Record<string, unknown> | undefined;
      const grCol = grMatRecord?.['diffuseColor'] as BABYLON.Color3 | undefined;
      if (grCol) {
        row.append(
          createSliderRow(
            'God Ray Color R',
            0,
            1,
            0.01,
            grCol.r,
            (v) => {
              grCol.r = v;
            },
            `light-${lightId}-gr-color-r`,
            'Red channel of the god ray mesh color.',
          ),
        );
        row.append(
          createSliderRow(
            'God Ray Color G',
            0,
            1,
            0.01,
            grCol.g,
            (v) => {
              grCol.g = v;
            },
            `light-${lightId}-gr-color-g`,
            'Green channel of the god ray mesh color.',
          ),
        );
        row.append(
          createSliderRow(
            'God Ray Color B',
            0,
            1,
            0.01,
            grCol.b,
            (v) => {
              grCol.b = v;
            },
            `light-${lightId}-gr-color-b`,
            'Blue channel of the god ray mesh color.',
          ),
        );
      }
    }

    // ── Lens Flare sub-group ──
    if (ml.lensFlareSystem) {
      const flareGroup = createCollapsibleGroup('Lens Flares', true);
      const flareCfgRecord = ml.config as unknown as Record<
        string,
        Record<string, unknown> | undefined
      >;
      const flareCfg = flareCfgRecord['lensFlare'];

      // Lens Flare Preset (read-only — set at creation time)
      flareGroup.body.append(
        createDropdown(
          'Preset',
          ['(custom)', 'sun', 'moonGlow', 'crystalLight', 'torchGlow'],
          (flareCfg?.['preset'] as string) ?? '(custom)',
          () => {
            // Read-only: preset is a creation-time property
          },
          `light-${lightId}-flare-preset`,
          'Lens flare preset (read-only, set at creation time).',
        ),
      );

      // Halo Width (read-only config value)
      flareGroup.body.append(
        createSliderRow(
          'Halo Width',
          0,
          2,
          0.01,
          (flareCfg?.['haloWidth'] as number) ?? 0.4,
          () => {
            // Read-only: halo width is a creation-time property
          },
          `light-${lightId}-flare-halo`,
          'Width of the halo ring effect (read-only, set at creation time).',
        ),
      );

      // Ghost Dispersal (read-only config value)
      flareGroup.body.append(
        createSliderRow(
          'Ghost Dispersal',
          0,
          2,
          0.01,
          (flareCfg?.['ghostDispersal'] as number) ?? 0.3,
          () => {
            // Read-only: ghost dispersal is a creation-time property
          },
          `light-${lightId}-flare-ghost`,
          'Spacing between ghost flare elements (read-only, set at creation time).',
        ),
      );

      // Threshold (read-only config value)
      flareGroup.body.append(
        createSliderRow(
          'Threshold',
          0,
          1,
          0.01,
          (flareCfg?.['threshold'] as number) ?? 0.5,
          () => {
            // Read-only: threshold is a creation-time property
          },
          `light-${lightId}-flare-threshold`,
          'Brightness threshold for flare visibility (read-only, set at creation time).',
        ),
      );

      row.append(flareGroup.root);
    }

    // ── Distance Fade sub-group (point/spot only) ──
    const fadeCfgRecord = ml.config as unknown as Record<
      string,
      Record<string, unknown> | undefined
    >;
    if (
      (ml.config.type === 'point' || ml.config.type === 'spot') &&
      fadeCfgRecord['distanceFade']
    ) {
      const fadeGroup = createCollapsibleGroup('Distance Fade', true);
      const fadeCfg = fadeCfgRecord['distanceFade'];

      // Distance Fade Enabled (read-only — requires observer re-creation)
      fadeGroup.body.append(
        createToggleRow(
          'Enabled',
          ml.distanceFadeObserver !== null,
          () => {
            // Read-only: toggling distance fade requires re-creation of observer
          },
          `light-${lightId}-dist-fade-enabled`,
          'Whether distance-based intensity fade is active (read-only).',
        ),
      );

      // Fade Start (read-only config value)
      fadeGroup.body.append(
        createSliderRow(
          'Fade Start',
          0,
          200,
          1,
          (fadeCfg?.['start'] as number) ?? 50,
          () => {
            // Read-only: changing fade range requires observer re-creation
          },
          `light-${lightId}-dist-fade-start`,
          'Distance at which fade begins (read-only, set at creation time).',
        ),
      );

      // Fade End (read-only config value)
      fadeGroup.body.append(
        createSliderRow(
          'Fade End',
          0,
          500,
          1,
          (fadeCfg?.['end'] as number) ?? 100,
          () => {
            // Read-only: changing fade range requires observer re-creation
          },
          `light-${lightId}-dist-fade-end`,
          'Distance at which light fully fades out (read-only, set at creation time).',
        ),
      );

      row.append(fadeGroup.root);
    }

    // Features badges
    const badges = document.createElement('div');
    badges.style.cssText = 'display: flex; gap: 3px; flex-wrap: wrap; padding: 3px 0 1px;';

    if (ml.shadowGenerator) addBadge(badges, 'Shadow', '#8a8');
    if (ml.flickerInstance) addBadge(badges, 'Flicker', '#aa8');
    if (ml.volumetricPostProcess) addBadge(badges, 'God Rays', '#8ab');
    if (ml.lensFlareSystem) addBadge(badges, 'Flares', '#ab8');
    if (ml.distanceFadeObserver) addBadge(badges, 'Dist Fade', '#b8a');

    if (badges.childElementCount > 0) row.append(badges);

    container.append(lightGroup.root);
  }
}

/**
 * Adds a small badge element.
 *
 * @param parent - Parent element.
 * @param text - Badge text.
 * @param color - Badge color.
 */
function addBadge(parent: HTMLElement, text: string, color: string): void {
  const badge = document.createElement('span');
  badge.style.cssText = `font-size: 9px; padding: 1px 5px; border-radius: 3px; background: ${color}22; color: ${color}; border: 1px solid ${color}44;`;
  badge.textContent = text;
  parent.append(badge);
}

// =============================================================================
// Scene Info UI
// =============================================================================

/**
 * Creates a labeled info row for the debug info section.
 *
 * @param label - Display label.
 * @param id - DOM id for the value element.
 * @param tooltip - Optional tooltip description shown on hover.
 * @returns The row element.
 */
function infoRow(label: string, id: string, tooltip?: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'control-row';
  row.dataset['type'] = 'info';
  row.dataset['control'] = id;
  const lbl = document.createElement('span');
  lbl.className = 'control-label';
  lbl.textContent = label;
  const val = document.createElement('span');
  val.className = 'control-value';
  val.id = id;
  val.textContent = '--';
  row.append(wrapWithTooltip(lbl, tooltip), val);
  return row;
}

/**
 * Populates the scene info section.
 *
 * @param debug - Debug API reference.
 * @param scene - Babylon.js scene.
 */
function buildInfoUI(debug: DevDebugApi, scene: BABYLON.Scene): void {
  const container = document.querySelector('#info-body');
  if (!container) return;

  container.innerHTML = '';

  // ── Performance ──
  container.append(createSubHeader('Performance'));
  container.append(
    infoRow('FPS', 'info-fps', 'Frames rendered per second. 60 = smooth, <30 may feel sluggish.'),
  );
  container.append(
    infoRow(
      'Frame Time',
      'info-frametime',
      'Milliseconds per frame. Lower = better. 16.7ms = 60 FPS.',
    ),
  );
  container.append(
    infoRow('Draw Calls', 'info-drawcalls', 'GPU draw calls per frame. Lower = better batching.'),
  );
  container.append(
    infoRow(
      'Active Meshes',
      'info-active-meshes',
      'Meshes visible this frame after frustum culling.',
    ),
  );
  container.append(
    infoRow('Total Triangles', 'info-triangles', 'Total triangle count rendered this frame.'),
  );

  // ── Scene ──
  container.append(createSubHeader('Scene'));
  container.append(
    infoRow('Total Meshes', 'info-total-meshes', 'Total mesh objects in the scene graph.'),
  );
  container.append(
    infoRow('Total Materials', 'info-materials', 'Unique material instances loaded.'),
  );
  container.append(infoRow('Total Textures', 'info-textures', 'Texture objects in GPU memory.'));
  container.append(
    infoRow('Total Lights', 'info-total-lights', 'Active light sources in the scene.'),
  );
  container.append(
    infoRow(
      'Effect Layers',
      'info-effect-layers',
      'Post-process effect layers (glow, highlight, etc.).',
    ),
  );
  container.append(
    infoRow('Particle Systems', 'info-particles', 'Active particle system emitters.'),
  );
  container.append(
    infoRow('Animations', 'info-animations', 'Currently running animation playbacks.'),
  );

  // ── Renderer ──
  container.append(createSubHeader('Renderer'));
  container.append(
    infoRow('Backend', 'info-backend', 'Graphics API: WebGPU (modern) or WebGL2 (fallback).'),
  );
  container.append(infoRow('GPU', 'info-gpu', 'GPU model name reported by the browser.'));
  container.append(infoRow('Resolution', 'info-resolution', 'Canvas render resolution in pixels.'));
  container.append(
    infoRow('Pixel Ratio', 'info-pixel-ratio', 'Display scaling factor. 2 = Retina/HiDPI.'),
  );
  container.append(
    infoRow(
      'Hardware Scale',
      'info-hw-scale',
      'Babylon.js hardware scaling. 1 = native resolution.',
    ),
  );
  container.append(
    infoRow('Antialias', 'info-antialias', 'Whether MSAA anti-aliasing is enabled.'),
  );

  // ── Camera ──
  container.append(createSubHeader('Camera'));
  container.append(
    infoRow('Type', 'info-cam-type', 'Active camera class (ArcRotate, Universal, etc.).'),
  );
  container.append(infoRow('Position', 'info-cam-pos', 'Camera world-space position (X, Y, Z).'));
  container.append(
    infoRow('Target', 'info-cam-target', 'Point the camera is looking at (X, Y, Z).'),
  );
  container.append(infoRow('FOV', 'info-cam-fov', 'Camera field of view in degrees.'));
  container.append(infoRow('Near / Far', 'info-cam-clip', 'Near and far clipping planes.'));

  // ── Tilemap ──
  container.append(createSubHeader('Tilemap'));
  container.append(infoRow('Chunks', 'info-chunks', 'Number of tilemap terrain chunks loaded.'));
  container.append(
    infoRow('Cliff Chunks', 'info-cliff-chunks', 'Number of cliff/height transition chunks.'),
  );
  container.append(
    infoRow('Map Layers', 'info-map-layers', 'Tiled map layers (ground, objects, events, etc.).'),
  );
  container.append(
    infoRow('Map Size', 'info-map-size', 'Map dimensions in tiles (width × height).'),
  );
  container.append(
    infoRow(
      'Tile Renderer',
      'info-tile-renderer',
      'Tile rendering backend (GPU Data Texture or Chunk).',
    ),
  );
  container.append(
    infoRow('GPU Layers', 'info-gpu-layers', 'Number of GPU data-texture tile layers.'),
  );
  container.append(
    infoRow('Data Textures', 'info-data-textures', 'GPU data texture dimensions per layer.'),
  );
  container.append(
    infoRow('VRAM (est)', 'info-vram-est', 'Estimated GPU memory used by tile data textures.'),
  );
  container.append(
    infoRow(
      'Streaming',
      'info-streaming',
      'Streaming status (active/inactive) and loaded regions.',
    ),
  );
  container.append(infoRow('Region Size', 'info-region-size', 'Streaming region size in tiles.'));
  container.append(
    infoRow('VRAM Budget', 'info-vram-budget', 'Estimated VRAM budget for streaming regions.'),
  );

  // ── Objects ──
  container.append(createSubHeader('Objects'));
  container.append(infoRow('Objects', 'info-objects', 'Total / visible object instances.'));
  container.append(
    infoRow('Mesh Types', 'info-mesh-types', 'Unique mesh types in the object renderer.'),
  );
  container.append(
    infoRow('Instance Draws', 'info-instance-draws', 'Draw calls for thin-instance rendering.'),
  );

  // ── Lighting ──
  container.append(createSubHeader('Lighting'));
  container.append(infoRow('Time of Day', 'info-time', 'Current in-game time of day (HH:MM).'));
  container.append(infoRow('Cycle Speed', 'info-cycle-speed', 'Day/night cycle speed multiplier.'));
  container.append(
    infoRow('Lights', 'info-light-breakdown', 'Light count by type (dir, point, spot, hemi).'),
  );
  container.append(infoRow('Shadow Gens', 'info-shadow-gens', 'Active shadow map generators.'));
  container.append(infoRow('Shadow Map', 'info-shadow-map', 'Shadow map texture resolution.'));
  container.append(infoRow('Glow Layer', 'info-glow', 'Whether the glow layer is active.'));
  container.append(
    infoRow('Post-Processing', 'info-postfx', 'Whether the post-processing pipeline is active.'),
  );

  // ── Environment ──
  container.append(createSubHeader('Environment'));
  container.append(infoRow('Sky Type', 'info-sky-type', 'Active sky rendering mode.'));
  container.append(
    infoRow('Sky Texture', 'info-sky-texture', 'Sky texture asset currently loaded.'),
  );
  container.append(
    infoRow('Parallax Layers', 'info-parallax-layers', 'Number of parallax background layers.'),
  );
  container.append(
    infoRow(
      'Parallax Type',
      'info-parallax-types',
      'Breakdown of background vs foreground layers.',
    ),
  );
  container.append(infoRow('Stars', 'info-stars', 'Whether the star field overlay is active.'));

  // ── Memory ──
  container.append(createSubHeader('Memory'));
  container.append(
    infoRow('Geometries', 'info-geometries', 'Total geometry objects (vertex data) in the scene.'),
  );
  container.append(
    infoRow(
      'Buffers (Vertex)',
      'info-vertex-buffers',
      'Total vertex buffer objects in GPU memory.',
    ),
  );
  container.append(
    infoRow(
      'Compile Count',
      'info-compile',
      'Shader compile count since load. High = stutter risk.',
    ),
  );

  // Update function for debug info values
  const engine = scene.getEngine();

  /** Refreshes all debug info fields. */
  function updateDebugInfo(): void {
    const cam = scene.activeCamera;
    const lighting = debug.tilemap?.lighting;

    // Performance
    const fps = engine.getFps();
    setInfoText('info-fps', fps.toFixed(1));
    setInfoText('info-frametime', `${(1000 / Math.max(fps, 1)).toFixed(1)}ms`);
    setInfoText(
      'info-drawcalls',
      String((engine as Record<string, unknown>)['_drawCalls']?.['current'] ?? '?'),
    );
    setInfoText('info-active-meshes', String(scene.getActiveMeshes().length));
    setInfoText('info-triangles', formatLargeNumber(scene.totalVerticesPerfCounter.current / 3));

    // Scene
    setInfoText('info-total-meshes', String(scene.meshes.length));
    setInfoText('info-materials', String(scene.materials.length));
    setInfoText('info-textures', String(scene.textures.length));
    setInfoText('info-total-lights', String(scene.lights.length));
    setInfoText('info-effect-layers', String(scene.effectLayers?.length ?? 0));
    setInfoText('info-particles', String(scene.particleSystems.length));
    setInfoText('info-animations', String(scene.animatables.length));

    // Renderer
    const isWebGPU = engine.constructor.name.includes('WebGPU');
    setInfoText('info-backend', isWebGPU ? 'WebGPU' : 'WebGL2');
    const glInfo = (engine as Record<string, unknown>)['_glRenderer'] ?? '';
    setInfoText('info-gpu', truncateText(String(glInfo), 24));
    setInfoText(
      'info-resolution',
      `${String(engine.getRenderWidth())}×${String(engine.getRenderHeight())}`,
    );
    setInfoText('info-pixel-ratio', String(window.devicePixelRatio.toFixed(2)));
    setInfoText('info-hw-scale', engine.getHardwareScalingLevel().toFixed(2));
    setInfoText(
      'info-antialias',
      (engine as Record<string, unknown>)['_antialiasing'] ? 'On' : 'Off',
    );

    // Camera
    if (cam) {
      setInfoText('info-cam-type', cam.getClassName());
      const p = cam.position;
      setInfoText('info-cam-pos', `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`);
      if ('target' in cam && cam.target instanceof BABYLON.Vector3) {
        const t = cam.target;
        setInfoText('info-cam-target', `${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)}`);
      }
      setInfoText('info-cam-fov', `${(cam.fov * (180 / Math.PI)).toFixed(0)}°`);
      setInfoText('info-cam-clip', `${cam.minZ.toFixed(1)} / ${cam.maxZ.toFixed(0)}`);
    }

    // Tilemap
    const tm = debug.tilemap;
    if (tm) {
      setInfoText('info-chunks', String(tm.chunks.length));
      setInfoText('info-cliff-chunks', String(tm.cliffChunks.length));
      setInfoText('info-map-layers', String(tm.mapData.layers.length));
      setInfoText('info-map-size', `${String(tm.mapData.width)}×${String(tm.mapData.height)}`);
      // GPU tile renderer info
      const gpuCount = tm.gpuLayers.length;
      setInfoText('info-tile-renderer', gpuCount > 0 ? 'GPU Data Texture' : 'Chunk');
      setInfoText('info-gpu-layers', String(gpuCount));
      if (gpuCount > 0) {
        const firstGpu = tm.gpuLayers[0];
        setInfoText(
          'info-data-textures',
          `${String(gpuCount)} × ${String(firstGpu?.mapWidth ?? 0)}×${String(firstGpu?.mapHeight ?? 0)}`,
        );
        // VRAM: each layer = mapWidth * mapHeight * 4 channels * 4 bytes (uint32)
        const bytesPerLayer = (firstGpu?.mapWidth ?? 0) * (firstGpu?.mapHeight ?? 0) * 16;
        const totalBytes = bytesPerLayer * gpuCount;
        const mb = totalBytes / (1024 * 1024);
        setInfoText(
          'info-vram-est',
          mb < 1 ? `${(mb * 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`,
        );
      } else {
        setInfoText('info-data-textures', 'N/A');
        setInfoText('info-vram-est', 'N/A');
      }
      // Streaming info
      if (tm.streamingManager) {
        const sm = tm.streamingManager;
        const totalRegionsX = Math.ceil(sm.mapWidth / sm.config.regionSize);
        const totalRegionsZ = Math.ceil(sm.mapHeight / sm.config.regionSize);
        const totalRegions = totalRegionsX * totalRegionsZ;
        setInfoText('info-tile-renderer', 'Streaming');
        setInfoText(
          'info-streaming',
          `Active — ${String(sm.regions.length)} / ${String(totalRegions)} regions`,
        );
        setInfoText('info-region-size', `${String(sm.config.regionSize)} tiles`);
        // VRAM budget: regionSize² × 16 bytes (RGBA32F) × maxLoadedRegions × layers
        const regionBytes = sm.config.regionSize * sm.config.regionSize * 16;
        const budgetBytes = regionBytes * sm.config.maxLoadedRegions * (tm.gpuLayers.length || 1);
        const budgetMB = (budgetBytes / (1024 * 1024)).toFixed(1);
        setInfoText('info-vram-budget', `~${budgetMB} MB`);
      } else {
        setInfoText('info-streaming', 'Inactive');
        setInfoText('info-region-size', 'N/A');
        setInfoText('info-vram-budget', 'N/A');
      }
      // Object renderer info
      if (tm.objectRenderer) {
        const total = tm.objectRenderer.instanceData.size;
        const meshTypes = tm.objectRenderer.baseMeshes.size;
        let visibleCount = 0;
        for (const mesh of tm.objectRenderer.baseMeshes.values()) {
          visibleCount += mesh.thinInstanceCount > 0 ? mesh.thinInstanceCount : 0;
        }
        setInfoText('info-objects', `${String(total)} total / ${String(visibleCount)} visible`);
        setInfoText('info-mesh-types', String(meshTypes));
        setInfoText('info-instance-draws', String(meshTypes));
      } else {
        setInfoText('info-objects', '0');
        setInfoText('info-mesh-types', '0');
        setInfoText('info-instance-draws', '0');
      }
    }

    // Lighting
    if (lighting) {
      const cycle = lighting.dayNightCycle;
      if (cycle) {
        const h = Math.floor(cycle.timeOfDay);
        const m = Math.floor((cycle.timeOfDay % 1) * 60);
        setInfoText('info-time', `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        setInfoText('info-cycle-speed', `${cycle.speed.toFixed(1)}x`);
      } else {
        setInfoText('info-time', 'N/A');
        setInfoText('info-cycle-speed', 'N/A');
      }
      // Light breakdown by type
      const typeCounts: Record<string, number> = {};
      for (const ml of lighting.lights) {
        const t = ml.config.type;
        typeCounts[t] = (typeCounts[t] ?? 0) + 1;
      }
      const breakdown = Object.entries(typeCounts)
        .map(([t, c]) => `${String(c)} ${t}`)
        .join(', ');
      setInfoText('info-light-breakdown', breakdown || '0');

      const shadowCount = lighting.lights.filter((ml) => ml.shadowGenerator !== null).length;
      setInfoText('info-shadow-gens', String(shadowCount));

      // Shadow map info
      const sgLight = lighting.lights.find((ml) => ml.shadowGenerator !== null);
      if (sgLight?.shadowGenerator) {
        const sm = sgLight.shadowGenerator.getShadowMap();
        const sz = sm?.getSize();
        setInfoText('info-shadow-map', sz ? `${String(sz.width)}×${String(sz.height)}` : 'N/A');
      } else {
        setInfoText('info-shadow-map', 'None');
      }

      setInfoText('info-glow', lighting.glowLayer ? 'Active' : 'Off');
      setInfoText('info-postfx', tm?.postProcessing ? 'Active' : 'Off');
    }

    // Environment
    const skyInst = tm?.sky;
    if (skyInst) {
      const skyMesh = skyInst.skyboxMesh;
      const skyType = skyMesh ? skyMesh.name.replace('sky-', '').replace('-mat', '') : 'color';
      setInfoText('info-sky-type', skyType.charAt(0).toUpperCase() + skyType.slice(1));

      // Determine loaded texture
      const mat = skyInst.skyboxMaterial;
      let texName = 'None';
      if (mat && 'reflectionTexture' in mat && mat.reflectionTexture) {
        texName = (mat.reflectionTexture as BABYLON.BaseTexture).name || 'loaded';
      }
      setInfoText('info-sky-texture', texName.length > 28 ? `...${texName.slice(-25)}` : texName);
    } else {
      setInfoText('info-sky-type', 'None');
      setInfoText('info-sky-texture', 'None');
    }

    const parallax = tm?.parallax;
    if (parallax) {
      setInfoText('info-parallax-layers', String(parallax.layers.length));
      const bgCount = parallax.layers.filter(
        (l) => (l as Record<string, unknown>)['layerType'] === 'background',
      ).length;
      const fgCount = parallax.layers.length - bgCount;
      setInfoText('info-parallax-types', `${String(bgCount)} bg, ${String(fgCount)} fg`);
    } else {
      setInfoText('info-parallax-layers', '0');
      setInfoText('info-parallax-types', 'N/A');
    }

    setInfoText('info-stars', skyInst?.starLayer?.isEnabled ? 'Active' : 'Off');

    // Memory
    setInfoText('info-geometries', String(scene.geometries.length));
    const totalVB = scene.meshes.reduce(
      (acc, m) => acc + Object.keys(m.geometry?.getVerticesDataKinds() ?? {}).length,
      0,
    );
    setInfoText('info-vertex-buffers', String(totalVB));
    setInfoText(
      'info-compile',
      String((engine as Record<string, unknown>)['_compiledEffects']?.['size'] ?? '?'),
    );
  }

  // Run one immediate update so fields are populated when section is expanded
  updateDebugInfo();

  // Then update every 30 frames (skip when collapsed to save perf)
  let infoFrameCount = 0;
  scene.registerAfterRender(() => {
    infoFrameCount++;
    if (infoFrameCount % 30 !== 0) return;
    if (document.querySelector('#section-info')?.classList.contains('collapsed')) {
      return;
    }
    updateDebugInfo();
  });
}

/**
 * Sets the text content of an info element by ID.
 *
 * @param id - Element ID.
 * @param text - Text to set.
 */
function setInfoText(id: string, text: string): void {
  const el = document.querySelector(`#${id}`);
  if (el) el.textContent = text;
}

// =============================================================================
// Camera / Navigation UI
// =============================================================================

/** Maximum zoom multiplier for the navigation section. */
const MAX_ZOOM = 64;

/** Minimum zoom multiplier (< 1 = zoomed out beyond fit-to-map). */
const MIN_ZOOM = 0.5;

/** Zoom preset multipliers for the navigation section buttons. */
const ZOOM_PRESETS: readonly number[] = [0.5, 1, 2, 4, 8, 16, 32, 64];

/**
 * Creates a readout row with a label and value span for the navigation section.
 *
 * @param label - Display label text.
 * @param id - Element ID for the value span (for live updates).
 * @returns The readout row element.
 */
function makeNavReadout(label: string, id: string): HTMLDivElement {
  const row: HTMLDivElement = document.createElement('div');
  row.className = 'nav-readout';
  const lbl: HTMLSpanElement = document.createElement('span');
  lbl.className = 'nav-readout-label';
  lbl.textContent = label;
  const val: HTMLSpanElement = document.createElement('span');
  val.className = 'nav-readout-value';
  val.id = id;
  val.textContent = '--';
  row.append(lbl, val);
  return row;
}

// =============================================================================
// 3D Prop System — procedural Babylon.js meshes for the test map
// =============================================================================

/** Prop system state: all meshes, lights, and torch references for UI control. */
type PropSystem = {
  meshes: BABYLON.Mesh[];
  lights: BABYLON.PointLight[];
  torchTips: BABYLON.Mesh[];
};

/**
 * Creates shared materials for 3D props.
 *
 * @param scene - The Babylon.js scene
 * @returns Record of named materials
 */
function createPropMaterials(scene: BABYLON.Scene): Record<string, BABYLON.StandardMaterial> {
  const wood = new BABYLON.StandardMaterial('prop-wood', scene);
  wood.diffuseColor = new BABYLON.Color3(0.45, 0.3, 0.15);
  wood.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

  const darkWood = new BABYLON.StandardMaterial('prop-darkwood', scene);
  darkWood.diffuseColor = new BABYLON.Color3(0.35, 0.22, 0.1);
  darkWood.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);

  const stone = new BABYLON.StandardMaterial('prop-stone', scene);
  stone.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
  stone.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);

  const roof = new BABYLON.StandardMaterial('prop-roof', scene);
  roof.diffuseColor = new BABYLON.Color3(0.55, 0.25, 0.12);
  roof.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

  const metal = new BABYLON.StandardMaterial('prop-metal', scene);
  metal.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.35);
  metal.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

  const torch = new BABYLON.StandardMaterial('prop-torch', scene);
  torch.emissiveColor = new BABYLON.Color3(1, 0.6, 0.1);
  torch.diffuseColor = new BABYLON.Color3(1, 0.7, 0.2);

  return { wood, darkWood, stone, roof, metal, torch };
}

/**
 * Creates a procedural cottage at the given tile position.
 *
 * @param scene - The Babylon.js scene
 * @param mats - Shared prop materials
 * @param pos - Position with x, z, rotation
 * @param heightMap - Height map array for Y placement
 * @returns Array of meshes forming the cottage
 */
function createCottage(
  scene: BABYLON.Scene,
  mats: Record<string, BABYLON.StandardMaterial>,
  pos: { readonly x: Num; readonly z: Num; readonly rotation: Num },
  heightMap: Num[],
): BABYLON.Mesh[] {
  const hIdx: Num = pos.z * 32 + pos.x;
  const baseY: Num = (heightMap[hIdx] ?? 1) * 0.25;
  const meshes: BABYLON.Mesh[] = [];

  // Body
  const body = BABYLON.MeshBuilder.CreateBox(
    'cottage-body',
    { width: 1.4, height: 0.9, depth: 1.2 },
    scene,
  );
  body.position.set(pos.x + 0.5, baseY + 0.45, pos.z + 0.5);
  body.rotation.y = pos.rotation;
  body.material = mats['wood'] ?? null;
  meshes.push(body);

  // Roof
  const roofMesh = BABYLON.MeshBuilder.CreateBox(
    'cottage-roof',
    { width: 1.6, height: 0.35, depth: 1.4 },
    scene,
  );
  roofMesh.position.set(pos.x + 0.5, baseY + 1.07, pos.z + 0.5);
  roofMesh.rotation.y = pos.rotation;
  roofMesh.material = mats['roof'] ?? null;
  meshes.push(roofMesh);

  return meshes;
}

/**
 * Creates a procedural well at the given tile position.
 *
 * @param scene - The Babylon.js scene
 * @param mats - Shared prop materials
 * @param pos - Position with x, z
 * @param heightMap - Height map array for Y placement
 * @returns Array of meshes forming the well
 */
function createWell(
  scene: BABYLON.Scene,
  mats: Record<string, BABYLON.StandardMaterial>,
  pos: { readonly x: Num; readonly z: Num },
  heightMap: Num[],
): BABYLON.Mesh[] {
  const hIdx: Num = pos.z * 32 + pos.x;
  const baseY: Num = (heightMap[hIdx] ?? 1) * 0.25;
  const meshes: BABYLON.Mesh[] = [];

  const base = BABYLON.MeshBuilder.CreateCylinder(
    'well-base',
    { height: 0.5, diameter: 0.8, tessellation: 12 },
    scene,
  );
  base.position.set(pos.x + 0.5, baseY + 0.25, pos.z + 0.5);
  base.material = mats['stone'] ?? null;
  meshes.push(base);

  const rim = BABYLON.MeshBuilder.CreateTorus(
    'well-rim',
    { diameter: 0.85, thickness: 0.08, tessellation: 16 },
    scene,
  );
  rim.position.set(pos.x + 0.5, baseY + 0.52, pos.z + 0.5);
  rim.material = mats['stone'] ?? null;
  meshes.push(rim);

  return meshes;
}

/**
 * Creates a torch post with a glowing tip at the given tile position.
 *
 * @param scene - The Babylon.js scene
 * @param mats - Shared prop materials
 * @param pos - Position with x, z
 * @param heightMap - Height map array for Y placement
 * @returns Object with meshes and a reference to the glowing tip
 */
function createTorchPost(
  scene: BABYLON.Scene,
  mats: Record<string, BABYLON.StandardMaterial>,
  pos: { readonly x: Num; readonly z: Num },
  heightMap: Num[],
): { meshes: BABYLON.Mesh[]; tip: BABYLON.Mesh } {
  const hIdx: Num = pos.z * 32 + pos.x;
  const baseY: Num = (heightMap[hIdx] ?? 1) * 0.25;

  const post = BABYLON.MeshBuilder.CreateCylinder(
    'torch-post',
    { height: 1.0, diameter: 0.08, tessellation: 8 },
    scene,
  );
  post.position.set(pos.x + 0.5, baseY + 0.5, pos.z + 0.5);
  post.material = mats['metal'] ?? null;

  const tip = BABYLON.MeshBuilder.CreateSphere('torch-tip', { diameter: 0.18, segments: 8 }, scene);
  tip.position.set(pos.x + 0.5, baseY + 1.05, pos.z + 0.5);
  tip.material = mats['torch'] ?? null;

  return { meshes: [post, tip], tip };
}

/**
 * Creates a bridge at the given tile position spanning the river.
 *
 * @param scene - The Babylon.js scene
 * @param mats - Shared prop materials
 * @param pos - Position with x, z, width
 * @param heightMap - Height map array for Y placement
 * @returns Array of bridge meshes
 */
function createBridge(
  scene: BABYLON.Scene,
  mats: Record<string, BABYLON.StandardMaterial>,
  pos: { readonly x: Num; readonly z: Num; readonly width: Num },
  heightMap: Num[],
): BABYLON.Mesh[] {
  const hIdx: Num = pos.z * 32 + pos.x;
  const baseY: Num = (heightMap[hIdx] ?? 1) * 0.25;

  const plank = BABYLON.MeshBuilder.CreateBox(
    'bridge',
    { width: pos.width, height: 0.12, depth: 2 },
    scene,
  );
  plank.position.set(pos.x + pos.width / 2, baseY + 0.06, pos.z + 0.5);
  plank.material = mats['darkWood'] ?? null;

  // Railings
  const rail1 = BABYLON.MeshBuilder.CreateBox(
    'bridge-rail1',
    { width: pos.width, height: 0.3, depth: 0.06 },
    scene,
  );
  rail1.position.set(pos.x + pos.width / 2, baseY + 0.27, pos.z - 0.47);
  rail1.material = mats['wood'] ?? null;

  const rail2 = BABYLON.MeshBuilder.CreateBox(
    'bridge-rail2',
    { width: pos.width, height: 0.3, depth: 0.06 },
    scene,
  );
  rail2.position.set(pos.x + pos.width / 2, baseY + 0.27, pos.z + 1.47);
  rail2.material = mats['wood'] ?? null;

  return [plank, rail1, rail2];
}

/**
 * Creates a boulder/rock at the given tile position.
 *
 * @param scene - The Babylon.js scene
 * @param mats - Shared prop materials
 * @param pos - Position with x, z, scale
 * @param heightMap - Height map array for Y placement
 * @returns The boulder mesh
 */
function createBoulder(
  scene: BABYLON.Scene,
  mats: Record<string, BABYLON.StandardMaterial>,
  pos: { readonly x: Num; readonly z: Num; readonly scale: Num },
  heightMap: Num[],
): BABYLON.Mesh {
  const hIdx: Num = pos.z * 32 + pos.x;
  const baseY: Num = (heightMap[hIdx] ?? 1) * 0.25;

  const rock = BABYLON.MeshBuilder.CreateIcoSphere(
    'boulder',
    { radius: 0.3 * pos.scale, subdivisions: 1 },
    scene,
  );
  rock.position.set(pos.x + 0.5, baseY + 0.15 * pos.scale, pos.z + 0.5);
  rock.material = mats['stone'] ?? null;
  return rock;
}

/**
 * Creates a barrel at the given tile position.
 *
 * @param scene - The Babylon.js scene
 * @param mats - Shared prop materials
 * @param pos - Position with x, z
 * @param heightMap - Height map array for Y placement
 * @returns The barrel mesh
 */
function createBarrel(
  scene: BABYLON.Scene,
  mats: Record<string, BABYLON.StandardMaterial>,
  pos: { readonly x: Num; readonly z: Num },
  heightMap: Num[],
): BABYLON.Mesh {
  const hIdx: Num = pos.z * 32 + pos.x;
  const baseY: Num = (heightMap[hIdx] ?? 1) * 0.25;

  const barrel = BABYLON.MeshBuilder.CreateCylinder(
    'barrel',
    { height: 0.5, diameter: 0.35, tessellation: 10 },
    scene,
  );
  barrel.position.set(pos.x + 0.5, baseY + 0.25, pos.z + 0.5);
  barrel.material = mats['wood'] ?? null;
  return barrel;
}

/**
 * Creates a crate at the given tile position.
 *
 * @param scene - The Babylon.js scene
 * @param mats - Shared prop materials
 * @param pos - Position with x, z
 * @param heightMap - Height map array for Y placement
 * @returns The crate mesh
 */
function createCrate(
  scene: BABYLON.Scene,
  mats: Record<string, BABYLON.StandardMaterial>,
  pos: { readonly x: Num; readonly z: Num },
  heightMap: Num[],
): BABYLON.Mesh {
  const hIdx: Num = pos.z * 32 + pos.x;
  const baseY: Num = (heightMap[hIdx] ?? 1) * 0.25;

  const crate = BABYLON.MeshBuilder.CreateBox(
    'crate',
    { width: 0.4, height: 0.4, depth: 0.4 },
    scene,
  );
  crate.position.set(pos.x + 0.5, baseY + 0.2, pos.z + 0.5);
  crate.material = mats['darkWood'] ?? null;
  return crate;
}

/**
 * Creates a fence post at the given tile position.
 *
 * @param scene - The Babylon.js scene
 * @param mats - Shared prop materials
 * @param pos - Position with x, z, axis
 * @param heightMap - Height map array for Y placement
 * @returns The fence post mesh
 */
function createFencePost(
  scene: BABYLON.Scene,
  mats: Record<string, BABYLON.StandardMaterial>,
  pos: { readonly x: Num; readonly z: Num; readonly axis: 'x' | 'z' },
  heightMap: Num[],
): BABYLON.Mesh {
  const hIdx: Num = pos.z * 32 + pos.x;
  const baseY: Num = (heightMap[hIdx] ?? 1) * 0.25;

  const fence = BABYLON.MeshBuilder.CreateBox(
    'fence',
    pos.axis === 'x'
      ? { width: 1.0, height: 0.5, depth: 0.06 }
      : { width: 0.06, height: 0.5, depth: 1.0 },
    scene,
  );
  fence.position.set(pos.x + 0.5, baseY + 0.25, pos.z + 0.5);
  fence.material = mats['wood'] ?? null;
  return fence;
}

/**
 * Creates all 3D props for the test map scene.
 *
 * @param scene - The Babylon.js scene
 * @param heightMap - Height map array for Y placement
 * @returns PropSystem with all meshes, lights, and torch tip references
 */
function create3DProps(scene: BABYLON.Scene, heightMap: Num[]): PropSystem {
  const mats: Record<string, BABYLON.StandardMaterial> = createPropMaterials(scene);
  const meshes: BABYLON.Mesh[] = [];
  const lights: BABYLON.PointLight[] = [];
  const torchTips: BABYLON.Mesh[] = [];

  // Cottages
  for (const cottage of PROP_POSITIONS.cottages) {
    meshes.push(...createCottage(scene, mats, cottage, heightMap));
  }

  // Well
  meshes.push(...createWell(scene, mats, PROP_POSITIONS.well, heightMap));

  // Torch posts
  for (const torchPos of PROP_POSITIONS.torches) {
    const result = createTorchPost(scene, mats, torchPos, heightMap);
    meshes.push(...result.meshes);
    torchTips.push(result.tip);
  }

  // Bridge
  meshes.push(...createBridge(scene, mats, PROP_POSITIONS.bridge, heightMap));

  // Boulders
  for (const boulder of PROP_POSITIONS.boulders) {
    meshes.push(createBoulder(scene, mats, boulder, heightMap));
  }

  // Barrels
  for (const barrel of PROP_POSITIONS.barrels) {
    meshes.push(createBarrel(scene, mats, barrel, heightMap));
  }

  // Crates
  for (const crate of PROP_POSITIONS.crates) {
    meshes.push(createCrate(scene, mats, crate, heightMap));
  }

  // Fence posts
  for (const fence of PROP_POSITIONS.fencePosts) {
    meshes.push(createFencePost(scene, mats, fence, heightMap));
  }

  // Wire shadows: add all solid props to shadow generator
  const shadowGen = scene.lights[0]?.getShadowGenerator();
  if (shadowGen) {
    for (const mesh of meshes) {
      (shadowGen as BABYLON.ShadowGenerator).addShadowCaster(mesh);
      mesh.receiveShadows = true;
    }
  }

  // Wire glow: add torch tips to glow layer
  const glowLayer = scene.effectLayers?.find((layer) => layer instanceof BABYLON.GlowLayer) as
    | BABYLON.GlowLayer
    | undefined;
  if (glowLayer) {
    for (const tip of torchTips) {
      glowLayer.addIncludedOnlyMesh(tip);
    }
  }

  return { meshes, lights, torchTips };
}

/** Module-level prop system reference for UI control. */
let _propSystem: PropSystem | null = null;

// =============================================================================
// Test Map UI — sidebar controls for props, season, atmosphere
// =============================================================================

/**
 * Builds the Test Map sidebar section with controls for props, seasons, atmosphere.
 *
 * @param debug - The debug API handle
 * @param scene - The Babylon.js scene
 */
function buildTestMapUI(debug: DevDebugApi, scene: BABYLON.Scene): void {
  const container = document.querySelector('#testmap-body') as HTMLElement | null;
  if (!container) return;
  container.innerHTML = '';

  // --- Map Size Controls ---
  const widthInput: HTMLInputElement = document.createElement('input');
  const heightInput: HTMLInputElement = document.createElement('input');

  // Preset sizes dropdown
  const presetRow: HTMLElement = document.createElement('div');
  presetRow.className = 'control-row';
  presetRow.dataset['control'] = 'map-preset';
  const presetLabel: HTMLSpanElement = document.createElement('span');
  presetLabel.className = 'control-label';
  presetLabel.textContent = 'Preset';
  presetLabel.title = 'Choose a common map size or enter custom dimensions below';
  const presetSelect: HTMLSelectElement = document.createElement('select');
  presetSelect.title = 'Select a preset map size';
  presetSelect.style.cssText =
    'flex:1;background:#1a1a1a;color:#ccc;border:1px solid rgba(255,255,255,0.18);' +
    'border-radius:4px;padding:5px 8px;font:11px/1.2 "SF Mono","Menlo","Monaco",monospace;' +
    'outline:none;cursor:pointer;';
  const presets: Array<[string, number, number]> = [
    ['Custom', 0, 0],
    // RPG Maker-style sizes
    ['RPG Maker XS \u2014 17\u00D713', 17, 13],
    ['RPG Maker S \u2014 20\u00D715', 20, 15],
    ['RPG Maker M \u2014 25\u00D719', 25, 19],
    ['RPG Maker L \u2014 30\u00D725', 30, 25],
    ['RPG Maker XL \u2014 40\u00D730', 40, 30],
    // Square sizes
    ['10\u00D710', 10, 10],
    ['16\u00D716', 16, 16],
    ['20\u00D720', 20, 20],
    ['32\u00D732', 32, 32],
    ['48\u00D748', 48, 48],
    ['50\u00D750', 50, 50],
    ['64\u00D764', 64, 64],
    ['80\u00D780', 80, 80],
    ['100\u00D7100', 100, 100],
    ['128\u00D7128', 128, 128],
    ['150\u00D7150', 150, 150],
    ['200\u00D7200', 200, 200],
    ['256\u00D7256', 256, 256],
    ['300\u00D7300', 300, 300],
    ['400\u00D7400', 400, 400],
    ['500\u00D7500', 500, 500],
    // Wide / tall
    ['60\u00D720', 60, 20],
    ['80\u00D730', 80, 30],
    ['120\u00D740', 120, 40],
    ['200\u00D750', 200, 50],
    ['20\u00D760', 20, 60],
    ['30\u00D780', 30, 80],
    ['40\u00D7120', 40, 120],
    ['50\u00D7200', 50, 200],
    // Stress test
    ['512\u00D7512', 512, 512],
    ['750\u00D7750', 750, 750],
    ['1000\u00D71000', 1000, 1000],
    ['1500\u00D71500', 1500, 1500],
    ['2000\u00D72000', 2000, 2000],
    ['2500\u00D72500', 2500, 2500],
    ['3000\u00D73000', 3000, 3000],
    ['4000\u00D74000', 4000, 4000],
    ['5000\u00D75000', 5000, 5000],
    ['8000\u00D78000', 8000, 8000],
    ['10000\u00D710000', 10000, 10000],
    ['16384\u00D716384', 16384, 16384],
    // Streaming (maps > 16384)
    ['20000\u00D720000', 20000, 20000],
    ['50000\u00D750000', 50000, 50000],
  ];
  for (const [label, ,] of presets) {
    const opt: HTMLOptionElement = document.createElement('option');
    opt.textContent = label;
    opt.value = label;
    presetSelect.append(opt);
  }
  presetSelect.addEventListener('change', () => {
    const idx: number = presetSelect.selectedIndex;
    if (idx > 0) {
      const [, w, h] = presets[idx];
      widthInput.value = String(w);
      heightInput.value = String(h);
    }
  });
  presetRow.append(presetLabel, presetSelect);

  // Width × Height inputs — show raw mapData dimensions (not screen-axis-mapped)
  // _mapHeight = mapData.width (columns), _mapWidth = mapData.height (rows) after swap
  const sizeRow: HTMLElement = document.createElement('div');
  sizeRow.className = 'control-row';
  sizeRow.dataset['control'] = 'map-size';
  sizeRow.style.cssText = 'gap:6px;align-items:center;';
  sizeRow.title = 'Map dimensions in tiles (columns \u00D7 rows)';

  const sizeLabel: HTMLSpanElement = document.createElement('span');
  sizeLabel.className = 'control-label';
  sizeLabel.textContent = 'Size';
  sizeLabel.title = 'Map columns \u00D7 rows';

  const sizeInputCss: string =
    'width:56px;background:#1a1a1a;color:#6ecfcf;' +
    'border:1px solid rgba(255,255,255,0.18);border-radius:4px;' +
    'padding:5px 8px;font:12px/1.2 "SF Mono","Menlo","Monaco",monospace;' +
    'text-align:center;outline:none;';

  const buildSizeInput = (input: HTMLInputElement, val: number, tip: string): void => {
    input.type = 'number';
    input.min = '1';
    input.max = '5000';
    input.value = String(val);
    input.title = tip;
    input.style.cssText = sizeInputCss;
    input.addEventListener('input', () => {
      presetSelect.selectedIndex = 0;
    });
  };
  // Show mapData dimensions: width (columns) = _mapHeight, height (rows) = _mapWidth
  buildSizeInput(widthInput, _mapHeight, 'Columns (1\u20131000)');
  buildSizeInput(heightInput, _mapWidth, 'Rows (1\u20131000)');

  const times: HTMLSpanElement = document.createElement('span');
  times.style.cssText = 'color:#555;font-size:14px;font-weight:bold;';
  times.textContent = '\u00D7';

  sizeRow.append(sizeLabel, widthInput, times, heightInput);

  // Resize button
  const btnRow: HTMLElement = document.createElement('div');
  btnRow.className = 'btn-group';
  btnRow.style.padding = '4px 0 6px';
  const resizeBtn: HTMLButtonElement = document.createElement('button');
  resizeBtn.className = 'btn';
  resizeBtn.style.flex = '1';
  resizeBtn.textContent = 'Resize Map';
  resizeBtn.title = 'Replace current map with a blank map at the specified dimensions';
  resizeBtn.addEventListener('click', () => {
    const newW: number = Math.max(1, Number(widthInput.value) || 1);
    const newH: number = Math.max(1, Number(heightInput.value) || 1);

    // Dispose current tilemap
    const currentTilemap: RenderedTilemap | null = debug.tilemap;
    if (currentTilemap) disposeTilemap({ tilemap: currentTilemap });

    // Dispose 3D props
    if (_propSystem) {
      for (const mesh of _propSystem.meshes) mesh.dispose();
      for (const light of _propSystem.lights) light.dispose();
      _propSystem = null;
    }

    // Use fast blank tilemap renderer — no huge JS arrays, no per-tile
    // schema validation, no intermediate copies. Directly fills GPU
    // data textures with uniform tile IDs.
    const result: BabylonResult<RenderedTilemap> = renderBlankTilemap({
      scene,
      width: newW as Num,
      height: newH as Num,
      assetBasePath: '/' as Str,
      tilesets: TEST_MAP_DATA.tilesets,
      layers: [
        { name: 'ground' as Str, type: 'ground' as Str, fillTileId: 1 as Num, opacity: 1 as Num },
        {
          name: 'ground_deco' as Str,
          type: 'ground_deco' as Str,
          fillTileId: 0 as Num,
          opacity: 1 as Num,
        },
        { name: 'upper1' as Str, type: 'upper1' as Str, fillTileId: 0 as Num, opacity: 1 as Num },
        { name: 'shadow' as Str, type: 'shadow' as Str, fillTileId: 0 as Num, opacity: 0.4 as Num },
      ],
      postProcessing: { preset: 'hd2d' } as unknown as MapData['postProcessing'],
      lighting: (TEST_MAP_DATA as Record<string, unknown>).lighting as MapData['lighting'],
    });
    if (result.ok) {
      debug.tilemap = result.data;
      void applyMegaAtlas({ tilemap: result.data }).then((megaResult) => {
        if (megaResult.ok) debug.tilemap = megaResult.data;
      });
      // _mapHeight (X axis extent) = newW (mapData.width)
      // _mapWidth (Z axis extent) = newH (mapData.height)
      _mapWidth = newH;
      _mapHeight = newW;

      // Reapply ortho bounds for new map size
      const cam = scene.activeCamera as BABYLON.ArcRotateCamera;

      // Ensure 3D presets can zoom out far enough for the new map size
      updateRadiusLimitForMap(cam, _mapWidth, _mapHeight);
      computeOrthoMax(scene, cam);
      _orthoSize = initialOrthoSize(scene);
      applyOrthoBounds(cam, scene);
      cam.target.x = _mapHeight / 2;
      cam.target.z = _mapWidth / 2;
      clampCameraToMap(cam, scene);
      updateScrollbars(cam, scene);
      _lastCanvasH = scene.getEngine().getRenderHeight();

      // Rebuild grid for new size
      if (_gridMesh) {
        _gridMesh.dispose();
        _gridMesh = null;
      }
      if (_gridFillMesh) {
        _gridFillMesh.dispose();
        _gridFillMesh = null;
      }
      if (_gridVisible) toggleGridOverlay(scene, debug, true);

      // Update editor backdrop size
      ensureEditorBackdrop(scene);

      // Immediately hide VLS/sky meshes so they don't flash for one frame
      if (_currentPreset === 'mapeditor') {
        for (const mesh of scene.meshes) {
          if (mesh.name === 'VolumetricLightScatteringMesh' && mesh.isVisible) {
            mesh.isVisible = false;
          } else if (mesh.name.startsWith('sky-') && mesh.isEnabled()) {
            mesh.setEnabled(false);
          }
        }
      }

      // eslint-disable-next-line no-console -- Dev harness diagnostic
      console.log(`[TestMap] Resized to ${String(newW)}×${String(newH)} (blank)`);
    } else {
      // eslint-disable-next-line no-console -- Dev harness diagnostic
      console.error('[TestMap] Resize failed:', result.error);
    }
  });

  btnRow.append(resizeBtn);
  container.append(presetRow, sizeRow, btnRow);

  // --- 3D Props Toggle ---
  container.append(
    createToggleRow(
      '3D Props',
      true,
      (on) => {
        if (!_propSystem) return;
        for (const mesh of _propSystem.meshes) {
          mesh.setEnabled(on);
        }
      },
      'testmap-props-toggle',
      'Show/hide 3D prop meshes (cottages, well, torches, bridge)',
    ),
  );

  // --- Prop Shadows Toggle ---
  container.append(
    createToggleRow(
      'Prop Shadows',
      true,
      (on) => {
        if (!_propSystem) return;
        const shadowGen = scene.lights[0]?.getShadowGenerator() as BABYLON.ShadowGenerator | null;
        if (!shadowGen) return;
        for (const mesh of _propSystem.meshes) {
          if (on) {
            shadowGen.addShadowCaster(mesh);
          } else {
            shadowGen.removeShadowCaster(mesh);
          }
        }
      },
      'testmap-shadows-toggle',
      'Enable shadow casting for 3D prop meshes',
    ),
  );

  // --- Torch Lights Toggle ---
  container.append(
    createToggleRow(
      'Torch Lights',
      true,
      (on) => {
        if (!_propSystem) return;
        for (const light of _propSystem.lights) {
          light.setEnabled(on);
        }
      },
      'testmap-lights-toggle',
      'Enable point lights attached to torch props',
    ),
  );

  // --- Torch Glow Toggle ---
  container.append(
    createToggleRow(
      'Torch Glow',
      true,
      (on) => {
        if (!_propSystem) return;
        const glowLayer = scene.effectLayers?.find((layer) => layer instanceof BABYLON.GlowLayer) as
          | BABYLON.GlowLayer
          | undefined;
        if (!glowLayer) return;
        for (const tip of _propSystem.torchTips) {
          if (on) {
            glowLayer.addIncludedOnlyMesh(tip);
          } else {
            glowLayer.removeIncludedOnlyMesh(tip);
          }
        }
      },
      'testmap-glow-toggle',
      'Enable glow layer emission on torch flame tips',
    ),
  );

  // --- Prop Opacity Slider ---
  container.append(
    createSliderRow(
      'Prop Opacity',
      0,
      1,
      0.05,
      1.0,
      (v) => {
        if (!_propSystem) return;
        for (const mesh of _propSystem.meshes) {
          mesh.visibility = v;
        }
      },
      'testmap-opacity-slider',
    ),
  );

  // --- Season Dropdown ---
  const seasonOptions: Array<{ value: string; label: string }> = Object.keys(SEASON_PATHS).map(
    (s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }),
  );
  container.append(
    createDropdown(
      'Season',
      seasonOptions,
      'summer',
      (value) => {
        const currentTilemap: RenderedTilemap | null = debug.tilemap;
        if (!currentTilemap) return;
        const paths: Record<string, string> | undefined = SEASON_PATHS[value];
        if (!paths) return;

        // Clone tilesets with updated image paths for the selected season
        const updatedTilesets: Array<Record<string, unknown>> = currentTilemap.mapData.tilesets.map(
          (ts: Record<string, unknown>) => {
            const tsName = String(ts['name'] ?? '');
            const seasonPath: string | undefined = paths[tsName];
            if (seasonPath) {
              return { ...ts, imagePath: seasonPath };
            }
            return { ...ts };
          },
        );

        const newMapData: Record<string, unknown> = {
          ...currentTilemap.mapData,
          tilesets: updatedTilesets,
        };

        // Dispose current tilemap and re-render with seasonal variant
        disposeTilemap({ tilemap: currentTilemap });
        const result: BabylonResult<RenderedTilemap> = renderTilemap({
          scene,
          mapDataInput: newMapData,
          assetBasePath: '/',
        });
        if (result.ok) {
          debug.tilemap = result.data;
          void applyMegaAtlas({ tilemap: result.data }).then((megaResult) => {
            if (megaResult.ok) debug.tilemap = megaResult.data;
          });
          // eslint-disable-next-line no-console -- Dev harness diagnostic
          console.log(`[TestMap] Season switched → ${value}`);
        } else {
          // eslint-disable-next-line no-console -- Dev harness diagnostic
          console.error(`[TestMap] Season switch failed:`, result.error);
        }
      },
      'testmap-season-dropdown',
    ),
  );

  // --- Atmosphere Dropdown ---
  const atmosOptions: Array<{ value: string; label: string }> = Object.keys(ATMOSPHERE_PRESETS).map(
    (key) => {
      const preset = ATMOSPHERE_PRESETS[key];
      return { value: key, label: preset?.label ?? key };
    },
  );
  container.append(
    createDropdown(
      'Atmosphere',
      atmosOptions,
      atmosOptions[0]?.value ?? 'sunnyVillage',
      (value) => {
        const preset = ATMOSPHERE_PRESETS[value];
        if (!preset) return;

        // Apply time
        debug.setTime(preset.time);

        // Apply fog preset
        if (preset.fog !== 'clear') {
          debug.switchPreset(preset.fog as FogPresetName);
        }

        // eslint-disable-next-line no-console -- Dev harness diagnostic
        console.log(
          `[TestMap] Atmosphere → ${preset.label} (time=${String(preset.time)}, fog=${preset.fog})`,
        );
      },
    ),
  );
}

/**
 * Builds the Keyboard Shortcuts reference section listing all available shortcuts.
 */
function buildKeyboardShortcutsUI(): void {
  const container = document.querySelector('#shortcuts-body') as HTMLElement | null;
  if (!container) return;
  container.innerHTML = '';

  const shortcuts: Array<{ group: string; items: Array<{ key: string; desc: string }> }> = [
    {
      group: 'Panel',
      items: [{ key: '`', desc: 'Toggle dev panel' }],
    },
    {
      group: 'Navigation (Map Editor)',
      items: [
        { key: 'W / \u2191', desc: 'Pan up' },
        { key: 'S / \u2193', desc: 'Pan down' },
        { key: 'A / \u2190', desc: 'Pan left' },
        { key: 'D / \u2192', desc: 'Pan right' },
        { key: 'Ctrl + Scroll', desc: 'Zoom in/out' },
        { key: 'Right/Mid Drag', desc: 'Drag to pan' },
      ],
    },
    {
      group: 'Editing (Map Editor)',
      items: [
        { key: 'Delete / Backspace', desc: 'Clear selected tile(s)' },
        { key: 'G', desc: 'Toggle grid overlay' },
        { key: 'Shift + Drag', desc: 'Rectangular selection' },
        { key: 'Escape', desc: 'Clear selection' },
      ],
    },
  ];

  for (const group of shortcuts) {
    container.append(createSubHeader(group.group));
    for (const item of group.items) {
      const row: HTMLDivElement = document.createElement('div');
      row.className = 'control-row';
      row.style.padding = '1px 0';

      const keySpan: HTMLElement = document.createElement('span');
      keySpan.className = 'control-label';
      keySpan.style.minWidth = 'auto';
      keySpan.style.flex = 'none';
      keySpan.innerHTML = `<kbd>${item.key}</kbd>`;

      const descSpan: HTMLSpanElement = document.createElement('span');
      descSpan.style.cssText = 'color:#aaa;font-size:11px;margin-left:6px;';
      descSpan.textContent = item.desc;

      row.append(keySpan, descSpan);
      container.append(row);
    }
  }
}

/**
 * Builds the Camera / Navigation UI section with zoom presets,
 * grid position navigation, and live camera readout.
 *
 * @param runtime - The runtime instance.
 * @param debug - Debug API reference.
 */
function buildCameraNavigationUI(runtime: RuntimeInstance, debug: DevDebugApi): void {
  const container = document.querySelector('#camera-nav-body') as HTMLElement | null;
  if (!container) return;
  container.innerHTML = '';

  const cam = runtime.camera as BABYLON.ArcRotateCamera;
  const { scene } = runtime.engine;

  // -- Mapeditor-only wrapper vs fallback message --
  const controlsDiv: HTMLDivElement = document.createElement('div');
  const fallbackDiv: HTMLDivElement = document.createElement('div');
  fallbackDiv.className = 'status-text';
  fallbackDiv.textContent = 'Switch to Map Editor for zoom/navigation';
  fallbackDiv.style.display = _currentPreset === 'mapeditor' ? 'none' : 'block';
  controlsDiv.style.display = _currentPreset === 'mapeditor' ? 'block' : 'none';

  // Grid controls are always visible (work in all camera modes)
  const gridDiv: HTMLDivElement = document.createElement('div');

  // Go To Tile + Camera Position (always visible — works in all camera presets)
  const navDiv: HTMLDivElement = document.createElement('div');

  // ── 0. Refocus Section (always visible — works in all presets) ──
  const refocusSection: HTMLDivElement = document.createElement('div');
  refocusSection.append(createSubHeader('Refocus'));

  const refocusBtn: HTMLButtonElement = document.createElement('button');
  refocusBtn.className = 'btn';
  refocusBtn.textContent = 'Refocus Map (F)';
  refocusBtn.title = 'Zoom to show the entire tilemap. Shortcut: F or Home key.';
  refocusBtn.style.width = '100%';
  refocusBtn.dataset['control'] = 'nav-refocus-btn';
  refocusBtn.addEventListener('click', () => {
    refocusMap(cam, scene, debug);
  });
  refocusSection.append(refocusBtn);

  // ── 0b. Refocus Settings (collapsible, collapsed by default) ──
  const refSettings = createCollapsibleGroup('Refocus Settings', true);

  refSettings.body.append(
    createToggleRow(
      'Animated',
      _refocusAnimated,
      (val: boolean) => {
        _refocusAnimated = val;
      },
      'nav-refocus-animated',
      'Smooth animated transition vs instant snap',
    ),
  );

  // Duration slider with "ms" suffix (custom to avoid "3.0k" formatting from createSliderRow)
  const refDurRow: HTMLDivElement = document.createElement('div');
  refDurRow.className = 'control-row';
  refDurRow.dataset['type'] = 'slider';
  refDurRow.dataset['control'] = 'nav-refocus-duration';
  const refDurLbl: HTMLSpanElement = document.createElement('span');
  refDurLbl.className = 'control-label';
  refDurLbl.textContent = 'Duration';
  const refDurSlider: HTMLInputElement = document.createElement('input');
  refDurSlider.type = 'range';
  refDurSlider.min = '0';
  refDurSlider.max = '30000';
  refDurSlider.step = '50';
  refDurSlider.value = String(_refocusDurationMs);
  const refDurVal: HTMLSpanElement = document.createElement('span');
  refDurVal.className = 'control-value';
  refDurVal.textContent = `${_refocusDurationMs}ms`;
  refDurVal.style.cursor = 'pointer';
  refDurVal.title = 'Click to enter a custom duration';
  refDurSlider.addEventListener('input', () => {
    const v: number = Number(refDurSlider.value);
    refDurVal.textContent = `${v}ms`;
    _refocusDurationMs = v;
  });

  // Inline-editable duration value
  const refDurInline: HTMLInputElement = document.createElement('input');
  refDurInline.type = 'number';
  refDurInline.className = 'nav-input';
  refDurInline.min = '0';
  refDurInline.max = '60000';
  refDurInline.step = '50';
  refDurInline.style.display = 'none';
  refDurInline.style.width = '60px';

  const applyRefDur = (): void => {
    const v: number = Math.max(0, Math.min(60000, Number(refDurInline.value) || 0));
    _refocusDurationMs = v;
    refDurSlider.value = String(Math.min(30000, v));
    refDurVal.textContent = `${v}ms`;
    refDurInline.style.display = 'none';
    refDurVal.style.display = '';
  };

  refDurVal.addEventListener('click', () => {
    refDurInline.value = String(_refocusDurationMs);
    refDurVal.style.display = 'none';
    refDurInline.style.display = '';
    refDurInline.focus();
    refDurInline.select();
  });

  refDurInline.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') applyRefDur();
    if (e.key === 'Escape') {
      refDurInline.style.display = 'none';
      refDurVal.style.display = '';
    }
  });
  refDurInline.addEventListener('blur', applyRefDur);

  refDurRow.append(
    wrapWithTooltip(refDurLbl, 'Animation duration in milliseconds. 0 = instant.'),
    refDurSlider,
    refDurVal,
    refDurInline,
  );
  refSettings.body.append(refDurRow);

  refSettings.body.append(
    createDropdown(
      'Easing',
      [
        { value: 'linear', label: 'Linear' },
        { value: 'easeInOutCubic', label: 'Ease In/Out Cubic' },
        { value: 'easeOutBack', label: 'Ease Out Back' },
        { value: 'easeInOutQuad', label: 'Ease In/Out Quad' },
      ],
      _refocusEasing,
      (val: string) => {
        _refocusEasing = val as typeof _refocusEasing;
      },
      'nav-refocus-easing',
      'Easing curve for the transition',
    ),
  );

  refSettings.body.append(
    createSliderRow(
      'Padding',
      1.0,
      2.0,
      0.05,
      _refocusPaddingScale,
      (val: number) => {
        _refocusPaddingScale = val;
      },
      'nav-refocus-padding',
      'Radius multiplier for breathing room around map edges',
    ),
  );

  refSettings.body.append(
    createToggleRow(
      'Reset Elevation',
      _refocusResetElevation,
      (val: boolean) => {
        _refocusResetElevation = val;
      },
      'nav-refocus-reset-elev',
      'Also reset camera pitch to preset default',
    ),
  );

  refSettings.body.append(
    createToggleRow(
      'Reset Orbit',
      _refocusResetOrbit,
      (val: boolean) => {
        _refocusResetOrbit = val;
      },
      'nav-refocus-reset-orbit',
      'Also reset camera orbit angle to preset default',
    ),
  );

  refocusSection.append(refSettings.root);

  // NOTE: container.append is deferred until after actionsDiv is built below.

  // Store refs for preset-change toggling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
  (window as any)._camNavControls = controlsDiv;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
  (window as any)._camNavFallback = fallbackDiv;

  // ── 1. Zoom Preset Buttons ──
  controlsDiv.append(createSubHeader('Zoom'));

  const zoomBtnGroup: HTMLDivElement = document.createElement('div');
  zoomBtnGroup.className = 'btn-group';
  zoomBtnGroup.style.padding = '2px 0';

  const zoomButtons: HTMLButtonElement[] = [];
  for (const mult of ZOOM_PRESETS) {
    const btn: HTMLButtonElement = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = mult === 1 ? '1x' : `${String(mult)}x`;
    btn.dataset['zoom'] = String(mult);
    btn.addEventListener('click', () => {
      setZoomLevel(mult, cam, scene);
    });
    zoomButtons.push(btn);
    zoomBtnGroup.append(btn);
  }
  controlsDiv.append(zoomBtnGroup);

  // ── 2. Zoom Slider ──
  const zoomSliderRow: HTMLDivElement = document.createElement('div');
  zoomSliderRow.className = 'control-row';

  const zoomLabel: HTMLSpanElement = document.createElement('span');
  zoomLabel.className = 'control-label';
  zoomLabel.textContent = 'Zoom';

  const zoomSlider: HTMLInputElement = document.createElement('input');
  zoomSlider.type = 'range';
  zoomSlider.min = String(MIN_ZOOM);
  zoomSlider.max = String(MAX_ZOOM);
  zoomSlider.step = '0.5';
  zoomSlider.value = String(getZoomMultiplier().toFixed(1));
  zoomSlider.dataset['control'] = 'cam-nav-zoom';

  const zoomValSpan: HTMLSpanElement = document.createElement('span');
  zoomValSpan.className = 'control-value';
  zoomValSpan.id = 'cam-nav-zoom-display';
  zoomValSpan.textContent = `${getZoomMultiplier().toFixed(1)}x`;

  zoomSlider.addEventListener('input', () => {
    const val: number = Number.parseFloat(zoomSlider.value);
    setZoomLevel(val, cam, scene);
    zoomValSpan.textContent = `${val.toFixed(1)}x`;
  });

  zoomSliderRow.append(
    wrapWithTooltip(zoomLabel, 'Camera zoom multiplier. 1x = default, 16x = max zoom.'),
    zoomSlider,
    zoomValSpan,
  );
  controlsDiv.append(zoomSliderRow);

  // ── 2b. Inline-editable zoom value (click the value to type a custom zoom) ──
  zoomValSpan.style.cursor = 'pointer';
  zoomValSpan.title = 'Click to enter a custom zoom value';

  const inlineZoomInput: HTMLInputElement = document.createElement('input');
  inlineZoomInput.type = 'number';
  inlineZoomInput.className = 'nav-input';
  inlineZoomInput.min = String(MIN_ZOOM);
  inlineZoomInput.max = String(MAX_ZOOM);
  inlineZoomInput.step = '0.1';
  inlineZoomInput.style.display = 'none';
  inlineZoomInput.style.width = '52px';
  zoomSliderRow.append(inlineZoomInput);

  const applyInlineZoom = (): void => {
    const val: number = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, Number.parseFloat(inlineZoomInput.value) || 1),
    );
    setZoomLevel(val, cam, scene);
    zoomValSpan.textContent = `${val.toFixed(1)}x`;
    inlineZoomInput.style.display = 'none';
    zoomValSpan.style.display = '';
  };

  zoomValSpan.addEventListener('click', () => {
    inlineZoomInput.value = getZoomMultiplier().toFixed(1);
    zoomValSpan.style.display = 'none';
    inlineZoomInput.style.display = '';
    inlineZoomInput.focus();
    inlineZoomInput.select();
  });

  inlineZoomInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') applyInlineZoom();
    if (e.key === 'Escape') {
      inlineZoomInput.style.display = 'none';
      zoomValSpan.style.display = '';
    }
  });
  inlineZoomInput.addEventListener('blur', applyInlineZoom);

  // ── 3. Action Buttons (always visible — work in all camera presets) ──
  // NOTE: These are appended to actionsDiv (not controlsDiv) so they
  // remain visible in 3D presets.  actionsDiv is added to the container
  // alongside refocusSection and gridDiv further below.
  const actionsDiv: HTMLDivElement = document.createElement('div');
  actionsDiv.append(createSubHeader('Actions'));

  const actionGroup: HTMLDivElement = document.createElement('div');
  actionGroup.className = 'btn-group';
  actionGroup.style.padding = '2px 0';

  const fitBtn: HTMLButtonElement = document.createElement('button');
  fitBtn.className = 'btn';
  fitBtn.textContent = 'Fit Map';
  fitBtn.title = 'Zoom to show the entire map';
  fitBtn.addEventListener('click', () => {
    refocusMap(cam, scene, debug);
  });

  const resetBtn: HTMLButtonElement = document.createElement('button');
  resetBtn.className = 'btn';
  resetBtn.textContent = 'Reset';
  resetBtn.title = 'Reset camera to preset defaults and fit map';
  resetBtn.addEventListener('click', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
    const resetFn = (window as any).resetCam as (() => void) | undefined;
    if (resetFn) resetFn();
  });

  const selBtn: HTMLButtonElement = document.createElement('button');
  selBtn.className = 'btn';
  selBtn.textContent = 'To Selection';
  selBtn.title = 'Zoom to fit the selected tile(s)';
  selBtn.disabled = _lastInspectX < 0 || _lastInspectZ < 0;
  selBtn.addEventListener('click', () => {
    const rect = getSelectionRect();
    if (rect) {
      const cx: number = (rect.minX + rect.maxX + 1) / 2;
      const cz: number = (rect.minZ + rect.maxZ + 1) / 2;
      const selW: number = rect.maxX - rect.minX + 1;
      const selH: number = rect.maxZ - rect.minZ + 1;
      if (_currentPreset === 'mapeditor') {
        // Zoom to fit selection but never past default zoom (RPG Maker MV standard)
        const aspect: number = scene.getEngine().getAspectRatio(cam);
        const selOrtho: number = Math.max((selH + 2) / 2, (selW + 2) / (2 * aspect));
        _orthoSize = Math.max(ORTHO_MIN, selOrtho, initialOrthoSize(scene));
        applyOrthoBounds(cam, scene);
        clampCameraToMap(cam, scene);
        updateScrollbars(cam, scene);
        navigateToTile(cx - 0.5, cz - 0.5, cam, scene);
      } else {
        cam.target.x = cx;
        cam.target.z = cz;
        // Zoom to fit the selection rectangle
        cam.radius = Math.max(
          cam.lowerRadiusLimit ?? 1,
          computeMinRadiusForMap(selW as Num, selH as Num, cam.fov as Num),
        );
      }
    } else if (_lastInspectX >= 0 && _lastInspectZ >= 0) {
      if (_currentPreset === 'mapeditor') {
        // Zoom to default level (RPG Maker MV standard) and center on tile
        _orthoSize = Math.max(ORTHO_MIN, initialOrthoSize(scene));
        applyOrthoBounds(cam, scene);
        clampCameraToMap(cam, scene);
        updateScrollbars(cam, scene);
        navigateToTile(_lastInspectX, _lastInspectZ, cam, scene);
      } else {
        cam.target.x = _lastInspectX + 0.5;
        cam.target.z = _lastInspectZ + 0.5;
        // Close-up on a single tile
        cam.radius = Math.max(cam.lowerRadiusLimit ?? 1, 15);
      }
    }
  });

  const centerBtn: HTMLButtonElement = document.createElement('button');
  centerBtn.className = 'btn';
  centerBtn.textContent = 'Center';
  centerBtn.title = 'Center on selected tile(s) (keep current zoom)';
  centerBtn.disabled = _lastInspectX < 0 || _lastInspectZ < 0;
  centerBtn.addEventListener('click', () => {
    const rect = getSelectionRect();
    if (rect) {
      const cx: number = (rect.minX + rect.maxX + 1) / 2;
      const cz: number = (rect.minZ + rect.maxZ + 1) / 2;
      if (_currentPreset === 'mapeditor') {
        navigateToTile(cx - 0.5, cz - 0.5, cam, scene);
      } else {
        cam.target.x = cx;
        cam.target.z = cz;
      }
    } else if (_lastInspectX >= 0 && _lastInspectZ >= 0) {
      if (_currentPreset === 'mapeditor') {
        navigateToTile(_lastInspectX, _lastInspectZ, cam, scene);
      } else {
        cam.target.x = _lastInspectX + 0.5;
        cam.target.z = _lastInspectZ + 0.5;
      }
    }
  });

  // Store refs for enabling when a tile is selected
  (window as Record<string, unknown>)._selBtn = selBtn;
  (window as Record<string, unknown>)._centerBtn = centerBtn;

  actionGroup.append(fitBtn, resetBtn, selBtn, centerBtn);
  actionsDiv.append(actionGroup);

  // Now that all always-visible sections are built, append everything
  container.append(actionsDiv, refocusSection, gridDiv, navDiv, fallbackDiv, controlsDiv);

  // ── 3b. View Toggles (always visible — grid works in all camera modes) ──
  gridDiv.append(createSubHeader('View'));

  const gridToggleRow: HTMLElement = createToggleRow(
    'Grid Overlay (G)',
    _gridVisible,
    () => {
      toggleGridOverlay(scene, debug);
    },
    'nav-grid-overlay',
    'Show tile grid lines over the map. Shortcut: G key.',
  );
  gridDiv.append(gridToggleRow);

  // Store grid toggle checkbox ref so G key can sync it
  const gridCheckbox = gridToggleRow.querySelector(
    'input[type="checkbox"]',
  ) as HTMLInputElement | null;
  if (gridCheckbox) {
    (window as Record<string, unknown>)._gridToggle = gridCheckbox;
  }

  gridDiv.append(
    createSliderRow(
      'Grid Opacity',
      0.05,
      1,
      0.05,
      _gridAlpha,
      (val: Num) => {
        _gridAlpha = val;
        updateGridAppearance();
      },
      'nav-grid-opacity',
      'Grid line transparency. 0.05 = faint, 1 = solid.',
    ),
  );
  gridDiv.append(
    createColorPickerRow(
      'Grid Color',
      GRID_COLOR_PRESETS,
      '#cccccc',
      (hex: string) => {
        _gridColor = BABYLON.Color3.FromHexString(hex);
        updateGridAppearance();
      },
      'nav-grid-color',
      'Pick a color for the grid overlay lines.',
    ),
  );
  gridDiv.append(
    createSliderRow(
      'Fill Opacity',
      0,
      1,
      0.05,
      _gridFillAlpha,
      (val: Num) => {
        _gridFillAlpha = val;
        updateGridFillAppearance();
      },
      'nav-fill-opacity',
      'Cell background fill opacity. 0 = no fill.',
    ),
  );
  gridDiv.append(
    createColorPickerRow(
      'Fill Color',
      GRID_COLOR_PRESETS,
      '#cccccc',
      (hex: string) => {
        _gridFillColor = BABYLON.Color3.FromHexString(hex);
        updateGridFillAppearance();
      },
      'nav-grid-fill-color',
      'Pick a color for the grid cell fill.',
    ),
  );

  // ── 4. Go To Tile (always visible — works in all camera presets) ──
  navDiv.append(createSubHeader('Go To Tile'));

  const gotoRow: HTMLDivElement = document.createElement('div');
  gotoRow.className = 'control-row';
  gotoRow.style.gap = '4px';
  gotoRow.style.alignItems = 'center';

  const xLabel: HTMLSpanElement = document.createElement('span');
  xLabel.className = 'control-label';
  xLabel.textContent = 'Row';
  xLabel.style.flex = 'none';
  xLabel.style.minWidth = 'auto';

  const xInput: HTMLInputElement = document.createElement('input');
  xInput.type = 'number';
  xInput.className = 'nav-input';
  xInput.min = '0';
  xInput.max = String(_mapHeight - 1);
  xInput.value = String(Math.floor(_mapHeight / 2));

  const zLabel: HTMLSpanElement = document.createElement('span');
  zLabel.className = 'control-label';
  zLabel.textContent = 'Col';
  zLabel.style.flex = 'none';
  zLabel.style.minWidth = 'auto';

  const zInput: HTMLInputElement = document.createElement('input');
  zInput.type = 'number';
  zInput.className = 'nav-input';
  zInput.min = '0';
  zInput.max = String(_mapWidth - 1);
  zInput.value = String(Math.floor(_mapWidth / 2));

  const goBtn: HTMLButtonElement = document.createElement('button');
  goBtn.className = 'btn';
  goBtn.textContent = 'Go';
  goBtn.style.marginLeft = 'auto';

  const doGoto = (): void => {
    const gx: number = Math.max(
      0,
      Math.min(_mapHeight - 1, Number.parseInt(xInput.value, 10) || 0),
    );
    const gz: number = Math.max(0, Math.min(_mapWidth - 1, Number.parseInt(zInput.value, 10) || 0));
    if (_currentPreset === 'mapeditor') {
      navigateToTile(gx, gz, cam, scene);
    } else {
      cam.target.x = gx + 0.5;
      cam.target.z = gz + 0.5;
    }
  };

  goBtn.addEventListener('click', doGoto);
  xInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') doGoto();
  });
  zInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') doGoto();
  });

  gotoRow.append(zLabel, zInput, xLabel, xInput, goBtn);
  navDiv.append(gotoRow);

  // ── 5. Live Readout (always visible) ──
  navDiv.append(createSubHeader('Camera Position'));

  const navTargetX = makeNavReadout('Tile Row', 'nav-target-x');
  navTargetX.title = 'Camera target tile row (vertical axis).';
  navDiv.append(navTargetX);
  const navTargetZ = makeNavReadout('Tile Col', 'nav-target-z');
  navTargetZ.title = 'Camera target tile column (horizontal axis).';
  navDiv.append(navTargetZ);
  const navZoomReadout = makeNavReadout('Zoom', 'nav-zoom-readout');
  navZoomReadout.title = 'Current zoom multiplier.';
  navDiv.append(navZoomReadout);

  // ── 6. Per-frame readout update ──
  let navFrameCount = 0;
  scene.registerAfterRender(() => {
    navFrameCount++;
    if (navFrameCount % 6 !== 0) return;
    const section: Element | null = document.querySelector('#section-camera-nav');
    if (section?.classList.contains('collapsed')) return;

    // Update position readout (works in all presets)
    setInfoText('nav-target-x', cam.target.x.toFixed(1));
    setInfoText('nav-target-z', cam.target.z.toFixed(1));

    // Zoom readout and slider sync (ortho only)
    const zoomMult: number = _currentPreset === 'mapeditor' ? getZoomMultiplier() : 0;
    if (_currentPreset === 'mapeditor') {
      setInfoText('nav-zoom-readout', `${zoomMult.toFixed(1)}x`);

      // Sync zoom slider (handles external zoom changes from wheel/keyboard)
      zoomSlider.value = String(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomMult)).toFixed(1));
      // Only update span when inline input is NOT visible (avoid overwriting user input)
      if (inlineZoomInput.style.display === 'none') {
        zoomValSpan.textContent = `${zoomMult.toFixed(1)}x`;
      }
    }

    // Update active zoom button highlight
    for (const btn of zoomButtons) {
      const btnMult: number = Number.parseFloat(btn.dataset['zoom'] ?? '0');
      const isActive: boolean = Math.abs(zoomMult - btnMult) < 0.05;
      btn.classList.toggle('active', isActive);
    }
  });
}

/**
 * Truncates text with ellipsis.
 *
 * @param text - Input text.
 * @param maxLen - Maximum length.
 * @returns Truncated text.
 */
function truncateText(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

/**
 * Formats a large number with k/M suffix.
 *
 * @param n - The number.
 * @returns Formatted string.
 */
function formatLargeNumber(n: number): string {
  if (!Number.isFinite(n)) return '?';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

// =============================================================================
// Sky / Background UI Builder
// =============================================================================

/**
 * Converts a direction vector to azimuth (0-360°) and elevation (0-90°).
 *
 * @param dir - The direction vector.
 * @returns Azimuth and elevation in degrees.
 */
function dirToAngles(dir: BABYLON.Vector3): { azimuth: number; elevation: number } {
  const elevation = Math.asin(Math.abs(dir.y)) * (180 / Math.PI);
  const azimuth = (Math.atan2(dir.x, dir.z) * (180 / Math.PI) + 360) % 360;
  return { azimuth, elevation };
}

/**
 * Builds sky and parallax background controls.
 *
 * @param debug - Debug API reference.
 * @param scene - The Babylon.js scene.
 */
function buildSkyUI(debug: DevDebugApi, scene: BABYLON.Scene): void {
  const container = document.querySelector('#sky-body') as HTMLElement | null;
  if (!container) return;
  container.innerHTML = '';

  // ── Sky sub-section ──
  const skyGroup = createCollapsibleGroup('Sky', false);

  // Sky type dropdown — disposes old sky and rebuilds with selected type
  const skyConfig = debug.tilemap?.sky;
  const currentType = skyConfig ? 'gradient' : 'color';
  skyGroup.body.append(
    createDropdown(
      'Type',
      [
        { value: 'color', label: 'Solid Color' },
        { value: 'gradient', label: 'Vertical Gradient' },
        { value: 'skybox', label: 'Cubemap Skybox' },
        { value: 'procedural', label: 'Procedural Atmosphere' },
        { value: 'panorama', label: 'Panoramic Image' },
        { value: 'hdri', label: 'HDR Environment' },
      ],
      currentType,
      (val) => {
        const { tilemap } = debug;
        if (!tilemap) return;
        // Dispose old sky
        if (tilemap.sky) {
          disposeSky({ sky: tilemap.sky });
        }
        // Build new sky config from current scene state + selected type
        const cc = scene.clearColor;
        const newConfig = {
          type: val,
          color: { r: cc.r, g: cc.g, b: cc.b, a: cc.a },
          gradient: [
            { position: 0, color: { r: 0.1, g: 0.1, b: 0.3, a: 1 } },
            { position: 1, color: { r: 0.5, g: 0.3, b: 0.5, a: 1 } },
          ],
          skyboxSize: 1000,
          skyboxPath: 'sky/skybox/skybox',
          panoramaPath: 'sky/panorama.jpg',
          hdriPath: 'sky/environment.hdr',
          turbidity: 10,
          rayleigh: 2,
          luminance: 1,
          mieCoefficient: 0.005,
          mieDirectionalG: 0.8,
          inclination: 0.49,
          azimuth: 0.25,
          parallaxLayers: [],
        };
        const result = createSky({ scene, config: newConfig });
        if (result.ok) {
          (tilemap as Record<string, unknown>)['sky'] = result.data;
        }
      },
      'sky-type',
      'Background rendering method. Solid, gradient, skybox, procedural, panorama, or HDR.',
    ),
  );

  // Sky texture path indicator — shows what asset is loaded for the current sky type
  const skyTexturePath = (() => {
    const type: string = currentType;
    if (type === 'panorama') return 'sky/panorama.jpg';
    if (type === 'hdri') return 'sky/environment.hdr';
    if (type === 'skybox') return 'sky/skybox/skybox';
    return '';
  })();
  if (skyTexturePath) {
    const pathRow = document.createElement('div');
    pathRow.className = 'control-row';
    pathRow.style.opacity = '0.6';
    const pathLabel = document.createElement('span');
    pathLabel.className = 'control-label';
    pathLabel.textContent = 'Texture';
    const pathValue = document.createElement('span');
    pathValue.className = 'control-value';
    pathValue.style.cssText =
      'font-size: 8px; color: #8ab; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    pathValue.textContent = skyTexturePath;
    pathValue.title = skyTexturePath;
    pathRow.append(pathLabel, pathValue);
    skyGroup.body.append(pathRow);
  }

  // Clear color RGBA sliders — always useful
  const cc = scene.clearColor;
  skyGroup.body.append(
    createSliderRow(
      'BG Color R',
      0,
      1,
      0.01,
      cc.r,
      (v) => {
        scene.clearColor.r = v;
      },
      'sky-clear-r',
      'Red channel of the scene background color (0–1).',
    ),
  );
  skyGroup.body.append(
    createSliderRow(
      'BG Color G',
      0,
      1,
      0.01,
      cc.g,
      (v) => {
        scene.clearColor.g = v;
      },
      'sky-clear-g',
      'Green channel of the scene background color (0–1).',
    ),
  );
  skyGroup.body.append(
    createSliderRow(
      'BG Color B',
      0,
      1,
      0.01,
      cc.b,
      (v) => {
        scene.clearColor.b = v;
      },
      'sky-clear-b',
      'Blue channel of the scene background color (0–1).',
    ),
  );
  skyGroup.body.append(
    createSliderRow(
      'BG Color A',
      0,
      1,
      0.01,
      cc.a,
      (v) => {
        scene.clearColor.a = v;
      },
      'sky-clear-a',
      'Alpha of the scene background. 0 = transparent, 1 = opaque.',
    ),
  );
  container.append(skyGroup.root);

  // ── Sun sub-section — alias to directional light ("sun") ──
  const sunLight = scene.getLightByName('sun') as BABYLON.DirectionalLight | null;
  if (sunLight) {
    const sunGroup = createCollapsibleGroup('Sun', true);

    const angles = dirToAngles(sunLight.direction);

    sunGroup.body.append(
      createSliderRow(
        'Azimuth',
        0,
        360,
        1,
        angles.azimuth,
        (v) => {
          const el = Math.asin(Math.abs(sunLight.direction.y)) * (180 / Math.PI);
          const rad = (v * Math.PI) / 180;
          const elRad = (el * Math.PI) / 180;
          sunLight.direction.x = Math.sin(rad) * Math.cos(elRad);
          sunLight.direction.z = Math.cos(rad) * Math.cos(elRad);
          sunLight.direction.y = -Math.sin(elRad);
        },
        'sun-azimuth',
        'Compass bearing of the sun (0–360). 0 = north, 90 = east.',
      ),
    );

    sunGroup.body.append(
      createSliderRow(
        'Elevation',
        5,
        90,
        1,
        angles.elevation,
        (v) => {
          const az = Math.atan2(sunLight.direction.x, sunLight.direction.z);
          const elRad = (v * Math.PI) / 180;
          sunLight.direction.x = Math.sin(az) * Math.cos(elRad);
          sunLight.direction.z = Math.cos(az) * Math.cos(elRad);
          sunLight.direction.y = -Math.sin(elRad);
        },
        'sun-elevation',
        'Angle of the sun above the horizon (5–90 degrees).',
      ),
    );

    sunGroup.body.append(
      createSliderRow(
        'Intensity',
        0,
        3,
        0.05,
        sunLight.intensity,
        (v) => {
          sunLight.intensity = v;
        },
        'sun-intensity',
        'Brightness of the directional sunlight.',
      ),
    );

    // Sun color
    const sunDiffuse = sunLight.diffuse;
    sunGroup.body.append(
      createSliderRow(
        'Color R',
        0,
        1,
        0.01,
        sunDiffuse.r,
        (v) => {
          sunDiffuse.r = v;
        },
        'sun-color-r',
        'Red channel of the sunlight diffuse color.',
      ),
    );
    sunGroup.body.append(
      createSliderRow(
        'Color G',
        0,
        1,
        0.01,
        sunDiffuse.g,
        (v) => {
          sunDiffuse.g = v;
        },
        'sun-color-g',
        'Green channel of the sunlight diffuse color.',
      ),
    );
    sunGroup.body.append(
      createSliderRow(
        'Color B',
        0,
        1,
        0.01,
        sunDiffuse.b,
        (v) => {
          sunDiffuse.b = v;
        },
        'sun-color-b',
        'Blue channel of the sunlight diffuse color.',
      ),
    );
    container.append(sunGroup.root);
  }

  // ── Procedural sky controls ──
  const skyInstance: SkyInstance | undefined = debug.tilemap?.sky;
  if (skyInstance?.skyboxMaterial instanceof SkyMaterial) {
    const proSkyGroup = createCollapsibleGroup('Procedural Sky', true);
    const skyMat: SkyMaterial = skyInstance.skyboxMaterial;

    proSkyGroup.body.append(
      createSliderRow(
        'Mie Coefficient',
        0,
        0.1,
        0.001,
        skyMat.mieCoefficient,
        (v) => {
          skyMat.mieCoefficient = v;
        },
        'sky-mie-coeff',
        'Mie scattering coefficient. Higher = more haze around the sun.',
      ),
    );
    proSkyGroup.body.append(
      createSliderRow(
        'Mie Directional G',
        0,
        1,
        0.01,
        skyMat.mieDirectionalG,
        (v) => {
          skyMat.mieDirectionalG = v;
        },
        'sky-mie-dir-g',
        'Mie anisotropy. 0 = uniform scatter, 1 = strong forward scatter.',
      ),
    );
    proSkyGroup.body.append(
      createSliderRow(
        'Inclination',
        0,
        0.5,
        0.01,
        skyMat.inclination,
        (v) => {
          skyMat.inclination = v;
        },
        'sky-inclination',
        'Sun vertical position (0 = horizon, 0.5 = zenith).',
      ),
    );
    proSkyGroup.body.append(
      createSliderRow(
        'Azimuth',
        0,
        1,
        0.01,
        skyMat.azimuth,
        (v) => {
          skyMat.azimuth = v;
        },
        'sky-azimuth',
        'Sun horizontal rotation in the procedural sky (0–1 = full circle).',
      ),
    );
    container.append(proSkyGroup.root);
  }

  // ── Stars controls ──
  if (skyInstance) {
    const starsGroup = createCollapsibleGroup('Stars', true);

    // Stars texture path indicator
    const starTexPath = skyInstance.starLayer?.texture?.name ?? 'sky/stars.png';
    const starPathRow = document.createElement('div');
    starPathRow.className = 'control-row';
    starPathRow.style.opacity = '0.6';
    const starPathLabel = document.createElement('span');
    starPathLabel.className = 'control-label';
    starPathLabel.textContent = 'Texture';
    const starPathValue = document.createElement('span');
    starPathValue.className = 'control-value';
    starPathValue.style.cssText =
      'font-size: 8px; color: #8ab; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    starPathValue.textContent = starTexPath;
    starPathValue.title = starTexPath;
    starPathRow.append(starPathLabel, starPathValue);
    starsGroup.body.append(starPathRow);

    starsGroup.body.append(
      createToggleRow(
        'Enabled',
        skyInstance.starLayer !== null,
        (on) => {
          if (skyInstance.starLayer) {
            skyInstance.starLayer.isEnabled = on;
          }
        },
        'sky-stars-enabled',
        'Show or hide the star field layer.',
      ),
    );

    starsGroup.body.append(
      createSliderRow(
        'Opacity',
        0,
        1,
        0.01,
        skyInstance.starLayer?.color?.a ?? 0,
        (v) => {
          if (skyInstance.starLayer) {
            skyInstance.starLayer.color = new BABYLON.Color4(1, 1, 1, v);
          }
        },
        'sky-stars-opacity',
        'Star field transparency. 0 = invisible, 1 = fully opaque.',
      ),
    );

    // Scale — directly adjusts texture UV scale
    const starTex = skyInstance.starLayer?.texture;
    const starScale = starTex && starTex instanceof BABYLON.Texture ? 1 / starTex.uScale : 2;
    starsGroup.body.append(
      createSliderRow(
        'Scale',
        0.1,
        10,
        0.1,
        starScale,
        (v) => {
          const tex = skyInstance.starLayer?.texture;
          if (tex && tex instanceof BABYLON.Texture) {
            tex.uScale = 1 / v;
            tex.vScale = 1 / v;
          }
        },
        'sky-stars-scale',
        'Star texture scale. Higher = smaller, denser stars.',
      ),
    );

    // Twinkle Speed (read-only indicator — baked into observer closure)
    starsGroup.body.append(
      createSliderRow(
        'Twinkle Speed',
        0,
        5,
        0.1,
        1,
        () => {
          // Twinkle speed is baked into the observer closure at creation time.
          // Changing this requires recreating the star field.
        },
        'sky-stars-twinkle',
        'Twinkle speed. Read-only; baked at creation time.',
      ),
    );

    // Fade In Hour (read-only indicator — baked into observer closure)
    starsGroup.body.append(
      createSliderRow(
        'Fade In Hour',
        0,
        24,
        0.5,
        18,
        () => {
          // Fade-in time is baked into the observer closure at creation time.
        },
        'sky-stars-fade-in',
        'Hour when stars begin fading in (24h). Read-only.',
      ),
    );

    // Fade Out Hour (read-only indicator — baked into observer closure)
    starsGroup.body.append(
      createSliderRow(
        'Fade Out Hour',
        0,
        24,
        0.5,
        6,
        () => {
          // Fade-out time is baked into the observer closure at creation time.
        },
        'sky-stars-fade-out',
        'Hour when stars finish fading out (24h). Read-only.',
      ),
    );
    container.append(starsGroup.root);
  }

  // ── Parallax sub-section ──
  const parallax: ParallaxInstance | undefined = debug.tilemap?.parallax;
  if (parallax && parallax.layers.length > 0) {
    const parallaxGroup = createCollapsibleGroup('Parallax Layers', true);

    // Container for dynamically-rebuilt layer sub-sections
    const layerContainer = document.createElement('div');
    layerContainer.dataset['parallaxLayers'] = 'true';
    parallaxGroup.body.append(layerContainer);

    // Rebuilds the parallax layer controls after add/remove layer.
    const rebuildParallaxControls = (): void => {
      layerContainer.innerHTML = '';
      buildParallaxLayerRows(parallax, layerContainer);
    };

    buildParallaxLayerRows(parallax, layerContainer);

    // Add / Remove layer buttons
    const btnRow = document.createElement('div');
    btnRow.className = 'btn-group';
    btnRow.style.padding = '6px 0';

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-wide';
    addBtn.textContent = 'Add Layer';
    addBtn.addEventListener('click', () => {
      const layerResult = addParallaxLayer({
        parallax,
        assetBasePath: '/',
        layer: {
          imagePath: 'bg/mountains.png',
          scrollSpeedX: 0.1,
          scrollSpeedY: 0,
          opacity: 0.8,
          scale: 1,
          depth: parallax.layers.length,
          layerType: 'background',
          autoScrollX: 0.05,
          autoScrollY: 0,
          blendMode: 'alpha',
          tint: { r: 1, g: 1, b: 1, a: 1 },
          tileX: true,
          tileY: false,
          offsetY: 0,
        },
      });
      if (layerResult.ok) rebuildParallaxControls();
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-wide btn-danger';
    removeBtn.textContent = 'Remove Last';
    removeBtn.addEventListener('click', () => {
      if (parallax.layers.length === 0) return;
      const idx = parallax.layers.length - 1;
      const removeResult = removeParallaxLayer({ parallax, index: idx as Num });
      if (removeResult.ok) rebuildParallaxControls();
    });

    btnRow.append(addBtn, removeBtn);
    parallaxGroup.body.append(btnRow);
    container.append(parallaxGroup.root);
  }
}

/**
 * Builds per-layer parallax control rows, each in a collapsible sub-section.
 *
 * @param parallax - Parallax instance.
 * @param container - Container element to append rows into.
 */
function buildParallaxLayerRows(parallax: ParallaxInstance, container: HTMLElement): void {
  for (let i = 0; i < parallax.layers.length; i++) {
    const layer = parallax.layers[i];
    const bgLayer = parallax.bgLayers[i];
    if (!layer || !bgLayer) continue;

    const shortPath =
      layer.imagePath.length > 20 ? `...${layer.imagePath.slice(-17)}` : layer.imagePath;
    const layerType: string = layer.layerType ?? 'background';

    // Collapsible sub-section per layer (collapsed by default)
    const section = document.createElement('div');
    section.className = 'section collapsed';
    section.style.borderBottom = 'none';

    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'section-header';
    sectionHeader.style.padding = '5px 4px';
    sectionHeader.style.fontSize = '9px';
    sectionHeader.innerHTML = `<span>${String(i)}: ${shortPath} <span style="color:#666">(${layerType})</span></span><span class="panel-toggle">\u25BC</span>`;
    sectionHeader.addEventListener('click', () => {
      section.classList.toggle('collapsed');
    });

    const sectionBody = document.createElement('div');
    sectionBody.className = 'section-body';
    sectionBody.style.padding = '2px 4px 6px';

    // Visibility toggle
    sectionBody.append(
      createToggleRow(
        'Visible',
        bgLayer.isEnabled,
        (on) => {
          bgLayer.isEnabled = on;
        },
        `parallax-${String(i)}-visible`,
      ),
    );

    // Opacity slider
    sectionBody.append(
      createSliderRow(
        'Opacity',
        0,
        1,
        0.01,
        layer.opacity,
        (v) => {
          bgLayer.color = new BABYLON.Color4(
            layer.tint?.r ?? 1,
            layer.tint?.g ?? 1,
            layer.tint?.b ?? 1,
            v,
          );
          layer.opacity = v;
        },
        `parallax-${String(i)}-opacity`,
      ),
    );

    // Scroll Speed X
    sectionBody.append(
      createSliderRow(
        'Scroll X',
        -2,
        2,
        0.05,
        layer.scrollSpeedX,
        (v) => {
          layer.scrollSpeedX = v;
        },
        `parallax-${String(i)}-speed-x`,
      ),
    );

    // Scroll Speed Y
    sectionBody.append(
      createSliderRow(
        'Scroll Y',
        -2,
        2,
        0.05,
        layer.scrollSpeedY,
        (v) => {
          layer.scrollSpeedY = v;
        },
        `parallax-${String(i)}-speed-y`,
      ),
    );

    // Auto-Scroll X
    sectionBody.append(
      createSliderRow(
        'Auto-Scroll X',
        -2,
        2,
        0.01,
        layer.autoScrollX ?? 0,
        (v) => {
          layer.autoScrollX = v;
        },
        `parallax-${String(i)}-autoscroll-x`,
      ),
    );

    // Auto-Scroll Y
    sectionBody.append(
      createSliderRow(
        'Auto-Scroll Y',
        -2,
        2,
        0.01,
        layer.autoScrollY ?? 0,
        (v) => {
          layer.autoScrollY = v;
        },
        `parallax-${String(i)}-autoscroll-y`,
      ),
    );

    // Scale
    sectionBody.append(
      createSliderRow(
        'Scale',
        0.1,
        10,
        0.1,
        layer.scale,
        (v) => {
          layer.scale = v;
          const tex = bgLayer.texture;
          if (tex && tex instanceof BABYLON.Texture) {
            tex.uScale = 1 / v;
            tex.vScale = 1 / v;
          }
        },
        `parallax-${String(i)}-scale`,
      ),
    );

    // Blend mode dropdown
    sectionBody.append(
      createDropdown(
        'Blend Mode',
        [
          { value: 'alpha', label: 'Alpha Blend' },
          { value: 'additive', label: 'Additive' },
          { value: 'multiply', label: 'Multiply' },
          { value: 'subtract', label: 'Subtract' },
          { value: 'screen', label: 'Screen' },
          { value: 'maximized', label: 'Maximized' },
          { value: 'oneone', label: 'One-One (No Alpha)' },
          { value: 'premultiplied', label: 'Pre-Multiplied' },
        ],
        layer.blendMode ?? 'alpha',
        (val) => {
          layer.blendMode = val;
          bgLayer.alphaBlendingMode = mapBlendMode(val);
        },
        `parallax-${String(i)}-blend`,
      ),
    );

    // Tile X toggle
    sectionBody.append(
      createToggleRow(
        'Tile X',
        layer.tileX ?? true,
        (on) => {
          layer.tileX = on;
          if (bgLayer.texture) {
            bgLayer.texture.wrapU = on
              ? BABYLON.Texture.WRAP_ADDRESSMODE
              : BABYLON.Texture.CLAMP_ADDRESSMODE;
          }
        },
        `parallax-${String(i)}-tile-x`,
      ),
    );

    // Tile Y toggle
    sectionBody.append(
      createToggleRow(
        'Tile Y',
        layer.tileY ?? false,
        (on) => {
          layer.tileY = on;
          if (bgLayer.texture) {
            bgLayer.texture.wrapV = on
              ? BABYLON.Texture.WRAP_ADDRESSMODE
              : BABYLON.Texture.CLAMP_ADDRESSMODE;
          }
        },
        `parallax-${String(i)}-tile-y`,
      ),
    );

    // Tint R/G/B sliders
    const tint = layer.tint ?? { r: 1, g: 1, b: 1, a: 1 };
    sectionBody.append(
      createSliderRow(
        'Tint R',
        0,
        1,
        0.01,
        tint.r,
        (v) => {
          const newTint: ColorRgba = {
            r: v,
            g: layer.tint?.g ?? 1,
            b: layer.tint?.b ?? 1,
            a: layer.tint?.a ?? 1,
          };
          setParallaxLayerTint({ parallax, index: i as Num, tint: newTint });
        },
        `parallax-${String(i)}-tint-r`,
      ),
    );
    sectionBody.append(
      createSliderRow(
        'Tint G',
        0,
        1,
        0.01,
        tint.g,
        (v) => {
          const newTint: ColorRgba = {
            r: layer.tint?.r ?? 1,
            g: v,
            b: layer.tint?.b ?? 1,
            a: layer.tint?.a ?? 1,
          };
          setParallaxLayerTint({ parallax, index: i as Num, tint: newTint });
        },
        `parallax-${String(i)}-tint-g`,
      ),
    );
    sectionBody.append(
      createSliderRow(
        'Tint B',
        0,
        1,
        0.01,
        tint.b,
        (v) => {
          const newTint: ColorRgba = {
            r: layer.tint?.r ?? 1,
            g: layer.tint?.g ?? 1,
            b: v,
            a: layer.tint?.a ?? 1,
          };
          setParallaxLayerTint({ parallax, index: i as Num, tint: newTint });
        },
        `parallax-${String(i)}-tint-b`,
      ),
    );

    // Fade Out button
    const fadeOutBtn = document.createElement('button');
    fadeOutBtn.className = 'btn';
    fadeOutBtn.textContent = 'Fade Out';
    fadeOutBtn.title = 'Fade opacity to 0 over 1 second';
    fadeOutBtn.addEventListener('click', () => {
      fadeLayerOpacity({
        parallax,
        index: i as Num,
        target: 0 as Num,
        durationMs: 1000 as Num,
      });
    });

    // Fade In button
    const fadeInBtn = document.createElement('button');
    fadeInBtn.className = 'btn';
    fadeInBtn.textContent = 'Fade In';
    fadeInBtn.title = 'Fade opacity to 1 over 1 second';
    fadeInBtn.addEventListener('click', () => {
      fadeLayerOpacity({
        parallax,
        index: i as Num,
        target: 1 as Num,
        durationMs: 1000 as Num,
      });
    });

    const fadeRow = document.createElement('div');
    fadeRow.className = 'btn-group';
    fadeRow.append(fadeOutBtn, fadeInBtn);
    sectionBody.append(fadeRow);

    section.append(sectionHeader, sectionBody);
    container.append(section);
  }
}

// =============================================================================
// FPS Counter
// =============================================================================

/**
 * Sets up the real-time FPS counter in the toolbar.
 *
 * @param runtime - The runtime instance.
 */
function setupFpsCounter(runtime: RuntimeInstance): void {
  const fpsEl = document.querySelector('#fps-display');
  const ftEl = document.querySelector('#frametime-display');
  const meshEl = document.querySelector('#meshes-display');
  const trisEl = document.querySelector('#tris-display');
  const sparkCanvas = document.querySelector('#fps-sparkline') as HTMLCanvasElement | null;
  const sparkCtx = sparkCanvas?.getContext('2d') ?? null;

  // Handle Retina DPI
  if (sparkCanvas && sparkCtx) {
    const dpr = window.devicePixelRatio || 1;
    sparkCanvas.width = 60 * dpr;
    sparkCanvas.height = 14 * dpr;
    sparkCanvas.style.width = '60px';
    sparkCanvas.style.height = '14px';
    sparkCtx.scale(dpr, dpr);
  }

  const SPARK_SIZE = 60;
  const fpsSamples: number[] = Array.from<number>({ length: SPARK_SIZE }).fill(0);
  let sparkIdx = 0;

  let fpsFrameCount = 0;
  runtime.engine.scene.registerAfterRender(() => {
    fpsFrameCount++;
    if (fpsFrameCount % 30 !== 0) return;

    const engine = runtime.engine.scene.getEngine();
    const fps = engine.getFps();
    const fpsRound = Math.round(fps);

    if (fpsEl) {
      fpsEl.textContent = `${fpsRound} fps`;
      if (fps >= 55) {
        fpsEl.className = 'fps-green';
      } else if (fps >= 30) {
        fpsEl.className = 'fps-yellow';
      } else {
        fpsEl.className = 'fps-red';
      }
    }
    if (ftEl) ftEl.textContent = `${(1000 / Math.max(fps, 1)).toFixed(1)} ms`;
    const { scene } = runtime.engine;
    if (meshEl) meshEl.textContent = `${scene.getActiveMeshes().length} meshes`;
    if (trisEl) {
      const triCount = Math.round(scene.totalVerticesPerfCounter.current / 3);
      trisEl.textContent = `${formatLargeNumber(triCount)} tris`;
    }

    // Sparkline
    fpsSamples[sparkIdx % SPARK_SIZE] = fpsRound;
    sparkIdx++;
    if (sparkCtx && sparkCanvas) {
      const w = 60;
      const h = 14;
      sparkCtx.clearRect(0, 0, w, h);
      const maxFps = 120;
      const barW = w / SPARK_SIZE;
      for (let i = 0; i < SPARK_SIZE; i++) {
        const sampleIdx = (sparkIdx + i) % SPARK_SIZE;
        const val = fpsSamples[sampleIdx] ?? 0;
        const barH = Math.min((val / maxFps) * h, h);
        if (val >= 55) {
          sparkCtx.fillStyle = 'rgba(160,208,160,0.7)';
        } else if (val >= 30) {
          sparkCtx.fillStyle = 'rgba(208,208,160,0.7)';
        } else {
          sparkCtx.fillStyle = 'rgba(208,160,160,0.7)';
        }
        sparkCtx.fillRect(i * barW, h - barH, barW - 0.5, barH);
      }
    }
  });
}

// =============================================================================
// Map Editor Camera Controls
// =============================================================================

/**
 * Recalculates orthographic bounds from `_orthoSize` with aspect ratio correction.
 *
 * @param cam - The ArcRotateCamera in orthographic mode.
 * @param scene - The active Babylon scene.
 */
function applyOrthoBounds(cam: BABYLON.ArcRotateCamera, scene: BABYLON.Scene): void {
  const halfHeight: number = _orthoSize;
  const aspect: number = scene.getEngine().getAspectRatio(cam);
  const halfWidth: number = halfHeight * aspect;
  cam.orthoLeft = -halfWidth;
  cam.orthoRight = halfWidth;
  cam.orthoTop = halfHeight;
  cam.orthoBottom = -halfHeight;
}

/**
 * Clamps the camera target so the viewport stays within map bounds.
 *
 * @param cam - The ArcRotateCamera.
 * @param scene - The active Babylon scene.
 */
function clampCameraToMap(cam: BABYLON.ArcRotateCamera, scene: BABYLON.Scene): void {
  const aspect: number = scene.getEngine().getAspectRatio(cam);
  const halfW: number = _orthoSize * aspect;
  const halfH: number = _orthoSize;

  // Screen vertical = X axis (halfH → _mapHeight), screen horizontal = Z axis (halfW → _mapWidth)
  const minX: number = MAP_MIN + halfH;
  const maxX: number = _mapHeight - halfH;
  const minZ: number = MAP_MIN + halfW;
  const maxZ: number = _mapWidth - halfW;

  if (minX < maxX) {
    cam.target.x = Math.max(minX, Math.min(maxX, cam.target.x));
  } else {
    cam.target.x = _mapHeight / 2;
  }
  if (minZ < maxZ) {
    cam.target.z = Math.max(minZ, Math.min(maxZ, cam.target.z));
  } else {
    cam.target.z = _mapWidth / 2;
  }
}

// =============================================================================
// Scrollbar Settings UI
// =============================================================================

/** Theme presets: name → { color, hover, active } as CSS rgba strings. */
const SB_THEMES: Record<string, { color: string; hover: string; active: string }> = {
  default: {
    color: 'rgba(180,180,180,0.6)',
    hover: 'rgba(200,200,200,0.85)',
    active: 'rgba(220,220,220,0.9)',
  },
  macos: {
    color: 'rgba(100,100,100,0.45)',
    hover: 'rgba(120,120,120,0.7)',
    active: 'rgba(140,140,140,0.85)',
  },
  vscode: {
    color: 'rgba(121,121,121,0.4)',
    hover: 'rgba(100,100,100,0.7)',
    active: 'rgba(80,80,80,0.9)',
  },
  sublime: {
    color: 'rgba(190,170,140,0.4)',
    hover: 'rgba(200,180,150,0.65)',
    active: 'rgba(210,190,160,0.85)',
  },
  github: {
    color: 'rgba(110,119,129,0.4)',
    hover: 'rgba(110,119,129,0.65)',
    active: 'rgba(110,119,129,0.85)',
  },
  discord: {
    color: 'rgba(32,34,37,0.7)',
    hover: 'rgba(42,44,47,0.85)',
    active: 'rgba(52,54,57,0.95)',
  },
  spotify: {
    color: 'rgba(30,215,96,0.45)',
    hover: 'rgba(30,215,96,0.7)',
    active: 'rgba(30,215,96,0.9)',
  },
  figma: {
    color: 'rgba(255,255,255,0.35)',
    hover: 'rgba(255,255,255,0.6)',
    active: 'rgba(255,255,255,0.85)',
  },
};

/**
 * Applies a scrollbar theme by setting CSS custom properties.
 *
 * @param theme - Theme key from SB_THEMES.
 */
function applySbTheme(theme: string): void {
  const t = SB_THEMES[theme];
  if (!t) return;
  const root: HTMLElement = document.documentElement;
  root.style.setProperty('--sb-color', t.color);
  root.style.setProperty('--sb-color-hover', t.hover);
  root.style.setProperty('--sb-color-active', t.active);
}

/**
 * Builds the scrollbar settings UI section.
 */
function buildScrollbarUI(): void {
  const container = document.querySelector('#scrollbar-body') as HTMLElement | null;
  if (!container) return;
  container.innerHTML = '';

  // ── Visibility mode ──
  container.append(
    createDropdown(
      'Visibility',
      [
        { value: 'auto', label: 'Auto' },
        { value: 'always', label: 'Always' },
        { value: 'never', label: 'Never' },
      ],
      _sbVisibility,
      (val: string) => {
        _sbVisibility = val as 'auto' | 'always' | 'never';
        // Clean up stale visible class when switching away from "always"
        const hb: HTMLElement | null = document.querySelector('#scrollbar-h');
        const vb: HTMLElement | null = document.querySelector('#scrollbar-v');
        const cn: HTMLElement | null = document.querySelector('#scrollbar-corner');
        if (val !== 'always') {
          hb?.classList.remove('visible');
          vb?.classList.remove('visible');
          cn?.classList.remove('visible');
        }
        if (_sbFlashTimer) {
          clearTimeout(_sbFlashTimer);
          _sbFlashTimer = null;
        }
      },
      'sb-visibility',
      'Auto: show on scroll/hover. Always: permanently visible. Never: hidden.',
    ),
  );

  let currentTheme = 'default';

  // ── Theme dropdown ──
  const themeLabels: Record<string, string> = {
    default: 'Default',
    macos: 'macOS',
    vscode: 'VS Code',
    sublime: 'Sublime',
    github: 'GitHub',
    discord: 'Discord',
    spotify: 'Spotify',
    figma: 'Figma',
  };
  container.append(
    createDropdown(
      'Theme',
      Object.keys(SB_THEMES).map((k: string) => ({
        value: k,
        label: themeLabels[k] ?? k,
      })),
      currentTheme,
      (val: string) => {
        currentTheme = val;
        applySbTheme(val);
      },
      'sb-theme',
      'Color theme for scrollbar thumb',
    ),
  );

  // ── Custom Color ──
  const SB_COLOR_PRESETS: readonly ColorPreset[] = [
    { name: 'Gray', hex: '#b4b4b4' },
    { name: 'Cyan', hex: '#50c8c8' },
    { name: 'Green', hex: '#80c850' },
    { name: 'Orange', hex: '#ff8040' },
    { name: 'Blue', hex: '#5090e0' },
    { name: 'Purple', hex: '#a070d0' },
  ];
  container.append(
    createColorPickerRow(
      'Custom Color',
      SB_COLOR_PRESETS,
      '#b4b4b4',
      (hex: string) => {
        // Convert hex to rgba with 0.6 opacity for color, 0.85 for hover, 0.9 for active
        const r: number = Number.parseInt(hex.slice(1, 3), 16);
        const g: number = Number.parseInt(hex.slice(3, 5), 16);
        const b: number = Number.parseInt(hex.slice(5, 7), 16);
        const root: HTMLElement = document.documentElement;
        root.style.setProperty('--sb-color', `rgba(${String(r)},${String(g)},${String(b)},0.6)`);
        root.style.setProperty(
          '--sb-color-hover',
          `rgba(${String(r)},${String(g)},${String(b)},0.85)`,
        );
        root.style.setProperty(
          '--sb-color-active',
          `rgba(${String(r)},${String(g)},${String(b)},0.9)`,
        );
      },
      'sb-custom-color',
      'Override theme with a custom thumb color',
    ),
  );

  // ── Hover Size slider ──
  container.append(
    createSliderRow(
      'Hover Size',
      8,
      24,
      1,
      12,
      (val: number) => {
        document.documentElement.style.setProperty('--sb-hover-size', `${String(val)}px`);
      },
      'sb-hover-size',
      'Thumb thickness when hovered (px)',
    ),
  );

  // ── Show Delay slider (CSS transition-delay for hover reveal) ──
  container.append(
    createSliderRow(
      'Show Delay',
      0,
      1,
      0.05,
      0.35,
      (val: number) => {
        document.documentElement.style.setProperty('--sb-show-delay', `${String(val)}s`);
      },
      'sb-show-delay',
      'Seconds to hover before scrollbar appears (0 = instant)',
    ),
  );

  // ── Hover Duration slider (linger time after mouse leaves) ──
  container.append(
    createSliderRow(
      'Hover Duration',
      0,
      2,
      0.1,
      0,
      (val: number) => {
        document.documentElement.style.setProperty('--sb-hover-linger', `${String(val)}s`);
      },
      'sb-hover-linger',
      'Seconds scrollbar lingers after mouse leaves before fading (0 = immediate)',
    ),
  );

  // ── Flash Duration slider (how long scrollbar stays after scroll) ──
  container.append(
    createSliderRow(
      'Flash Duration',
      0.3,
      3,
      0.1,
      1.2,
      (val: number) => {
        _sbFlashDuration = Math.round(val * 1000);
        // Restart active flash timer with new duration
        if (_sbFlashTimer) {
          clearTimeout(_sbFlashTimer);
          const hb: HTMLElement | null = document.querySelector('#scrollbar-h');
          const vb: HTMLElement | null = document.querySelector('#scrollbar-v');
          const cn: HTMLElement | null = document.querySelector('#scrollbar-corner');
          _sbFlashTimer = setTimeout(() => {
            hb?.classList.remove('visible');
            vb?.classList.remove('visible');
            cn?.classList.remove('visible');
            _sbFlashTimer = null;
          }, _sbFlashDuration);
        }
      },
      'sb-flash-duration',
      'Seconds scrollbar stays visible after scrolling (before fading)',
    ),
  );
}

/**
 * Updates scrollbar thumb position and size to reflect current camera view.
 *
 * @param cam - The ArcRotateCamera.
 * @param scene - The active Babylon scene.
 */
function updateScrollbars(cam: BABYLON.ArcRotateCamera, scene: BABYLON.Scene): void {
  const hBar: HTMLElement | null = document.querySelector('#scrollbar-h');
  const vBar: HTMLElement | null = document.querySelector('#scrollbar-v');
  const hThumb: HTMLElement | null = document.querySelector('#sb-thumb-h');
  const vThumb: HTMLElement | null = document.querySelector('#sb-thumb-v');
  if (!hBar || !vBar || !hThumb || !vThumb) return;

  const corner: HTMLElement | null = document.querySelector('#scrollbar-corner');

  if (_currentPreset !== 'mapeditor' || _sbVisibility === 'never') {
    hBar.classList.remove('sb-active', 'visible');
    vBar.classList.remove('sb-active', 'visible');
    corner?.classList.remove('visible');
    return;
  }

  const aspect: number = scene.getEngine().getAspectRatio(cam);
  const viewW: number = _orthoSize * aspect * 2;
  const viewH: number = _orthoSize * 2;
  const mapW: number = _mapWidth;
  const mapH: number = _mapHeight;

  const hRatio: number = Math.min(1, viewW / mapW);
  const vRatio: number = Math.min(1, viewH / mapH);
  // Treat >= 0.99 as "view fits" to avoid floating-point edge cases at max zoom-out
  const hFits: boolean = hRatio >= 0.99;
  const vFits: boolean = vRatio >= 0.99;

  // Toggle scrollbar presence based on whether view fits
  hBar.classList.toggle('sb-active', !hFits);
  vBar.classList.toggle('sb-active', !vFits);

  // Corner piece: visible only when BOTH axes are scrollable
  const bothScrollable: boolean = !hFits && !vFits;
  if (corner) {
    if (!bothScrollable) corner.classList.remove('visible');
  }

  // "Always" mode: force visible whenever scrollable
  if (_sbVisibility === 'always') {
    if (!hFits) hBar.classList.add('visible');
    if (!vFits) vBar.classList.add('visible');
    if (bothScrollable && corner) corner.classList.add('visible');
  }

  // Remove visible when no longer scrollable so flash doesn't linger
  if (hFits) hBar.classList.remove('visible');
  if (vFits) vBar.classList.remove('visible');

  if (hFits && vFits) return;

  // Horizontal thumb
  const hTrack: HTMLElement | null = hBar.querySelector('.sb-track');
  const vTrack: HTMLElement | null = vBar.querySelector('.sb-track');
  if (!hTrack || !vTrack) return;

  const hTrackW: number = hTrack.clientWidth;
  const vTrackH: number = vTrack.clientHeight;

  // Thumb sizes (40px min so thumb stays grabbable at extreme zoom)
  const hThumbW: number = Math.max(40, hRatio * hTrackW);
  const vThumbH: number = Math.max(40, vRatio * vTrackH);
  hThumb.style.width = `${String(hThumbW)}px`;
  vThumb.style.height = `${String(vThumbH)}px`;

  // Camera position → thumb position
  // Screen right = world +Z → horizontal scrollbar tracks Z
  // Screen down = world +X → vertical scrollbar tracks X
  const halfW: number = _orthoSize * aspect;
  const halfH: number = _orthoSize;
  const minTZ: number = MAP_MIN + halfW;
  const maxTZ: number = _mapWidth - halfW;
  const minTX: number = MAP_MIN + halfH;
  const maxTX: number = _mapHeight - halfH;

  const hProgress: number = maxTZ > minTZ ? (cam.target.z - minTZ) / (maxTZ - minTZ) : 0.5;
  const vProgress: number = maxTX > minTX ? (cam.target.x - minTX) / (maxTX - minTX) : 0.5;

  hThumb.style.left = `${String(Math.max(0, Math.min(hTrackW - hThumbW, hProgress * (hTrackW - hThumbW))))}px`;
  vThumb.style.top = `${String(Math.max(0, Math.min(vTrackH - vThumbH, vProgress * (vTrackH - vThumbH))))}px`;
}

/**
 * Briefly shows scrollbars then fades them after 1.2s idle.
 * Call from user-initiated events (wheel, drag, keyboard), NOT from per-frame loops.
 */
function flashScrollbars(): void {
  // "always" keeps them visible permanently; "never" hides everything
  if (_sbVisibility !== 'auto') return;
  const hBar: HTMLElement | null = document.querySelector('#scrollbar-h');
  const vBar: HTMLElement | null = document.querySelector('#scrollbar-v');
  const corner: HTMLElement | null = document.querySelector('#scrollbar-corner');
  if (!hBar || !vBar) return;
  if (hBar.classList.contains('sb-active')) hBar.classList.add('visible');
  if (vBar.classList.contains('sb-active')) vBar.classList.add('visible');
  // Show corner when both scrollbars are active
  if (hBar.classList.contains('sb-active') && vBar.classList.contains('sb-active')) {
    corner?.classList.add('visible');
  }
  if (_sbFlashTimer) clearTimeout(_sbFlashTimer);
  _sbFlashTimer = setTimeout(() => {
    hBar.classList.remove('visible');
    vBar.classList.remove('visible');
    corner?.classList.remove('visible');
    _sbFlashTimer = null;
  }, _sbFlashDuration);
}

/**
 * Sets up RPG Maker-style map editor controls: ortho zoom, keyboard pan,
 * scrollbar sync, and resize handling.
 *
 * @param runtime - The runtime instance.
 * @param debug - Debug API reference.
 * @param canvas - The game canvas element.
 */
function setupMapEditorControls(
  runtime: RuntimeInstance,
  debug: DevDebugApi,
  canvas: HTMLCanvasElement,
): void {
  const cam = runtime.camera as BABYLON.ArcRotateCamera;
  const { scene } = runtime.engine;

  // ── Detach Babylon's built-in mouse wheel when in mapeditor ──
  if (_currentPreset === 'mapeditor') {
    const wheelInput = cam.inputs.attached['mousewheel'];
    if (wheelInput) wheelInput.detachControl();

    // Disable Babylon's built-in right-click panning (we handle all panning)
    cam.panningSensibility = 0;

    // Set initial ortho size — zoomed in like RPG Maker MV
    computeOrthoMax(scene, cam);
    _orthoSize = initialOrthoSize(scene);
    applyOrthoBounds(cam, scene);

    // Dark background for any area outside the map
    _savedClearColor = scene.clearColor.clone();
    scene.clearColor = new BABYLON.Color4(0.08, 0.08, 0.08, 1);

    ensureEditorBackdrop(scene);
  }

  // ── Custom wheel: scroll to pan, Ctrl+scroll / pinch to zoom ──
  // Screen axes: right = world +Z, up = world -X (ArcRotateCamera alpha=0 top-down)
  canvas.addEventListener(
    'wheel',
    (evt: WheelEvent) => {
      // Cancel any in-progress refocus animation on user scroll
      if (_refocusHandle) {
        _refocusHandle.dispose();
        _refocusHandle = null;
      }
      if (_currentPreset !== 'mapeditor') return;
      evt.preventDefault();

      const aspect: number = scene.getEngine().getAspectRatio(cam);

      // Ctrl+scroll or pinch-to-zoom → zoom toward cursor
      if (evt.ctrlKey || evt.metaKey) {
        const orthoMax: number = computeOrthoMax(scene, cam);
        const halfWBefore: number = _orthoSize * aspect;
        const halfHBefore: number = _orthoSize;

        // Mouse position normalized to [-1, 1]
        const rect: DOMRect = canvas.getBoundingClientRect();
        const nx: number = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
        const ny: number = 1 - ((evt.clientY - rect.top) / rect.height) * 2;

        // World position under cursor before zoom
        const worldZBefore: number = cam.target.z + nx * halfWBefore;
        const worldXBefore: number = cam.target.x - ny * halfHBefore;

        // Adjust ortho size
        const factor: number = evt.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
        _orthoSize = Math.max(ORTHO_MIN, Math.min(orthoMax / MIN_ZOOM, _orthoSize * factor));

        const halfWAfter: number = _orthoSize * aspect;
        const halfHAfter: number = _orthoSize;

        // Shift target so world point stays under cursor
        const worldZAfter: number = cam.target.z + nx * halfWAfter;
        const worldXAfter: number = cam.target.x - ny * halfHAfter;
        cam.target.z += worldZBefore - worldZAfter;
        cam.target.x += worldXBefore - worldXAfter;

        applyOrthoBounds(cam, scene);
        clampCameraToMap(cam, scene);
        updateScrollbars(cam, scene);
        flashScrollbars();
        return;
      }

      // Plain scroll → pan (deltaX = horizontal, deltaY = vertical)
      const panSpeed: number = _orthoSize * 0.002;
      // screen right = world +Z, screen up = world -X
      cam.target.z += evt.deltaX * panSpeed;
      cam.target.x += evt.deltaY * panSpeed;
      clampCameraToMap(cam, scene);
      updateScrollbars(cam, scene);
      flashScrollbars();
    },
    { passive: false },
  );

  // ── Click-drag to pan (middle-click or right-click) ──
  let _dragPanning = false;
  let _dragLastX = 0;
  let _dragLastY = 0;

  canvas.addEventListener('pointerdown', (evt: PointerEvent) => {
    if (_currentPreset !== 'mapeditor') return;
    // Middle (1) or right (2) button = grab-to-pan
    if (evt.button !== 1 && evt.button !== 2) return;
    evt.preventDefault();
    _dragPanning = true;
    _dragLastX = evt.clientX;
    _dragLastY = evt.clientY;
    canvas.setPointerCapture(evt.pointerId);
    canvas.style.cursor = 'grabbing';
  });

  // Prevent context menu on right-click so drag works smoothly
  canvas.addEventListener('contextmenu', (evt: Event) => {
    if (_currentPreset === 'mapeditor') evt.preventDefault();
  });

  canvas.addEventListener('pointermove', (evt: PointerEvent) => {
    if (!_dragPanning) return;
    const rect: DOMRect = canvas.getBoundingClientRect();
    const aspect: number = scene.getEngine().getAspectRatio(cam);
    const halfW: number = _orthoSize * aspect;
    const halfH: number = _orthoSize;

    // Convert pixel delta to world units
    // screen right (+dx pixels) = world +Z, screen down (+dy pixels) = world +X
    const dx: number = evt.clientX - _dragLastX;
    const dy: number = evt.clientY - _dragLastY;
    const worldDZ: number = -(dx / rect.width) * halfW * 2;
    const worldDX: number = -(dy / rect.height) * halfH * 2;

    cam.target.z += worldDZ;
    cam.target.x += worldDX;
    _dragLastX = evt.clientX;
    _dragLastY = evt.clientY;

    clampCameraToMap(cam, scene);
    updateScrollbars(cam, scene);
  });

  const stopDragPan = (): void => {
    if (_dragPanning) {
      _dragPanning = false;
      canvas.style.cursor = '';
    }
  };
  canvas.addEventListener('pointerup', stopDragPan);
  canvas.addEventListener('pointercancel', stopDragPan);

  // ── Keyboard navigation ──
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const tag: string = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    _heldKeys.add(e.key);

    // Delete/Backspace clears the selected tile(s) in any camera mode
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const rect = getSelectionRect();
      if (rect) {
        clearSelectionRect(debug);
      } else {
        clearSelectedTile(debug);
      }
    }

    // G toggles grid overlay in any camera mode
    if (e.key === 'g' || e.key === 'G') {
      toggleGridOverlay(runtime.engine.scene, debug);
    }

    // F or Home refocuses on entire tilemap (all presets except firstperson)
    if ((e.key === 'f' || e.key === 'F' || e.key === 'Home') && _currentPreset !== 'firstperson') {
      e.preventDefault();
      refocusMap(cam, scene, debug);
    }

    // Escape clears rectangular selection
    if (e.key === 'Escape') {
      _selStartX = -1;
      _selStartZ = -1;
      _selEndX = -1;
      _selEndZ = -1;
      updateHighlightForSelection();
    }
  });
  document.addEventListener('keyup', (e: KeyboardEvent) => {
    _heldKeys.delete(e.key);
  });

  // ── Per-frame update: keyboard pan + clamp + scrollbar sync + mesh hiding ──
  scene.registerBeforeRender(() => {
    if (_currentPreset !== 'mapeditor') return;

    // Screen right = world +Z, screen up = world -X
    const speed: number = _orthoSize * 0.03;
    let panning = false;
    if (_heldKeys.has('w') || _heldKeys.has('W') || _heldKeys.has('ArrowUp')) {
      cam.target.x -= speed;
      panning = true;
    }
    if (_heldKeys.has('s') || _heldKeys.has('S') || _heldKeys.has('ArrowDown')) {
      cam.target.x += speed;
      panning = true;
    }
    if (_heldKeys.has('a') || _heldKeys.has('A') || _heldKeys.has('ArrowLeft')) {
      cam.target.z -= speed;
      panning = true;
    }
    if (_heldKeys.has('d') || _heldKeys.has('D') || _heldKeys.has('ArrowRight')) {
      cam.target.z += speed;
      panning = true;
    }

    clampCameraToMap(cam, scene);
    updateScrollbars(cam, scene);
    if (panning) flashScrollbars();

    // Hide meshes that produce visual artifacts in top-down ortho view.
    // VLS mesh: isVisible=false hides the mesh but keeps the god ray
    // post-process effect active.
    // Sky meshes: setEnabled(false) fully removes them from the scene.
    // Lens flares: isEnabled=false suppresses screen-space quad rendering
    // (lens flares are purely cosmetic overlays, no scene contribution).
    for (const mesh of scene.meshes) {
      if (mesh.name === 'VolumetricLightScatteringMesh' && mesh.isVisible) {
        mesh.isVisible = false;
      } else if (mesh.name.startsWith('sky-') && mesh.isEnabled()) {
        mesh.setEnabled(false);
      }
    }
    const orthoLights = debug.tilemap?.lighting?.lights;
    if (orthoLights) {
      for (const ml of orthoLights) {
        if (ml.lensFlareSystem?.isEnabled) ml.lensFlareSystem.isEnabled = false;
      }
    }
  });

  // ── Resize: recalculate ortho bounds + ortho max ──
  const parent: HTMLElement | null = canvas.parentElement;
  if (parent) {
    const orthoResizeObserver: ResizeObserver = new ResizeObserver(() => {
      if (_currentPreset === 'mapeditor') {
        const newCanvasH: number = scene.getEngine().getRenderHeight();

        // Maintain tile pixel size on resize (RPG Maker MV behavior):
        // Scale _orthoSize proportionally with canvas height so tiles
        // stay the same screen size. Scrollbars appear when the viewport
        // can no longer fit the full map at the current tile size.
        if (_lastCanvasH > 0 && newCanvasH > 0) {
          _orthoSize = _orthoSize * (newCanvasH / _lastCanvasH);
        }
        _lastCanvasH = newCanvasH;

        // Recalculate _orthoMax with new aspect ratio
        const orthoMax: number = computeOrthoMax(scene, cam);

        // Don't zoom out past full map
        if (_orthoSize > orthoMax) {
          _orthoSize = orthoMax;
        }

        applyOrthoBounds(cam, scene);
        clampCameraToMap(cam, scene);
        updateScrollbars(cam, scene);
      }
    });
    orthoResizeObserver.observe(parent);
  }

  // ── Scrollbar thumb drag + track click-to-jump ──
  setupScrollbarDrag('#sb-thumb-h', 'horizontal', cam, scene);
  setupScrollbarDrag('#sb-thumb-v', 'vertical', cam, scene);
  setupTrackClick('#scrollbar-h .sb-track', 'horizontal', cam, scene);
  setupTrackClick('#scrollbar-v .sb-track', 'vertical', cam, scene);
}

/**
 * Attaches drag handlers to a scrollbar thumb element.
 *
 * @param thumbSelector - CSS selector for the thumb element.
 * @param axis - Which axis this scrollbar controls.
 * @param cam - The ArcRotateCamera.
 * @param scene - The active Babylon scene.
 */
function setupScrollbarDrag(
  thumbSelector: string,
  axis: 'horizontal' | 'vertical',
  cam: BABYLON.ArcRotateCamera,
  scene: BABYLON.Scene,
): void {
  const thumb: HTMLElement | null = document.querySelector(thumbSelector);
  if (!thumb) return;

  let dragging = false;
  let startMouse = 0;
  let startTarget = 0;

  thumb.addEventListener('mousedown', (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    startMouse = axis === 'horizontal' ? e.clientX : e.clientY;
    // Screen right = world +Z → horizontal tracks Z; screen down = world +X → vertical tracks X
    startTarget = axis === 'horizontal' ? cam.target.z : cam.target.x;
    thumb.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!dragging) return;

    const track: HTMLElement | null = thumb.parentElement;
    if (!track) return;

    const trackSize: number = axis === 'horizontal' ? track.clientWidth : track.clientHeight;
    const thumbSize: number = axis === 'horizontal' ? thumb.clientWidth : thumb.clientHeight;
    const scrollableTrack: number = trackSize - thumbSize;
    if (scrollableTrack <= 0) return;

    const aspect: number = scene.getEngine().getAspectRatio(cam);
    const halfView: number = axis === 'horizontal' ? _orthoSize * aspect : _orthoSize;
    const mapRange: number =
      (axis === 'horizontal' ? _mapWidth : _mapHeight) - MAP_MIN - halfView * 2;
    if (mapRange <= 0) return;

    const mouseDelta: number = (axis === 'horizontal' ? e.clientX : e.clientY) - startMouse;
    const worldDelta: number = (mouseDelta / scrollableTrack) * mapRange;

    if (axis === 'horizontal') {
      cam.target.z = startTarget + worldDelta;
    } else {
      cam.target.x = startTarget + worldDelta;
    }

    clampCameraToMap(cam, scene);
    updateScrollbars(cam, scene);
    flashScrollbars();
  });

  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      thumb.style.cursor = 'grab';
    }
  });
}

/**
 * Clicks on the scrollbar track jump the camera to that position.
 *
 * @param trackSelector - CSS selector for the track element.
 * @param axis - Which axis this scrollbar controls.
 * @param cam - The ArcRotateCamera.
 * @param scene - The active Babylon scene.
 */
function setupTrackClick(
  trackSelector: string,
  axis: 'horizontal' | 'vertical',
  cam: BABYLON.ArcRotateCamera,
  scene: BABYLON.Scene,
): void {
  const track: HTMLElement | null = document.querySelector(trackSelector);
  if (!track) return;

  track.addEventListener('mousedown', (e: MouseEvent) => {
    // Ignore if the click landed on the thumb itself
    if ((e.target as HTMLElement).classList.contains('sb-thumb')) return;

    // Only respond when the scrollbar is visible (hovered or flashed)
    const bar: HTMLElement | null = track.closest('.map-scrollbar');
    if (bar && !bar.classList.contains('visible') && !bar.matches(':hover')) return;

    const rect: DOMRect = track.getBoundingClientRect();
    const clickPos: number =
      axis === 'horizontal'
        ? (e.clientX - rect.left) / rect.width
        : (e.clientY - rect.top) / rect.height;

    const aspect: number = scene.getEngine().getAspectRatio(cam);
    const halfView: number = axis === 'horizontal' ? _orthoSize * aspect : _orthoSize;
    const mapSize: number = axis === 'horizontal' ? _mapWidth : _mapHeight;
    const minT: number = MAP_MIN + halfView;
    const maxT: number = mapSize - halfView;

    const newTarget: number = minT + clickPos * (maxT - minT);

    if (axis === 'horizontal') {
      cam.target.z = newTarget;
    } else {
      cam.target.x = newTarget;
    }

    clampCameraToMap(cam, scene);
    updateScrollbars(cam, scene);
    flashScrollbars();
  });
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  // eslint-disable-next-line no-console -- Dev harness diagnostic output
  console.log('[Storylyne] Starting dev harness...');

  const result: BabylonResult<RuntimeInstance> = await createRuntime({
    engine: {
      canvasId: 'game-canvas',
      // Force WebGL2 — VolumetricLightScatteringPostProcess lacks WGSL shaders,
      // causing black screen on WebGPU. Use WebGL2 until Babylon.js adds WGSL support.
      renderer: 'webgl2',
    },
    camera: { preset: 'mapeditor' },
    scene: {
      defaultLight: true,
      defaultLightIntensity: 0.8,
    },
    debug: true,
  });

  if (!result.ok) {
    // eslint-disable-next-line no-console -- Dev harness diagnostic output
    console.error('[Storylyne] Failed to create runtime:', result.error);
    return;
  }

  const runtime: RuntimeInstance = result.data;
  const backend: string = runtime.engine.isWebGPU ? 'WebGPU' : 'WebGL2';
  // eslint-disable-next-line no-console -- Dev harness diagnostic output
  console.log(`[Storylyne] Runtime created — backend: ${backend}`);

  // Expose debug API on window
  const debug: DevDebugApi = createDebugApi(runtime);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness debug API
  (window as any).__WEBFORGE__ = debug;

  // Wire UI controls
  wireUI(runtime, debug);
  setupFpsCounter(runtime);

  // Attach camera controls to the canvas
  const canvas: HTMLCanvasElement | null =
    document.querySelector<HTMLCanvasElement>('#game-canvas');
  if (canvas) {
    runtime.camera.attachControl(canvas, true);

    // Force an initial resize so the canvas pixel buffer matches the display
    // size — without this, the canvas defaults to 300×150 and looks blurry.
    runtime.engine.engine.resize();

    // Register resize handler so canvas adapts when window is resized
    const resizeResult = registerResizeHandler(runtime.engine, canvas);
    if (resizeResult.ok) {
      window.addEventListener('beforeunload', resizeResult.data);
    }

    // Set up RPG Maker-style map editor controls (zoom, pan, scrollbars)
    setupMapEditorControls(runtime, debug, canvas);
  }

  // Generate a blank 300×300 map on boot (no test map data)
  const bootW: number = 300;
  const bootH: number = 300;
  const bootTotal: number = bootW * bootH;
  const bootMapData: Record<string, unknown> = {
    width: bootW,
    height: bootH,
    tileWidth: 32,
    tileHeight: 32,
    tilesets: TEST_MAP_DATA.tilesets,
    layers: [
      {
        name: 'ground',
        type: 'ground',
        data: Array.from<number>({ length: bootTotal }).fill(1),
        visible: true,
        opacity: 1,
      },
      {
        name: 'ground_deco',
        type: 'ground_deco',
        data: Array.from<number>({ length: bootTotal }).fill(0),
        visible: true,
        opacity: 1,
      },
      {
        name: 'upper1',
        type: 'upper1',
        data: Array.from<number>({ length: bootTotal }).fill(0),
        visible: true,
        opacity: 1,
      },
      {
        name: 'shadow',
        type: 'shadow',
        data: Array.from<number>({ length: bootTotal }).fill(0),
        visible: true,
        opacity: 0.4,
      },
    ],
    heightMap: Array.from<number>({ length: bootTotal }).fill(0),
    postProcessing: { preset: 'hd2d' },
    lighting: (TEST_MAP_DATA as Record<string, unknown>).lighting,
  };
  const mapResult: BabylonResult<RenderedTilemap> = renderTilemap({
    scene: runtime.engine.scene,
    mapDataInput: bootMapData,
    assetBasePath: '/',
  });

  let tilemap: RenderedTilemap | null = null;

  if (mapResult.ok) {
    tilemap = mapResult.data;
    debug.tilemap = tilemap;

    // Build mega-atlas for multi-tileset support (async — composites all tileset
    // images into one GPU texture so tiles from any tileset render correctly).
    void applyMegaAtlas({ tilemap }).then((megaResult) => {
      if (megaResult.ok) {
        debug.tilemap = megaResult.data;
        tilemap = megaResult.data;
      }
    });

    // Update map dimensions from actual tilemap (overrides 32×32 defaults).
    // World X axis = mapData.width (columns) = screen vertical → _mapHeight
    // World Z axis = mapData.height (rows)   = screen horizontal → _mapWidth
    _mapWidth = tilemap.mapData.height;
    _mapHeight = tilemap.mapData.width;

    // Ensure 3D presets can zoom out far enough for this map from the start
    updateRadiusLimitForMap(runtime.camera as BABYLON.ArcRotateCamera, _mapWidth, _mapHeight);

    _orthoSize = computeOrthoMax(runtime.engine.scene, runtime.camera as BABYLON.ArcRotateCamera);
    // eslint-disable-next-line no-console -- Dev harness diagnostic output
    console.log(
      `[Storylyne] Map: ${String(tilemap.mapData.width)}cols × ${String(tilemap.mapData.height)}rows (screen ${String(_mapWidth)}w × ${String(_mapHeight)}h)`,
    );

    // If starting in mapeditor, reapply ortho bounds with correct map dimensions
    if (_currentPreset === 'mapeditor') {
      const arcCam = runtime.camera as BABYLON.ArcRotateCamera;
      _orthoSize = initialOrthoSize(runtime.engine.scene); // RPG Maker MV-like tile size
      applyOrthoBounds(arcCam, runtime.engine.scene);
      arcCam.target.x = _mapHeight / 2;
      arcCam.target.z = _mapWidth / 2;
      clampCameraToMap(arcCam, runtime.engine.scene);
      updateScrollbars(arcCam, runtime.engine.scene);
      _lastCanvasH = runtime.engine.scene.getEngine().getRenderHeight();

      // Immediately hide VLS/sky meshes so they don't flash for one frame
      for (const mesh of runtime.engine.scene.meshes) {
        if (mesh.name === 'VolumetricLightScatteringMesh' && mesh.isVisible) {
          mesh.isVisible = false;
        } else if (mesh.name.startsWith('sky-') && mesh.isEnabled()) {
          mesh.setEnabled(false);
        }
      }
    }

    // Rebuild grid overlay with correct map dimensions (it was created
    // at startup with 32×32 defaults before the tilemap loaded)
    if (_gridMesh) {
      _gridMesh.dispose();
      _gridMesh = null;
    }
    if (_gridFillMesh) {
      _gridFillMesh.dispose();
      _gridFillMesh = null;
    }
    if (_gridVisible) {
      toggleGridOverlay(runtime.engine.scene, debug, true);
    }

    const chunkCount: Num = tilemap.chunks.length;
    const cliffCount: Num = tilemap.cliffChunks.length;
    // eslint-disable-next-line no-console -- Dev harness diagnostic output
    console.log(`[Storylyne] Tilemap rendered — ${chunkCount} chunks, ${cliffCount} cliff chunks`);

    // Log lighting status
    if (tilemap.lighting) {
      const lightCount: number = tilemap.lighting.lights.length;
      const lightNames: string = tilemap.lighting.lights.map((ml) => ml.config.id).join(', ');
      const hasShadows: boolean = tilemap.lighting.lights.some((ml) => ml.shadowGenerator !== null);
      const hasFlicker: boolean = tilemap.lighting.lights.some((ml) => ml.flickerInstance !== null);
      const hasDayNight: boolean = tilemap.lighting.dayNightCycle !== null;
      const hasGlow: boolean = tilemap.lighting.glowLayer !== null;
      // eslint-disable-next-line no-console -- Dev harness diagnostic output
      console.log(
        `[Storylyne] Lighting active — ${String(lightCount)} lights [${lightNames}], ` +
          `shadows: ${String(hasShadows)}, flicker: ${String(hasFlicker)}, ` +
          `dayNight: ${String(hasDayNight)}, glow: ${String(hasGlow)}`,
      );
    } else {
      // eslint-disable-next-line no-console -- Dev harness diagnostic output
      console.log('[Storylyne] No lighting system configured');
    }

    // Build dynamic UI sections after tilemap is loaded
    buildCameraNavigationUI(runtime, debug);
    buildScrollbarUI();
    buildLayerUI(debug);
    buildSkyUI(debug, runtime.engine.scene);
    buildLightsUI(debug);
    buildPostProcessingUI(debug);
    buildTransitionsUI(runtime.engine.scene);
    buildFogUI(runtime.engine.scene, runtime.camera, runtime.engine.engine);
    buildCameraDetailsUI(runtime);
    buildGlowDetailsUI(debug);
    buildInfoUI(debug, runtime.engine.scene);
    buildTileInspectorUI(debug, runtime.engine.scene);
    buildKeyboardShortcutsUI();
    buildTestMapUI(debug, runtime.engine.scene);

    // Skip 3D procedural props on blank boot map (no height data)
    // _propSystem = create3DProps(runtime.engine.scene, TEST_MAP_DATA.heightMap);

    // Center camera on the map using actual tilemap dimensions
    runtime.camera.target = new BABYLON.Vector3(_mapHeight / 2, 0, _mapWidth / 2);

    // Apply initial ortho bounds now that camera target is centered
    if (_currentPreset === 'mapeditor') {
      const arcCam = runtime.camera as BABYLON.ArcRotateCamera;
      computeOrthoMax(runtime.engine.scene, arcCam);
      _orthoSize = initialOrthoSize(runtime.engine.scene);
      applyOrthoBounds(arcCam, runtime.engine.scene);
      clampCameraToMap(arcCam, runtime.engine.scene);
      updateScrollbars(arcCam, runtime.engine.scene);
      _lastCanvasH = runtime.engine.scene.getEngine().getRenderHeight();
    }
  } else {
    // eslint-disable-next-line no-console -- Dev harness diagnostic output
    console.error('[Storylyne] Failed to render tilemap:', mapResult.error);
  }

  // Start render loop
  const loopResult = startRenderLoop(runtime.engine);
  if (!loopResult.ok) {
    // eslint-disable-next-line no-console -- Dev harness diagnostic output
    console.error('[Storylyne] Failed to start render loop:', loopResult.error);
    return;
  }
  // eslint-disable-next-line no-console -- Dev harness diagnostic output
  console.log('[Storylyne] Render loop started');
  // eslint-disable-next-line no-console -- Dev harness diagnostic output
  console.log('[Storylyne] Debug API: window.__WEBFORGE__ (try __WEBFORGE__.status())');

  // Dispose on page unload
  window.addEventListener('beforeunload', () => {
    closeTilePickerPanel();
    if (tilemap) {
      disposeTilemap({ tilemap });
    }
    disposeRuntime(runtime);
    // eslint-disable-next-line no-console -- Dev harness diagnostic output
    console.log('[Storylyne] Runtime disposed');
  });
}

await main();
