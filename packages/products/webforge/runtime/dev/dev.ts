/**
 * WebForge Runtime — Dev Harness
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
	screenShake,
	resetCamera,
	screenTint,
	screenFlash,
	screenFadeIn,
	screenFadeOut,
	setLayerVisibility,
	setLayerOpacity,
	getMoonPhaseInfo,
	computeTimePhase,
	getSeasonSunPath,
	mapBlendMode,
	addParallaxLayer,
	removeParallaxLayer,
	fadeLayerOpacity,
	setParallaxLayerTint,
	createSky,
	disposeSky,
} from '../src/index';
import {
	renderTilemap,
	disposeTilemap,
	updateTile,
	type RenderedTilemap,
} from '../src/rendering/tilemap-renderer';
import { getTileProperties } from '../src/rendering/tile-query';
import {
	resolveGlobalTileId,
	type LoadedTileset,
	type ResolvedTile,
} from '../src/rendering/tileset-loader';
import type { TileProperties, Layer } from '../src/schemas/map-data';

import type { RuntimeInstance } from '../src/runtime';
import type { BabylonResult } from '../src/core/babylon-result';
import type { CameraPreset } from '../src/schemas/camera-config';
import type { Num, Bool } from '@/schemas/common';
import type { ParallaxInstance } from '../src/rendering/parallax-manager';
import type { SkyInstance } from '../src/rendering/sky-system';
import type { ColorRgba } from '../src/schemas/scene-setup-config';

import { TEST_MAP_DATA } from './test-map';

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

/** Color preset for screen effects. */
type EffectColor = { r: number; g: number; b: number; a: number };

// =============================================================================
// State
// =============================================================================

let _currentPreset = 'mapeditor';
let selectedEffectColor = 'white';
let _firstPersonCam: BABYLON.UniversalCamera | null = null;
let _isFirstPerson = false;
let _lastFadeOutHandle: { dispose: () => void } | null = null;

// -- Map Editor camera state --
const MAP_MIN = 0;
const MAP_MAX = 32;
const MAP_SIZE: number = MAP_MAX - MAP_MIN;
const ORTHO_MIN = 1;
const ZOOM_FACTOR = 1.08;
const _heldKeys = new Set<string>();
let _orthoSize: number = MAP_SIZE / 2;
let _savedClearColor: BABYLON.Color4 | null = null;

/**
 * Computes the maximum ortho size so the map exactly fills the viewport
 * along the tighter axis (no gap visible). Mirrors RPG Maker MV behavior.
 *
 * @param cam - The ArcRotateCamera.
 * @param scene - The active Babylon scene.
 * @returns The maximum orthographic half-height.
 */
function computeOrthoMax(): number {
	// Fixed at MAP_SIZE/2 so the full map always fits vertically (screen up/down = X axis).
	// For wide viewports a narrow dark strip appears on the sides at max zoom-out;
	// it disappears as soon as the user zooms in. No scrollbars at max zoom.
	return MAP_SIZE / 2;
}

/**
 * Returns the current zoom multiplier (1x = full map visible, 2x = half map, etc.).
 *
 * @returns The zoom multiplier.
 */
function getZoomMultiplier(): number {
	return MAP_SIZE / 2 / _orthoSize;
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
	_orthoSize = Math.max(ORTHO_MIN, Math.min(computeOrthoMax(), MAP_SIZE / 2 / multiplier));
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
	cam.target.x = Math.max(MAP_MIN, Math.min(MAP_MAX, gx + 0.5));
	cam.target.z = Math.max(MAP_MIN, Math.min(MAP_MAX, gz + 0.5));
	clampCameraToMap(cam, scene);
	updateScrollbars(cam, scene);
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
 * Reads map dimensions from the tilemap; falls back to MAP_SIZE if unavailable.
 * Disposes and recreates if the mesh already exists (handles map size changes).
 *
 * @param scene - The active Babylon scene.
 * @param debug - Debug API reference for reading tilemap dimensions.
 */
function ensureGridMesh(scene: BABYLON.Scene, debug: DevDebugApi): void {
	const { tilemap } = debug;
	const mapW: Num = tilemap ? tilemap.mapData.width : MAP_SIZE;
	const mapH: Num = tilemap ? tilemap.mapData.height : MAP_SIZE;

	// Dispose existing if present (handles map size changes)
	if (_gridMesh) {
		_gridMesh.dispose();
		_gridMesh = null;
	}

	const lines: BABYLON.Vector3[][] = [];

	// Vertical lines (along Z axis)
	for (let i: Num = 0; i <= mapW; i++) {
		lines.push([new BABYLON.Vector3(i, 0, 0), new BABYLON.Vector3(i, 0, mapH)]);
	}
	// Horizontal lines (along X axis)
	for (let j: Num = 0; j <= mapH; j++) {
		lines.push([new BABYLON.Vector3(0, 0, j), new BABYLON.Vector3(mapW, 0, j)]);
	}

	_gridMesh = BABYLON.MeshBuilder.CreateLineSystem('grid-overlay', { lines }, scene);
	_gridMesh.color = new BABYLON.Color3(1, 1, 1);
	_gridMesh.alpha = 0.15;
	_gridMesh.renderingGroupId = 1;
	_gridMesh.isPickable = false;
	_gridMesh.position.y = 0.01;
	_gridMesh.isVisible = _gridVisible;
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
	if (!mesh) return;

	const rect = getSelectionRect();
	if (rect) {
		const w: Num = rect.maxX - rect.minX + 1;
		const h: Num = rect.maxZ - rect.minZ + 1;
		mesh.scaling.set(w, 1, h);
		mesh.position.x = rect.minX + w / 2;
		mesh.position.z = rect.minZ + h / 2;
		mesh.setEnabled(true);
	} else if (_lastInspectX >= 0 && _lastInspectZ >= 0) {
		mesh.scaling.set(1, 1, 1);
		mesh.position.x = _lastInspectX + 0.5;
		mesh.position.z = _lastInspectZ + 0.5;
	}
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

// -- Grid overlay state --
let _gridMesh: BABYLON.LinesMesh | null = null;
let _gridVisible: Bool = false;

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
		_editorBackdrop.position.x = MAP_SIZE / 2;
		_editorBackdrop.position.z = MAP_SIZE / 2;
		_editorBackdrop.isPickable = false;
		_editorBackdrop.renderingGroupId = 0;
	}
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

/** Terrain type options for the dropdown. */
const TERRAIN_TYPE_OPTIONS: readonly string[] = [
	'normal',
	'water',
	'deepWater',
	'lava',
	'ice',
	'sand',
	'swamp',
	'snow',
	'grass',
	'wood',
	'stone',
	'metal',
	'custom',
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

const EFFECT_COLORS: Record<string, EffectColor> = {
	white: { r: 1, g: 1, b: 1, a: 1 },
	black: { r: 0, g: 0, b: 0, a: 1 },
	red: { r: 1, g: 0, b: 0, a: 0.5 },
	green: { r: 0, g: 1, b: 0, a: 0.5 },
	blue: { r: 0, g: 0, b: 1, a: 0.5 },
	yellow: { r: 1, g: 1, b: 0, a: 0.5 },
};

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
		switchPreset(preset: string, durationMs = 500): string {
			const { camera: cam } = runtime;
			if (!(cam instanceof BABYLON.ArcRotateCamera)) return 'Camera is not ArcRotateCamera';
			const presetResult = switchCameraPreset({
				scene: runtime.engine.scene,
				camera: cam,
				targetPreset: preset as 'hd2d' | 'topdown' | 'sideview' | 'cinematic' | 'free',
				durationMs,
				easing: 'easeInOutCubic',
			});
			if (!presetResult.ok) return `Error: ${presetResult.error.message}`;
			return `Switching to ${preset} over ${String(durationMs)}ms`;
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
		section.classList.toggle('collapsed');
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
			_orthoSize = computeOrthoMax();
			applyOrthoBounds(arcCam, scene);

			// Detach Babylon's wheel input (we use custom zoom)
			const wheelInput = arcCam.inputs.attached['mousewheel'];
			if (wheelInput) wheelInput.detachControl();
			// Disable Babylon's right-click panning (we handle all panning)
			arcCam.panningSensibility = 0;

			// Center camera on map
			arcCam.target.x = (MAP_MIN + MAP_MAX) / 2;
			arcCam.target.z = (MAP_MIN + MAP_MAX) / 2;

			// Dark background for any visible area outside the map
			_savedClearColor = scene.clearColor.clone();
			scene.clearColor = new BABYLON.Color4(0.08, 0.08, 0.08, 1);

			ensureEditorBackdrop(scene);

			updateScrollbars(arcCam, scene);
		} else if (_currentPreset === 'mapeditor') {
			// Switching away from mapeditor — restore perspective
			arcCam.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;

			// Hide grid overlay when leaving mapeditor
			if (_gridMesh) {
				_gridMesh.isVisible = false;
			}
			_gridVisible = false;
			const gridToggle = (window as Record<string, unknown>)._gridToggle as
				| HTMLInputElement
				| undefined;
			if (gridToggle) gridToggle.checked = false;

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

			// Restore 3D-only meshes hidden by mapeditor per-frame callback
			for (const mesh of scene.meshes) {
				if (mesh.name === 'VolumetricLightScatteringMesh' || mesh.name === 'sky-gradient') {
					mesh.isVisible = true;
				}
			}

			// Hide scrollbars
			const hBar: HTMLElement | null = document.querySelector('#scrollbar-h');
			const vBar: HTMLElement | null = document.querySelector('#scrollbar-v');
			if (hBar) hBar.style.display = 'none';
			if (vBar) vBar.style.display = 'none';
		}

		// Handle auto-rotate for orbit preset
		if (preset === 'orbit') {
			arcCam.useAutoRotationBehavior = true;
		} else if (_currentPreset === 'orbit') {
			arcCam.useAutoRotationBehavior = false;
		}

		const durationSlider = document.querySelector('#transition-duration') as HTMLInputElement;
		const durationMs = Number(durationSlider?.value ?? 500);
		debug.switchPreset(preset, durationMs);
		_currentPreset = preset;

		// Toggle camera nav controls visibility
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
		const navControls = (window as any)._camNavControls as HTMLElement | undefined;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
		const navFallback = (window as any)._camNavFallback as HTMLElement | undefined;
		if (navControls) navControls.style.display = preset === 'mapeditor' ? 'block' : 'none';
		if (navFallback) navFallback.style.display = preset === 'mapeditor' ? 'none' : 'block';
	}

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

	// Transition duration slider
	const transSlider = document.querySelector('#transition-duration') as HTMLInputElement;
	const transValue = document.querySelector('#transition-value');
	transSlider?.addEventListener('input', () => {
		if (transValue) transValue.textContent = `${transSlider.value}ms`;
	});

	// ── Reset Camera ───────────────────────────────────────────────
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
	(window as any).resetCam = (): void => {
		const cam = _isFirstPerson ? _firstPersonCam : runtime.camera;
		if (!cam) return;
		resetCamera({ scene, camera: cam, preset: _currentPreset as CameraPreset });
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

	// ── Screen Shake ────────────────────────────────────────────────
	const shakeIntSlider = document.querySelector('#shake-intensity') as HTMLInputElement;
	const shakeIntValue = document.querySelector('#shake-intensity-value');
	shakeIntSlider?.addEventListener('input', () => {
		if (shakeIntValue) shakeIntValue.textContent = shakeIntSlider.value;
	});

	const shakeDurSlider = document.querySelector('#shake-duration') as HTMLInputElement;
	const shakeDurValue = document.querySelector('#shake-duration-value');
	shakeDurSlider?.addEventListener('input', () => {
		if (shakeDurValue) shakeDurValue.textContent = `${shakeDurSlider.value}ms`;
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
	(window as any).triggerShake = (): void => {
		const intensity = Number(shakeIntSlider?.value ?? 0.5);
		const durationMs = Number(shakeDurSlider?.value ?? 300);
		screenShake({ scene, camera: runtime.camera, intensity, durationMs, decay: true });
	};

	// ── Day/Night Cycle ─────────────────────────────────────────────
	const timeSlider = document.querySelector('#time-slider') as HTMLInputElement;
	const timeValue = document.querySelector('#time-value');
	const speedSlider = document.querySelector('#speed-slider') as HTMLInputElement;
	const speedValue = document.querySelector('#speed-value');

	timeSlider?.addEventListener('input', () => {
		const hour = Number(timeSlider.value);
		debug.setTime(hour);
		updateTimeDisplay(hour);
		// Clear preset dropdown when slider is dragged manually
		const presetSelect = document.querySelector(
			'select[data-control="daynight-preset"]',
		) as HTMLSelectElement | null;
		if (presetSelect) presetSelect.selectedIndex = -1;
	});

	let _lastDayNightSpeed = 1.0;
	const pauseBtn = document.querySelector('#daynight-pause-btn') as HTMLButtonElement | null;

	speedSlider?.addEventListener('input', () => {
		const speed = Number(speedSlider.value);
		const cycle = debug.tilemap?.lighting?.dayNightCycle;
		if (cycle) cycle.speed = speed;
		if (speed > 0) _lastDayNightSpeed = speed;
		if (speedValue) speedValue.textContent = speed === 0 ? '0x' : `${speed}x`;
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
		dayNightDropdownContainer.append(
			createDropdown(
				'Preset',
				[
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
					const hour = timePresetMap[val] ?? 12;
					debug.setTime(hour);
					if (timeSlider) timeSlider.value = String(hour);
					updateTimeDisplay(hour);
				},
				'daynight-preset',
			),
		);
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

	/**
	 * Updates the time display label.
	 *
	 * @param hour - Current hour (0-24).
	 */
	function updateTimeDisplay(hour: number): void {
		if (!timeValue) return;
		const h = Math.floor(hour);
		const m = Math.floor((hour % 1) * 60);
		timeValue.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	// ── Day/Night Expansion Controls ───────────────────────────────

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
				],
				'outdoor',
				(val) => {
					const cycle = debug.tilemap?.lighting?.dayNightCycle;
					if (!cycle) return;
					(cycle.config as Record<string, unknown>)['indoorMode'] = val;
				},
				'daynight-indoor',
			),
		);
	}

	// Transition easing dropdown
	const easingDropdownContainer = document.querySelector('#daynight-easing-dropdown');
	if (easingDropdownContainer) {
		easingDropdownContainer.append(
			createDropdown(
				'Easing',
				[
					{ value: 'linear', label: 'Linear' },
					{ value: 'smooth', label: 'Smooth' },
					{ value: 'easeIn', label: 'Ease In' },
					{ value: 'easeOut', label: 'Ease Out' },
				],
				'linear',
				(val) => {
					const cycle = debug.tilemap?.lighting?.dayNightCycle;
					if (!cycle) return;
					(cycle.config as Record<string, unknown>)['transitionEasing'] = val;
				},
				'daynight-easing',
			),
		);
	}

	// Read-only displays
	const phaseDisplay = document.querySelector('#daynight-phase-display');
	const moonIntensityDisplay = document.querySelector('#daynight-moon-intensity');
	const sunriseSunsetDisplay = document.querySelector('#daynight-sunrise-sunset');
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

		// Resolve effective sun path: explicit config > season override > default
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
		const phaseResult = computeTimePhase(t as Num, sunPath);
		if (phaseDisplay && phaseResult.ok) {
			phaseDisplay.textContent =
				phaseResult.data.charAt(0).toUpperCase() + phaseResult.data.slice(1);
		}

		// Update moon intensity display
		const moonPhaseVal: number = (cycle.config.moonPhase as number | undefined) ?? 4;
		const moonResult = getMoonPhaseInfo(moonPhaseVal);
		if (moonIntensityDisplay && moonResult.ok) {
			moonIntensityDisplay.textContent = `${moonResult.data.name} (${String(moonResult.data.intensityMultiplier)})`;
		}

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

	// ── Screen Effects ──────────────────────────────────────────────
	const effectDurSlider = document.querySelector('#effect-duration') as HTMLInputElement;
	const effectDurValue = document.querySelector('#effect-duration-value');
	effectDurSlider?.addEventListener('input', () => {
		if (effectDurValue) effectDurValue.textContent = `${effectDurSlider.value}ms`;
	});

	// Effect color buttons
	const colorButtons = document.querySelectorAll<HTMLButtonElement>('[data-effect-color]');

	/**
	 * Handles an effect color button click.
	 *
	 * @param btn - The clicked button.
	 * @param allButtons - All color buttons for active state management.
	 */
	function handleColorClick(
		btn: HTMLButtonElement,
		allButtons: NodeListOf<HTMLButtonElement>,
	): void {
		selectedEffectColor = btn.dataset['effectColor'] ?? 'white';
		for (const b of allButtons) b.classList.remove('active');
		btn.classList.add('active');
	}

	for (const btn of colorButtons) {
		btn.addEventListener('click', () => handleColorClick(btn, colorButtons));
	}

	// Custom color picker support
	const customColorInput = document.querySelector('#effect-custom-color') as HTMLInputElement;
	customColorInput?.addEventListener('input', () => {
		selectedEffectColor = 'custom';
		// Deselect preset buttons
		for (const btn of colorButtons) btn.classList.remove('active');
	});

	// ── Screen Effects (dropdown + trigger) ────────────────────────
	let _selectedEffectType = 'flash';
	const effectDropdownContainer = document.querySelector('#effect-type-dropdown');
	if (effectDropdownContainer) {
		effectDropdownContainer.append(
			createDropdown(
				'Effect',
				[
					{ value: 'flash', label: 'Flash' },
					{ value: 'tint', label: 'Color Tint' },
					{ value: 'fadeOut', label: 'Fade Out' },
					{ value: 'fadeIn', label: 'Fade In' },
				],
				'flash',
				(val) => {
					_selectedEffectType = val;
				},
				'effect-type',
			),
		);
	}

	/**
	 * Triggers the currently selected screen effect.
	 *
	 * @param type - Effect type: 'flash' | 'tint' | 'fadeOut' | 'fadeIn'.
	 */
	function triggerEffect(type: string): void {
		const durationMs = Number(effectDurSlider?.value ?? 500);
		let color: EffectColor;
		if (selectedEffectColor === 'custom' && customColorInput) {
			const hex = customColorInput.value;
			color = {
				r: Number.parseInt(hex.slice(1, 3), 16) / 255,
				g: Number.parseInt(hex.slice(3, 5), 16) / 255,
				b: Number.parseInt(hex.slice(5, 7), 16) / 255,
				a: 0.7,
			};
		} else {
			color = EFFECT_COLORS[selectedEffectColor] ?? { r: 1, g: 1, b: 1, a: 1 };
		}
		const opts = { scene, color, durationMs };

		switch (type) {
			case 'flash': {
				screenFlash(opts);
				break;
			}
			case 'tint': {
				screenTint(opts);
				break;
			}
			case 'fadeOut': {
				if (_lastFadeOutHandle) {
					_lastFadeOutHandle.dispose();
					_lastFadeOutHandle = null;
				}
				const fadeOutResult: BabylonResult<{ dispose: () => void }> = screenFadeOut(opts);
				if (fadeOutResult.ok) _lastFadeOutHandle = fadeOutResult.data;
				break;
			}
			case 'fadeIn': {
				if (_lastFadeOutHandle) {
					_lastFadeOutHandle.dispose();
					_lastFadeOutHandle = null;
				}
				screenFadeIn(opts);
				break;
			}
		}
	}

	const effectTriggerBtn = document.querySelector('#effect-trigger-btn');
	effectTriggerBtn?.addEventListener('click', () => {
		triggerEffect(_selectedEffectType);
	});

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
): HTMLElement {
	const row = document.createElement('div');
	row.className = 'control-row';
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

	row.append(lbl, slider, valEl);
	return row;
}

/**
 * Creates a toggle row with label and toggle switch.
 *
 * @param label - Display label text.
 * @param initialOn - Whether the toggle starts in the "on" state.
 * @param onChange - Callback when toggle changes.
 * @param dataControl - Optional data-control attribute value.
 * @returns The row element.
 */
function createToggleRow(
	label: string,
	initialOn: boolean,
	onChange: (on: boolean) => void,
	dataControl?: string,
): HTMLElement {
	const row = document.createElement('div');
	row.className = 'toggle-row';
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

	row.append(lbl, toggle);
	return row;
}

/**
 * Creates a text input row with label and editable text field.
 *
 * @param label - Display label text.
 * @param value - Initial text value.
 * @param onChange - Callback when text changes (on blur or Enter key).
 * @returns The row element.
 */
function createTextInputRow(
	label: string,
	value: string,
	onChange: (val: string) => void,
): HTMLElement {
	const row = document.createElement('div');
	row.className = 'control-row';

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

	row.append(lbl, input);
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
	chevron.textContent = '\u25BE'; // ▾

	header.append(label, chevron);
	header.addEventListener('click', () => {
		root.classList.toggle('collapsed');
	});

	const body: HTMLElement = document.createElement('div');
	body.className = 'cg-body';

	root.append(header, body);
	return { root, body };
}

/**
 * Creates a control-row with label and styled dropdown.
 *
 * @param label - Display label text.
 * @param options - Array of option strings.
 * @param active - Currently selected option.
 * @param onChange - Callback when selection changes.
 * @param dataControl - Optional data-control attribute value.
 * @returns The row element.
 */
function createDropdown(
	label: string,
	options: ReadonlyArray<string | { readonly value: string; readonly label: string }>,
	active: string,
	onChange: (value: string) => void,
	dataControl?: string,
): HTMLElement {
	const row = document.createElement('div');
	row.className = 'control-row';
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

	row.append(lbl, select);
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
	container.append(createSubHeader('Exposure / Contrast'));
	container.append(
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
		),
	);
	container.append(
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
		),
	);

	// ── Bloom ──
	container.append(createSubHeader('Bloom'));
	container.append(
		createToggleRow(
			'Enabled',
			pipeline.bloomEnabled,
			(on) => {
				pipeline.bloomEnabled = on;
			},
			'postfx-bloom-enabled',
		),
	);
	container.append(
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
		),
	);
	container.append(
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
		),
	);
	container.append(
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
		),
	);
	container.append(
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
		),
	);

	// ── Depth of Field ──
	container.append(createSubHeader('Depth of Field'));
	container.append(
		createToggleRow(
			'Enabled',
			pipeline.depthOfFieldEnabled,
			(on) => {
				pipeline.depthOfFieldEnabled = on;
			},
			'postfx-dof-enabled',
		),
	);
	container.append(
		createSliderRow(
			'DoF Focal Length',
			0,
			200,
			1,
			pipeline.depthOfField.focalLength,
			(v) => {
				pipeline.depthOfField.focalLength = v;
			},
			'postfx-dof-focal-length',
		),
	);
	container.append(
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
		),
	);
	container.append(
		createSliderRow(
			'DoF Focus Dist',
			0,
			500_000,
			1000,
			pipeline.depthOfField.focusDistance,
			(v) => {
				pipeline.depthOfField.focusDistance = v;
			},
			'postfx-dof-focus-dist',
		),
	);

	// ── Chromatic Aberration ──
	container.append(createSubHeader('Chromatic Aberration'));
	container.append(
		createToggleRow(
			'Enabled',
			pipeline.chromaticAberrationEnabled,
			(on) => {
				pipeline.chromaticAberrationEnabled = on;
			},
			'postfx-ca-enabled',
		),
	);
	container.append(
		createSliderRow(
			'CA Strength',
			0,
			200,
			1,
			pipeline.chromaticAberration.aberrationAmount,
			(v) => {
				pipeline.chromaticAberration.aberrationAmount = v;
			},
			'postfx-ca-amount',
		),
	);
	container.append(
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
		),
	);

	// ── Film Grain ──
	container.append(createSubHeader('Film Grain'));
	container.append(
		createToggleRow(
			'Enabled',
			pipeline.grainEnabled,
			(on) => {
				pipeline.grainEnabled = on;
			},
			'postfx-grain-enabled',
		),
	);
	container.append(
		createSliderRow(
			'Grain Amount',
			0,
			100,
			1,
			pipeline.grain.intensity,
			(v) => {
				pipeline.grain.intensity = v;
			},
			'postfx-grain-intensity',
		),
	);
	container.append(
		createToggleRow(
			'Grain Animated',
			pipeline.grain.animated,
			(on) => {
				pipeline.grain.animated = on;
			},
			'postfx-grain-animated',
		),
	);

	// ── Sharpen ──
	container.append(createSubHeader('Sharpen'));
	container.append(
		createToggleRow(
			'Enabled',
			pipeline.sharpenEnabled,
			(on) => {
				pipeline.sharpenEnabled = on;
			},
			'postfx-sharpen-enabled',
		),
	);
	container.append(
		createSliderRow(
			'Sharpen Edge',
			0,
			2,
			0.05,
			pipeline.sharpen.edgeAmount,
			(v) => {
				pipeline.sharpen.edgeAmount = v;
			},
			'postfx-sharpen-edge',
		),
	);
	container.append(
		createSliderRow(
			'Sharpen Color',
			0,
			1,
			0.05,
			pipeline.sharpen.colorAmount,
			(v) => {
				pipeline.sharpen.colorAmount = v;
			},
			'postfx-sharpen-color',
		),
	);

	// ── Vignette ──
	container.append(createSubHeader('Vignette'));
	const imgProc = pipeline.imageProcessing;
	container.append(
		createToggleRow(
			'Enabled',
			imgProc.vignetteEnabled,
			(on) => {
				imgProc.vignetteEnabled = on;
			},
			'postfx-vignette-enabled',
		),
	);
	container.append(
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
		),
	);
	container.append(
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
		),
	);

	// ── Tone Mapping ──
	container.append(createSubHeader('Tone Mapping'));
	container.append(
		createToggleRow(
			'Enabled',
			imgProc.toneMappingEnabled,
			(on) => {
				imgProc.toneMappingEnabled = on;
			},
			'postfx-tonemapping-enabled',
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
	container.append(
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
		),
	);

	// ── Color Grading ──
	container.append(createSubHeader('Color Grading'));
	container.append(
		createToggleRow(
			'Enabled',
			imgProc.colorCurvesEnabled,
			(on) => {
				imgProc.colorCurvesEnabled = on;
			},
			'postfx-colorgrading-enabled',
		),
	);

	// ── FXAA ──
	container.append(createSubHeader('FXAA'));
	container.append(
		createToggleRow(
			'Enabled',
			pipeline.fxaaEnabled,
			(on) => {
				pipeline.fxaaEnabled = on;
			},
			'postfx-fxaa-enabled',
		),
	);

	// ── Dithering ──
	container.append(createSubHeader('Dithering'));
	container.append(
		createToggleRow(
			'Enabled',
			imgProc.ditheringEnabled,
			(on) => {
				imgProc.ditheringEnabled = on;
			},
			'postfx-dithering-enabled',
		),
	);
	container.append(
		createSliderRow(
			'Dither Amount',
			0,
			1,
			0.001,
			imgProc.ditheringIntensity,
			(v) => {
				imgProc.ditheringIntensity = v;
			},
			'postfx-dithering-intensity',
		),
	);

	// ── SSAO ──
	const ssao = pp.ssaoPipeline;
	if (ssao) {
		container.append(createSubHeader('SSAO'));
		container.append(
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
			),
		);
		container.append(
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
			),
		);
		container.append(
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
			),
		);
		container.append(
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
			),
		);
	}
}

// =============================================================================
// Fog UI Builder
// =============================================================================

/**
 * Builds fog controls.
 *
 * @param scene - The Babylon.js scene.
 */
function buildFogUI(scene: BABYLON.Scene): void {
	const container = document.querySelector('#fog-body') as HTMLElement | null;
	if (!container) return;

	container.innerHTML = '';

	// Determine current fog mode name from Babylon constant
	let currentMode = 'none';
	if (scene.fogMode === BABYLON.Scene.FOGMODE_LINEAR) {
		currentMode = 'linear';
	} else if (scene.fogMode === BABYLON.Scene.FOGMODE_EXP) {
		currentMode = 'exponential';
	} else if (scene.fogMode === BABYLON.Scene.FOGMODE_EXP2) {
		currentMode = 'exponential2';
	}

	container.append(
		createDropdown(
			'Mode',
			[
				{ value: 'none', label: 'None' },
				{ value: 'linear', label: 'Linear' },
				{ value: 'exponential', label: 'Exponential' },
				{ value: 'exponential2', label: 'Exponential²' },
			],
			currentMode,
			(mode) => {
				switch (mode) {
					case 'linear': {
						scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
						break;
					}
					case 'exponential': {
						scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
						break;
					}
					case 'exponential2': {
						scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
						break;
					}
					default: {
						scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
					}
				}
			},
			'fog-mode',
		),
	);

	container.append(
		createSliderRow(
			'Density',
			0,
			0.1,
			0.001,
			scene.fogDensity,
			(v) => {
				scene.fogDensity = v;
			},
			'fog-density',
		),
	);
	container.append(
		createSliderRow(
			'Start',
			0,
			500,
			5,
			scene.fogStart,
			(v) => {
				scene.fogStart = v;
			},
			'fog-start',
		),
	);
	container.append(
		createSliderRow(
			'End',
			10,
			1000,
			10,
			scene.fogEnd,
			(v) => {
				scene.fogEnd = v;
			},
			'fog-end',
		),
	);
	container.append(
		createSliderRow(
			'Color R',
			0,
			1,
			0.01,
			scene.fogColor.r,
			(v) => {
				scene.fogColor.r = v;
			},
			'fog-r',
		),
	);
	container.append(
		createSliderRow(
			'Color G',
			0,
			1,
			0.01,
			scene.fogColor.g,
			(v) => {
				scene.fogColor.g = v;
			},
			'fog-g',
		),
	);
	container.append(
		createSliderRow(
			'Color B',
			0,
			1,
			0.01,
			scene.fogColor.b,
			(v) => {
				scene.fogColor.b = v;
			},
			'fog-b',
		),
	);
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

	container.append(
		createToggleRow(
			'Enabled',
			glow.isEnabled,
			(on) => {
				glow.isEnabled = on;
			},
			'glow-enabled',
		),
	);
	container.append(
		createSliderRow(
			'Intensity',
			0,
			5,
			0.05,
			glow.intensity,
			(v) => {
				glow.intensity = v;
			},
			'glow-intensity',
		),
	);
	container.append(
		createSliderRow(
			'Blur Kernel',
			1,
			256,
			1,
			glow.blurKernelSize,
			(v) => {
				glow.blurKernelSize = v;
			},
			'glow-blur-kernel',
		),
	);
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
	upBtn.textContent = '\u25B2'; // ▲
	upBtn.title = 'Move layer up';
	upBtn.disabled = index === 0;
	upBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		onReorder(index, index - 1);
	});

	const downBtn: HTMLButtonElement = document.createElement('button');
	downBtn.textContent = '\u25BC'; // ▼
	downBtn.title = 'Move layer down';
	downBtn.disabled = index === totalLayers - 1;
	downBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		onReorder(index, index + 1);
	});

	reorderWrap.append(upBtn, downBtn);

	const chevron: HTMLElement = document.createElement('span');
	chevron.className = 'layer-chevron';
	chevron.textContent = '\u25BE'; // ▾

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
		),
	);

	// -- Visual group (collapsed) --
	const visual = createCollapsibleGroup('Visual', true);
	visual.body.append(
		createSliderRow('Tint R', 0, 1, 0.01, layer.tintColor.r, noop, `layer-${idx}-tint-r`),
	);
	visual.body.append(
		createSliderRow('Tint G', 0, 1, 0.01, layer.tintColor.g, noop, `layer-${idx}-tint-g`),
	);
	visual.body.append(
		createSliderRow('Tint B', 0, 1, 0.01, layer.tintColor.b, noop, `layer-${idx}-tint-b`),
	);
	visual.body.append(
		createSliderRow('Tint A', 0, 1, 0.01, layer.tintColor.a, noop, `layer-${idx}-tint-a`),
	);
	visual.body.append(
		createSliderRow('Brightness', -1, 1, 0.01, layer.brightness, noop, `layer-${idx}-brightness`),
	);
	visual.body.append(
		createSliderRow('Saturation', 0, 2, 0.01, layer.saturation, noop, `layer-${idx}-saturation`),
	);
	visual.body.append(
		createSliderRow('Contrast', 0, 2, 0.01, layer.contrast, noop, `layer-${idx}-contrast`),
	);
	body.append(visual.root);

	// -- Transform group (collapsed) --
	const transform = createCollapsibleGroup('Transform', true);
	transform.body.append(
		createSliderRow('Offset X', -100, 100, 1, layer.offsetX, noop, `layer-${idx}-offset-x`),
	);
	transform.body.append(
		createSliderRow('Offset Y', -100, 100, 1, layer.offsetY, noop, `layer-${idx}-offset-y`),
	);
	transform.body.append(createToggleRow('Locked', layer.locked, noop, `layer-${idx}-locked`));
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
			),
		);
		body.append(parallax.root);

		const rendering = createCollapsibleGroup('Rendering', true);
		rendering.body.append(
			createSliderRow('Scale X', 0.1, 10, 0.1, layer.scaleX, noop, `layer-${idx}-scale-x`),
		);
		rendering.body.append(
			createSliderRow('Scale Y', 0.1, 10, 0.1, layer.scaleY, noop, `layer-${idx}-scale-y`),
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
			),
		);
		rendering.body.append(
			createToggleRow('Cast Shadows', layer.castShadows, noop, `layer-${idx}-castshadows`),
		);
		rendering.body.append(
			createToggleRow('Receive Shadows', layer.receiveShadows, noop, `layer-${idx}-receiveshadows`),
		);
		rendering.body.append(
			createToggleRow('Depth Write', layer.depthWrite, noop, `layer-${idx}-depthwrite`),
		);
		rendering.body.append(
			createToggleRow('Y-Sort', layer.ySortEnabled, noop, `layer-${idx}-ysort`),
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

/**
 * Closes the floating tile picker panel if it is currently open.
 */
function closeTilePickerPanel(): void {
	if (_tilePickerPanel) {
		_tilePickerPanel.remove();
		_tilePickerPanel = null;
	}
}

/**
 * Opens (or focuses) a floating tile picker panel with the full tileset
 * atlas. Clicking a tile in the palette replaces the currently selected
 * map tile. The panel is draggable via its title bar.
 *
 * @param debug - Debug API reference.
 * @param tilemap - The rendered tilemap.
 */
function openTilePickerPanel(debug: DevDebugApi, tilemap: RenderedTilemap): void {
	// If already open, just bring to front
	if (_tilePickerPanel && document.body.contains(_tilePickerPanel)) {
		_tilePickerPanel.style.zIndex = '10001';
		return;
	}

	// Create floating panel
	const panel: HTMLElement = document.createElement('div');
	panel.style.cssText = [
		'position:fixed',
		'top:80px',
		'left:320px',
		'width:auto',
		'max-width:420px',
		'max-height:70vh',
		'background:#1a1a1a',
		'border:1px solid #444',
		'border-radius:6px',
		'box-shadow:0 4px 16px rgba(0,0,0,0.6)',
		'z-index:10001',
		'display:flex',
		'flex-direction:column',
		'font-family:monospace',
		'font-size:11px',
		'color:#ccc',
	].join(';');
	_tilePickerPanel = panel;

	// Title bar (draggable)
	const titleBar: HTMLElement = document.createElement('div');
	titleBar.style.cssText = [
		'display:flex',
		'align-items:center',
		'justify-content:space-between',
		'padding:6px 10px',
		'background:#252525',
		'border-bottom:1px solid #444',
		'border-radius:6px 6px 0 0',
		'cursor:grab',
		'user-select:none',
	].join(';');
	const titleText: HTMLElement = document.createElement('span');
	titleText.textContent = 'Tile Picker';
	titleText.style.fontWeight = 'bold';
	const closeBtn: HTMLButtonElement = document.createElement('button');
	closeBtn.textContent = 'X';
	closeBtn.style.cssText =
		'background:none;border:none;color:#888;cursor:pointer;font-size:12px;font-weight:bold;';
	closeBtn.addEventListener('pointerdown', (e: PointerEvent) => {
		e.stopPropagation(); // Prevent title bar drag from intercepting
	});
	closeBtn.addEventListener('click', () => {
		panel.remove();
		_tilePickerPanel = null;
	});
	titleBar.append(titleText, closeBtn);
	panel.append(titleBar);

	// Make draggable
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

	// Content area (scrollable)
	const content: HTMLElement = document.createElement('div');
	content.style.cssText = 'padding:8px;overflow-y:auto;flex:1;';

	// Tileset selector dropdown (if multiple tilesets)
	const tilesetNames: string[] = tilemap.tilesets.map((ts) => ts.config.name);
	let pickerTsIdx: Num = 0;

	const paletteCanvas: HTMLCanvasElement = document.createElement('canvas');
	paletteCanvas.style.cssText =
		'border:1px solid #555;background:#111;image-rendering:pixelated;cursor:crosshair;';

	/**
	 * Draws a highlight rectangle around a tile in the palette canvas.
	 *
	 * @param ctx - Canvas rendering context.
	 * @param localIdx - Local tile index to highlight (-1 for none).
	 * @param columns - Number of columns in the tileset.
	 * @param tileWidth - Width of each tile in pixels.
	 * @param tileHeight - Height of each tile in pixels.
	 */
	const drawPaletteHighlight = (
		ctx: CanvasRenderingContext2D,
		localIdx: Num,
		columns: Num,
		tileWidth: Num,
		tileHeight: Num,
	): void => {
		if (localIdx < 0) return;
		const hCol: Num = localIdx % columns;
		const hRow: Num = Math.floor(localIdx / columns);
		ctx.strokeStyle = '#00ffff';
		ctx.lineWidth = 2;
		ctx.strokeRect(hCol * tileWidth + 1, hRow * tileHeight + 1, tileWidth - 2, tileHeight - 2);
	};

	/**
	 * Returns the local tile index within the given tileset for the
	 * currently inspected map tile, or -1 if not in that tileset.
	 *
	 * @param tsIdx - Tileset index to check against.
	 * @returns Local tile index or -1.
	 */
	const getSelectedLocalForTileset = (tsIdx: Num): Num => {
		if (_lastInspectX < 0 || _lastInspectZ < 0) return -1;
		const currentTm: RenderedTilemap | null = debug.tilemap;
		if (!currentTm) return -1;
		const tileIndex: Num = _lastInspectZ * currentTm.mapData.width + _lastInspectX;
		const globalId: Num = lookupTileAtIndex(currentTm, tileIndex);
		if (globalId === 0) return -1;
		const ts = currentTm.tilesets[tsIdx];
		if (!ts) return -1;
		const { firstGid, columns, rows } = ts.config;
		const local: Num = globalId - firstGid;
		if (local < 0 || local >= columns * rows) return -1;
		return local;
	};

	/**
	 * Draws the tileset atlas onto the palette canvas, scaling to fit
	 * the panel width while maintaining the pixel-art look.
	 *
	 * @param tsIdx - Index of the tileset to draw.
	 */
	const drawPalette = (tsIdx: Num): void => {
		const ts = tilemap.tilesets[tsIdx];
		if (!ts) return;
		const { columns, rows, tileWidth, tileHeight } = ts.config;
		paletteCanvas.width = columns * tileWidth;
		paletteCanvas.height = rows * tileHeight;
		const ctx: CanvasRenderingContext2D | null = paletteCanvas.getContext('2d');
		if (!ctx) return;
		ctx.clearRect(0, 0, paletteCanvas.width, paletteCanvas.height);

		const selectedLocal: Num = getSelectedLocalForTileset(tsIdx);

		const imgUrl: string = ts.texture.name;
		const cached: HTMLImageElement | undefined = _tilesetImages.get(imgUrl);
		if (cached?.complete) {
			ctx.drawImage(cached, 0, 0);
			drawPaletteHighlight(ctx, selectedLocal, columns, tileWidth, tileHeight);
			return;
		}
		if (!cached) {
			const img: HTMLImageElement = document.createElement('img');
			img.crossOrigin = 'anonymous';
			img.src = imgUrl;
			_tilesetImages.set(imgUrl, img);
			img.addEventListener('load', () => {
				ctx.drawImage(img, 0, 0);
				drawPaletteHighlight(ctx, selectedLocal, columns, tileWidth, tileHeight);
			});
		}
	};

	if (tilesetNames.length > 1) {
		const dropRow: HTMLElement = createDropdown(
			'Tileset',
			tilesetNames,
			tilesetNames[0] ?? '',
			(val: string) => {
				pickerTsIdx = tilesetNames.indexOf(val);
				drawPalette(pickerTsIdx);
			},
		);
		content.append(dropRow);
	}

	content.append(paletteCanvas);

	// Click on palette to change the selected map tile
	paletteCanvas.addEventListener('pointerdown', (evt: PointerEvent) => {
		if (_lastInspectX < 0 || _lastInspectZ < 0) return;
		const currentTilemap: RenderedTilemap | null = debug.tilemap;
		if (!currentTilemap) return;
		const ts = currentTilemap.tilesets[pickerTsIdx];
		if (!ts) return;

		const rect: DOMRect = paletteCanvas.getBoundingClientRect();
		const scaleX: Num = paletteCanvas.width / rect.width;
		const scaleY: Num = paletteCanvas.height / rect.height;
		const px: Num = (evt.clientX - rect.left) * scaleX;
		const py: Num = (evt.clientY - rect.top) * scaleY;

		const { columns, tileWidth, tileHeight, firstGid } = ts.config;
		const col: Num = Math.floor(px / tileWidth);
		const row: Num = Math.floor(py / tileHeight);
		const localIndex: Num = row * columns + col;
		const newGlobalId: Num = firstGid + localIndex;

		// Determine which layer to edit
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
			debug.tilemap = result.data;
			refreshInspector(result.data, _lastInspectX, _lastInspectZ);
			// Redraw palette to move highlight to the newly placed tile
			drawPalette(pickerTsIdx);
		}
	});

	panel.append(content);
	document.body.append(panel);
	drawPalette(0);
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
	);
	controlsWrap.append(layerSelectRow);

	// -- Identity (expanded by default — most-used) --
	const identity = createCollapsibleGroup('Identity', false);
	identity.body.append(infoRow('Tile ID (global)', 'ti-global-id'));
	identity.body.append(infoRow('Tile ID (local)', 'ti-local-id'));
	identity.body.append(infoRow('Tileset', 'ti-tileset'));
	identity.body.append(infoRow('Grid Position', 'ti-grid-pos'));
	identity.body.append(infoRow('Layer', 'ti-layer'));
	controlsWrap.append(identity.root);

	// -- Passability (collapsed) --
	const pass = createCollapsibleGroup('Passability', true);

	const passDownRow: HTMLElement = createToggleRow('Pass Down', true, (on: boolean) => {
		writePassability(0, on);
	});
	pass.body.append(passDownRow);

	const passLeftRow: HTMLElement = createToggleRow('Pass Left', true, (on: boolean) => {
		writePassability(1, on);
	});
	pass.body.append(passLeftRow);

	const passRightRow: HTMLElement = createToggleRow('Pass Right', true, (on: boolean) => {
		writePassability(2, on);
	});
	pass.body.append(passRightRow);

	const passUpRow: HTMLElement = createToggleRow('Pass Up', true, (on: boolean) => {
		writePassability(3, on);
	});
	pass.body.append(passUpRow);

	const passAboveRow: HTMLElement = createToggleRow('Pass Above', false, (on: boolean) => {
		writeTileProp({ passAbove: on });
	});
	pass.body.append(passAboveRow);

	const passBelowRow: HTMLElement = createToggleRow('Pass Below', false, (on: boolean) => {
		writeTileProp({ passBelow: on });
	});
	pass.body.append(passBelowRow);

	const passEventRow: HTMLElement = createToggleRow('Pass Event', true, (on: boolean) => {
		writeTileProp({ passEvent: on });
	});
	pass.body.append(passEventRow);

	const starPassageRow: HTMLElement = createToggleRow('Star Passage', false, (on: boolean) => {
		writeTileProp({ starPassage: on });
	});
	pass.body.append(starPassageRow);

	const passVehicleRow: HTMLElement = createSliderRow(
		'Pass Vehicle',
		0,
		31,
		1,
		0,
		(val: number) => {
			writeTileProp({ passVehicle: val });
		},
	);
	pass.body.append(passVehicleRow);

	const passHeightRow: HTMLElement = createSliderRow('Pass Height', 0, 15, 1, 0, (val: number) => {
		writeTileProp({ passHeight: val });
	});
	pass.body.append(passHeightRow);
	controlsWrap.append(pass.root);

	// -- Terrain (collapsed) --
	const terrain = createCollapsibleGroup('Terrain', true);

	const terrainTagRow: HTMLElement = createSliderRow('Terrain Tag', 0, 15, 1, 0, (val: number) => {
		writeTileProp({ terrainTag: val });
	});
	terrain.body.append(terrainTagRow);

	const terrainTypeRow: HTMLElement = createDropdown(
		'Terrain Type',
		TERRAIN_TYPE_OPTIONS,
		'normal',
		(val: string) => {
			writeTileProp({ terrainType: val });
		},
	);
	terrain.body.append(terrainTypeRow);

	terrain.body.append(infoRow('Footstep Sound', 'ti-footstep'));

	const encounterRateRow: HTMLElement = createSliderRow(
		'Encounter Rate',
		0,
		10,
		0.1,
		1,
		(val: number) => {
			writeTileProp({ encounterRate: val });
		},
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
	);
	terrain.body.append(slipperinessRow);

	const movementSpeedRow: HTMLElement = createSliderRow(
		'Movement Speed',
		0.1,
		5,
		0.1,
		1,
		(val: number) => {
			writeTileProp({ movementSpeed: val });
		},
	);
	terrain.body.append(movementSpeedRow);

	const regionIdRow: HTMLElement = createSliderRow('Region ID', 0, 255, 1, 0, (val: number) => {
		writeTileProp({ regionId: val });
	});
	terrain.body.append(regionIdRow);
	controlsWrap.append(terrain.root);

	// -- Flags (collapsed) --
	const flags = createCollapsibleGroup('Flags', true);

	const heightRow: HTMLElement = createSliderRow('Height', 0, 15, 1, 0, (val: number) => {
		writeTileProp({ height: val });
	});
	flags.body.append(heightRow);

	const damageFloorRow: HTMLElement = createToggleRow('Damage Floor', false, (on: boolean) => {
		writeTileProp({ damageFloor: on });
	});
	flags.body.append(damageFloorRow);

	const bushRow: HTMLElement = createToggleRow('Bush', false, (on: boolean) => {
		writeTileProp({ bush: on });
	});
	flags.body.append(bushRow);

	const counterRow: HTMLElement = createToggleRow('Counter', false, (on: boolean) => {
		writeTileProp({ counter: on });
	});
	flags.body.append(counterRow);

	const ladderRow: HTMLElement = createToggleRow('Ladder', false, (on: boolean) => {
		writeTileProp({ ladder: on });
	});
	flags.body.append(ladderRow);

	const slipRow: HTMLElement = createToggleRow('Slip', false, (on: boolean) => {
		writeTileProp({ slip: on });
	});
	flags.body.append(slipRow);

	const shelterRow: HTMLElement = createToggleRow('Shelter', false, (on: boolean) => {
		writeTileProp({ shelter: on });
	});
	flags.body.append(shelterRow);

	const bushDepthRow: HTMLElement = createSliderRow('Bush Depth', 0, 48, 1, 12, (val: number) => {
		writeTileProp({ bushDepth: val });
	});
	flags.body.append(bushDepthRow);

	const coverHeightRow: HTMLElement = createSliderRow(
		'Cover Height',
		0,
		1,
		0.01,
		0,
		(val: number) => {
			writeTileProp({ coverHeight: val });
		},
	);
	flags.body.append(coverHeightRow);

	const soundAbsorbRow: HTMLElement = createToggleRow('Sound Absorb', false, (on: boolean) => {
		writeTileProp({ soundAbsorb: on });
	});
	flags.body.append(soundAbsorbRow);
	controlsWrap.append(flags.root);

	// -- Damage (collapsed) --
	const damage = createCollapsibleGroup('Damage', true);

	const damageAmountRow: HTMLElement = createSliderRow(
		'Damage Amount',
		0,
		9999,
		1,
		0,
		(val: number) => {
			writeTileProp({ damageAmount: val });
		},
	);
	damage.body.append(damageAmountRow);

	const damagePercentRow: HTMLElement = createSliderRow(
		'Damage %',
		0,
		100,
		0.1,
		0,
		(val: number) => {
			writeTileProp({ damagePercent: val });
		},
	);
	damage.body.append(damagePercentRow);

	const damageElementRow: HTMLElement = createTextInputRow('Damage Element', '', (val: string) => {
		writeTileProp({ damageElement: val });
	});
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
	);
	damage.body.append(damageIntervalRow);
	controlsWrap.append(damage.root);

	// -- Reflection (collapsed) --
	const reflect = createCollapsibleGroup('Reflection', true);

	const reflectionRow: HTMLElement = createToggleRow('Reflection', false, (on: boolean) => {
		writeTileProp({ reflection: on });
	});
	reflect.body.append(reflectionRow);

	const reflectionOpacityRow: HTMLElement = createSliderRow(
		'Reflection Opacity',
		0,
		1,
		0.01,
		0.5,
		(val: number) => {
			writeTileProp({ reflectionOpacity: val });
		},
	);
	reflect.body.append(reflectionOpacityRow);
	controlsWrap.append(reflect.root);

	// -- Glow (collapsed) --
	const glowGroup = createCollapsibleGroup('Glow', true);

	const glowRow: HTMLElement = createToggleRow('Glow', false, (on: boolean) => {
		writeTileProp({ glow: on });
	});
	glowGroup.body.append(glowRow);

	const glowColorRow: HTMLElement = createTextInputRow('Glow Color', '#ffffffff', (val: string) => {
		writeTileProp({ glowColor: val });
	});
	glowGroup.body.append(glowColorRow);

	const glowIntensityRow: HTMLElement = createSliderRow(
		'Glow Intensity',
		0,
		1,
		0.01,
		0,
		(val: number) => {
			writeTileProp({ glowIntensity: val });
		},
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

	// Create a reusable selection highlight (cyan wireframe)
	const highlightMesh: BABYLON.Mesh = BABYLON.MeshBuilder.CreateGround(
		'tile-inspector-highlight',
		{ width: 1, height: 1 },
		scene,
	);
	const highlightMat: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(
		'tile-inspector-highlight-mat',
		scene,
	);
	highlightMat.emissiveColor = new BABYLON.Color3(0, 1, 1);
	highlightMat.disableLighting = true;
	highlightMat.wireframe = true;
	highlightMat.zOffset = -2;
	highlightMesh.material = highlightMat;
	highlightMesh.enableEdgesRendering();
	highlightMesh.edgesWidth = 16;
	highlightMesh.edgesColor = new BABYLON.Color4(0, 1, 1, 1);
	highlightMesh.renderingGroupId = 1;
	highlightMesh.isPickable = false;
	highlightMesh.setEnabled(false);

	// Store highlight mesh globally for rectangular selection scaling
	(window as Record<string, unknown>)._highlightMesh = highlightMesh;

	// Attach canvas click handler
	const canvas: HTMLCanvasElement | null =
		document.querySelector<HTMLCanvasElement>('#game-canvas');
	if (!canvas) return;

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

			const onUp = (): void => {
				_isRectSelecting = false;
				canvas.removeEventListener('pointermove', onMove);
				canvas.removeEventListener('pointerup', onUp);
			};

			canvas.addEventListener('pointermove', onMove);
			canvas.addEventListener('pointerup', onUp);
			return;
		}

		// ── Normal click: clear rectangular selection, single-tile inspect ──
		_selStartX = -1;
		_selStartZ = -1;
		_selEndX = -1;
		_selEndZ = -1;

		// Position the highlight mesh over the selected tile (use picked Y for cliffs)
		const highlightY: Num = pickResult.pickedPoint.y + 0.02;
		highlightMesh.scaling.set(1, 1, 1);
		highlightMesh.position.set(gridX + 0.5, highlightY, gridZ + 0.5);
		highlightMesh.setEnabled(true);

		// Cache grid position for re-inspection when switching layers
		_lastInspectX = gridX;
		_lastInspectZ = gridZ;

		// Enable selection-dependent buttons in the Navigation section
		const selBtnRef = (window as Record<string, unknown>)._selBtn as HTMLButtonElement | undefined;
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
	});
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
		previewLabel.textContent = `${tilesetName} #${String(localId)} (${String(gridX)}, ${String(gridZ)})`;
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
		const row = document.createElement('div');
		row.style.cssText =
			'padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); margin-bottom: 2px;';

		// Light name + type header with type badge
		const header = document.createElement('div');
		header.style.cssText = 'display: flex; align-items: center; gap: 6px; padding-bottom: 4px;';

		const typeBadge = document.createElement('span');
		const typeColors: Record<string, string> = {
			hemispheric: '#6ab',
			directional: '#5b9',
			point: '#b96',
			spot: '#8bb',
		};
		const typeColor = typeColors[ml.config.type] ?? '#888';
		typeBadge.style.cssText = `font-size: 8px; padding: 1px 5px; border-radius: 3px; background: ${typeColor}22; color: ${typeColor}; border: 1px solid ${typeColor}44; text-transform: uppercase; letter-spacing: 0.5px;`;
		typeBadge.textContent = ml.config.type;

		const label = document.createElement('span');
		label.style.cssText = 'font-size: 10px; color: #ccc; font-weight: 600;';
		const lightDisplayName = ml.config.id
			.replaceAll('_', ' ')
			.replaceAll('-', ' ')
			.split(' ')
			.map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
			.join(' ');
		label.textContent = lightDisplayName;

		header.append(typeBadge, label);
		row.append(header);

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
				),
			);
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
				),
			);
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
				),
			);
		}

		// Features badges
		const badges = document.createElement('div');
		badges.style.cssText = 'display: flex; gap: 3px; flex-wrap: wrap; padding: 3px 0 1px;';

		if (ml.shadowGenerator) addBadge(badges, 'Shadow', '#8a8');
		if (ml.flickerInstance) addBadge(badges, 'Flicker', '#aa8');
		if (ml.volumetricPostProcess) addBadge(badges, 'God Rays', '#8ab');
		if (ml.lensFlareSystem) addBadge(badges, 'Flares', '#ab8');

		if (badges.childElementCount > 0) row.append(badges);

		container.append(row);
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
 * @returns The row element.
 */
function infoRow(label: string, id: string): HTMLElement {
	const row = document.createElement('div');
	row.className = 'control-row';
	const lbl = document.createElement('span');
	lbl.className = 'control-label';
	lbl.textContent = label;
	const val = document.createElement('span');
	val.className = 'control-value';
	val.id = id;
	val.textContent = '--';
	row.append(lbl, val);
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
	container.append(infoRow('FPS', 'info-fps'));
	container.append(infoRow('Frame Time', 'info-frametime'));
	container.append(infoRow('Draw Calls', 'info-drawcalls'));
	container.append(infoRow('Active Meshes', 'info-active-meshes'));
	container.append(infoRow('Total Triangles', 'info-triangles'));

	// ── Scene ──
	container.append(createSubHeader('Scene'));
	container.append(infoRow('Total Meshes', 'info-total-meshes'));
	container.append(infoRow('Total Materials', 'info-materials'));
	container.append(infoRow('Total Textures', 'info-textures'));
	container.append(infoRow('Total Lights', 'info-total-lights'));
	container.append(infoRow('Effect Layers', 'info-effect-layers'));
	container.append(infoRow('Particle Systems', 'info-particles'));
	container.append(infoRow('Animations', 'info-animations'));

	// ── Renderer ──
	container.append(createSubHeader('Renderer'));
	container.append(infoRow('Backend', 'info-backend'));
	container.append(infoRow('GPU', 'info-gpu'));
	container.append(infoRow('Resolution', 'info-resolution'));
	container.append(infoRow('Pixel Ratio', 'info-pixel-ratio'));
	container.append(infoRow('Hardware Scale', 'info-hw-scale'));
	container.append(infoRow('Antialias', 'info-antialias'));

	// ── Camera ──
	container.append(createSubHeader('Camera'));
	container.append(infoRow('Type', 'info-cam-type'));
	container.append(infoRow('Position', 'info-cam-pos'));
	container.append(infoRow('Target', 'info-cam-target'));
	container.append(infoRow('FOV', 'info-cam-fov'));
	container.append(infoRow('Near / Far', 'info-cam-clip'));

	// ── Tilemap ──
	container.append(createSubHeader('Tilemap'));
	container.append(infoRow('Chunks', 'info-chunks'));
	container.append(infoRow('Cliff Chunks', 'info-cliff-chunks'));
	container.append(infoRow('Map Layers', 'info-map-layers'));
	container.append(infoRow('Map Size', 'info-map-size'));

	// ── Lighting ──
	container.append(createSubHeader('Lighting'));
	container.append(infoRow('Time of Day', 'info-time'));
	container.append(infoRow('Cycle Speed', 'info-cycle-speed'));
	container.append(infoRow('Lights', 'info-light-breakdown'));
	container.append(infoRow('Shadow Gens', 'info-shadow-gens'));
	container.append(infoRow('Shadow Map', 'info-shadow-map'));
	container.append(infoRow('Glow Layer', 'info-glow'));
	container.append(infoRow('Post-Processing', 'info-postfx'));

	// ── Environment ──
	container.append(createSubHeader('Environment'));
	container.append(infoRow('Sky Type', 'info-sky-type'));
	container.append(infoRow('Sky Texture', 'info-sky-texture'));
	container.append(infoRow('Parallax Layers', 'info-parallax-layers'));
	container.append(infoRow('Parallax Type', 'info-parallax-types'));
	container.append(infoRow('Stars', 'info-stars'));

	// ── Memory ──
	container.append(createSubHeader('Memory'));
	container.append(infoRow('Geometries', 'info-geometries'));
	container.append(infoRow('Buffers (Vertex)', 'info-vertex-buffers'));
	container.append(infoRow('Compile Count', 'info-compile'));

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

/** Zoom preset multipliers for the navigation section buttons. */
const ZOOM_PRESETS: readonly number[] = [1, 2, 4, 8, 16];

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
	fallbackDiv.textContent = 'Switch to Map Editor preset';
	fallbackDiv.style.display = _currentPreset === 'mapeditor' ? 'none' : 'block';
	controlsDiv.style.display = _currentPreset === 'mapeditor' ? 'block' : 'none';
	container.append(fallbackDiv, controlsDiv);

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
	zoomSlider.min = '1.0';
	zoomSlider.max = '16.0';
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

	zoomSliderRow.append(zoomLabel, zoomSlider, zoomValSpan);
	controlsDiv.append(zoomSliderRow);

	// ── 2b. Custom Zoom Input ──
	const customZoomRow: HTMLDivElement = document.createElement('div');
	customZoomRow.className = 'control-row';
	customZoomRow.style.gap = '4px';
	customZoomRow.style.alignItems = 'center';

	const customLabel: HTMLSpanElement = document.createElement('span');
	customLabel.className = 'control-label';
	customLabel.textContent = 'Custom';
	customLabel.style.flex = 'none';
	customLabel.style.minWidth = 'auto';

	const customInput: HTMLInputElement = document.createElement('input');
	customInput.type = 'number';
	customInput.className = 'nav-input';
	customInput.min = '1';
	customInput.max = '16';
	customInput.step = '0.1';
	customInput.value = getZoomMultiplier().toFixed(1);
	customInput.title = 'Enter zoom multiplier (1–16)';

	const applyBtn: HTMLButtonElement = document.createElement('button');
	applyBtn.className = 'btn';
	applyBtn.textContent = 'Apply';
	applyBtn.style.marginLeft = 'auto';

	const doCustomZoom = (): void => {
		const val: number = Math.max(1, Math.min(16, Number.parseFloat(customInput.value) || 1));
		customInput.value = val.toFixed(1);
		setZoomLevel(val, cam, scene);
	};

	applyBtn.addEventListener('click', doCustomZoom);
	customInput.addEventListener('keydown', (e: KeyboardEvent) => {
		if (e.key === 'Enter') doCustomZoom();
	});

	customZoomRow.append(customLabel, customInput, applyBtn);
	controlsDiv.append(customZoomRow);

	// ── 3. Action Buttons ──
	controlsDiv.append(createSubHeader('Actions'));

	const actionGroup: HTMLDivElement = document.createElement('div');
	actionGroup.className = 'btn-group';
	actionGroup.style.padding = '2px 0';

	const fitBtn: HTMLButtonElement = document.createElement('button');
	fitBtn.className = 'btn';
	fitBtn.textContent = 'Fit Map';
	fitBtn.title = 'Zoom to show the entire map';
	fitBtn.addEventListener('click', () => {
		setZoomLevel(1, cam, scene);
		cam.target.x = (MAP_MIN + MAP_MAX) / 2;
		cam.target.z = (MAP_MIN + MAP_MAX) / 2;
		clampCameraToMap(cam, scene);
		updateScrollbars(cam, scene);
	});

	const resetBtn: HTMLButtonElement = document.createElement('button');
	resetBtn.className = 'btn';
	resetBtn.textContent = 'Reset';
	resetBtn.title = 'Reset camera to default position and zoom';
	resetBtn.addEventListener('click', () => {
		setZoomLevel(1, cam, scene);
		cam.target.x = (MAP_MIN + MAP_MAX) / 2;
		cam.target.z = (MAP_MIN + MAP_MAX) / 2;
		clampCameraToMap(cam, scene);
		updateScrollbars(cam, scene);
	});

	const selBtn: HTMLButtonElement = document.createElement('button');
	selBtn.className = 'btn';
	selBtn.textContent = 'To Selection';
	selBtn.title = 'Zoom to last selected tile at 4x';
	selBtn.disabled = _lastInspectX < 0 || _lastInspectZ < 0;
	selBtn.addEventListener('click', () => {
		if (_lastInspectX < 0 || _lastInspectZ < 0) return;
		navigateToTile(_lastInspectX, _lastInspectZ, cam, scene);
		setZoomLevel(4, cam, scene);
	});

	const centerBtn: HTMLButtonElement = document.createElement('button');
	centerBtn.className = 'btn';
	centerBtn.textContent = 'Center';
	centerBtn.title = 'Center on selected tile (keep current zoom)';
	centerBtn.disabled = _lastInspectX < 0 || _lastInspectZ < 0;
	centerBtn.addEventListener('click', () => {
		if (_lastInspectX < 0 || _lastInspectZ < 0) return;
		navigateToTile(_lastInspectX, _lastInspectZ, cam, scene);
	});

	// Store refs for enabling when a tile is selected
	(window as Record<string, unknown>)._selBtn = selBtn;
	(window as Record<string, unknown>)._centerBtn = centerBtn;

	actionGroup.append(fitBtn, resetBtn, selBtn, centerBtn);
	controlsDiv.append(actionGroup);

	// ── 3b. View Toggles ──
	controlsDiv.append(createSubHeader('View'));

	const gridToggleRow: HTMLElement = createToggleRow('Grid Overlay (G)', _gridVisible, () => {
		toggleGridOverlay(scene, debug);
	});
	controlsDiv.append(gridToggleRow);

	// Store grid toggle checkbox ref so G key can sync it
	const gridCheckbox = gridToggleRow.querySelector(
		'input[type="checkbox"]',
	) as HTMLInputElement | null;
	if (gridCheckbox) {
		(window as Record<string, unknown>)._gridToggle = gridCheckbox;
	}

	// ── 4. Go To Position ──
	controlsDiv.append(createSubHeader('Go To Position'));

	const gotoRow: HTMLDivElement = document.createElement('div');
	gotoRow.className = 'control-row';
	gotoRow.style.gap = '4px';
	gotoRow.style.alignItems = 'center';

	const xLabel: HTMLSpanElement = document.createElement('span');
	xLabel.className = 'control-label';
	xLabel.textContent = 'X';
	xLabel.style.flex = 'none';
	xLabel.style.minWidth = 'auto';

	const xInput: HTMLInputElement = document.createElement('input');
	xInput.type = 'number';
	xInput.className = 'nav-input';
	xInput.min = '0';
	xInput.max = String(MAP_MAX - 1);
	xInput.value = '16';

	const zLabel: HTMLSpanElement = document.createElement('span');
	zLabel.className = 'control-label';
	zLabel.textContent = 'Z';
	zLabel.style.flex = 'none';
	zLabel.style.minWidth = 'auto';

	const zInput: HTMLInputElement = document.createElement('input');
	zInput.type = 'number';
	zInput.className = 'nav-input';
	zInput.min = '0';
	zInput.max = String(MAP_MAX - 1);
	zInput.value = '16';

	const goBtn: HTMLButtonElement = document.createElement('button');
	goBtn.className = 'btn';
	goBtn.textContent = 'Go';
	goBtn.style.marginLeft = 'auto';

	const doGoto = (): void => {
		const gx: number = Math.max(0, Math.min(MAP_MAX - 1, Number.parseInt(xInput.value, 10) || 0));
		const gz: number = Math.max(0, Math.min(MAP_MAX - 1, Number.parseInt(zInput.value, 10) || 0));
		navigateToTile(gx, gz, cam, scene);
	};

	goBtn.addEventListener('click', doGoto);
	xInput.addEventListener('keydown', (e: KeyboardEvent) => {
		if (e.key === 'Enter') doGoto();
	});
	zInput.addEventListener('keydown', (e: KeyboardEvent) => {
		if (e.key === 'Enter') doGoto();
	});

	gotoRow.append(xLabel, xInput, zLabel, zInput, goBtn);
	controlsDiv.append(gotoRow);

	// ── 5. Live Readout ──
	controlsDiv.append(createSubHeader('Position'));

	controlsDiv.append(makeNavReadout('Target X', 'nav-target-x'));
	controlsDiv.append(makeNavReadout('Target Z', 'nav-target-z'));
	controlsDiv.append(makeNavReadout('Zoom', 'nav-zoom-readout'));

	// ── 6. Per-frame readout update ──
	let navFrameCount = 0;
	scene.registerAfterRender(() => {
		navFrameCount++;
		if (navFrameCount % 6 !== 0) return;
		if (_currentPreset !== 'mapeditor') return;
		const section: Element | null = document.querySelector('#section-camera-nav');
		if (section?.classList.contains('collapsed')) return;

		// Update readout
		setInfoText('nav-target-x', cam.target.x.toFixed(1));
		setInfoText('nav-target-z', cam.target.z.toFixed(1));

		const currentMult: number = getZoomMultiplier();
		setInfoText('nav-zoom-readout', `${currentMult.toFixed(1)}x`);

		// Sync zoom slider (handles external zoom changes from wheel/keyboard)
		zoomSlider.value = String(Math.min(16.0, Math.max(1.0, currentMult)).toFixed(1));
		zoomValSpan.textContent = `${currentMult.toFixed(1)}x`;

		// Sync custom zoom input
		customInput.value = currentMult.toFixed(1);

		// Update active zoom button highlight
		for (const btn of zoomButtons) {
			const btnMult: number = Number.parseFloat(btn.dataset['zoom'] ?? '0');
			const isActive: boolean = Math.abs(currentMult - btnMult) < 0.05;
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
	container.append(createSubHeader('Sky'));

	// Sky type dropdown — disposes old sky and rebuilds with selected type
	const skyConfig = debug.tilemap?.sky;
	const currentType = skyConfig ? 'gradient' : 'color';
	container.append(
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
		container.append(pathRow);
	}

	// Clear color RGBA sliders — always useful
	const cc = scene.clearColor;
	container.append(
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
		),
	);
	container.append(
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
		),
	);
	container.append(
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
		),
	);
	container.append(
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
		),
	);

	// ── Sun sub-section — alias to directional light ("sun") ──
	const sunLight = scene.getLightByName('sun') as BABYLON.DirectionalLight | null;
	if (sunLight) {
		container.append(createSubHeader('Sun'));

		const angles = dirToAngles(sunLight.direction);

		container.append(
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
			),
		);

		container.append(
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
			),
		);

		container.append(
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
			),
		);

		// Sun color
		const sunDiffuse = sunLight.diffuse;
		container.append(
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
			),
		);
		container.append(
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
			),
		);
		container.append(
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
			),
		);
	}

	// ── Procedural sky controls ──
	const skyInstance: SkyInstance | undefined = debug.tilemap?.sky;
	if (skyInstance?.skyboxMaterial instanceof SkyMaterial) {
		container.append(createSubHeader('Procedural Sky'));
		const skyMat: SkyMaterial = skyInstance.skyboxMaterial;

		container.append(
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
			),
		);
		container.append(
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
			),
		);
		container.append(
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
			),
		);
		container.append(
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
			),
		);
	}

	// ── Stars controls ──
	if (skyInstance) {
		container.append(createSubHeader('Stars'));

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
		container.append(starPathRow);

		container.append(
			createToggleRow(
				'Enabled',
				skyInstance.starLayer !== null,
				(on) => {
					if (skyInstance.starLayer) {
						skyInstance.starLayer.isEnabled = on;
					}
				},
				'sky-stars-enabled',
			),
		);

		container.append(
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
			),
		);

		// Scale — directly adjusts texture UV scale
		const starTex = skyInstance.starLayer?.texture;
		const starScale = starTex && starTex instanceof BABYLON.Texture ? 1 / starTex.uScale : 2;
		container.append(
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
			),
		);

		// Twinkle Speed (read-only indicator — baked into observer closure)
		container.append(
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
			),
		);

		// Fade In Hour (read-only indicator — baked into observer closure)
		container.append(
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
			),
		);

		// Fade Out Hour (read-only indicator — baked into observer closure)
		container.append(
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
			),
		);
	}

	// ── Parallax sub-section ──
	const parallax: ParallaxInstance | undefined = debug.tilemap?.parallax;
	if (parallax && parallax.layers.length > 0) {
		container.append(createSubHeader('Parallax Layers'));

		// Container for dynamically-rebuilt layer sub-sections
		const layerContainer = document.createElement('div');
		layerContainer.dataset['parallaxLayers'] = 'true';
		container.append(layerContainer);

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
		container.append(btnRow);
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

	let fpsFrameCount = 0;
	runtime.engine.scene.registerAfterRender(() => {
		fpsFrameCount++;
		if (fpsFrameCount % 30 !== 0) return;

		const engine = runtime.engine.scene.getEngine();
		const fps = engine.getFps();
		if (fpsEl) fpsEl.textContent = `${fps.toFixed(0)} fps`;
		if (ftEl) ftEl.textContent = `${(1000 / Math.max(fps, 1)).toFixed(1)} ms`;
		const { scene } = runtime.engine;
		if (meshEl) meshEl.textContent = `${scene.getActiveMeshes().length} meshes`;
		if (trisEl) {
			const triCount = Math.round(scene.totalVerticesPerfCounter.current / 3);
			trisEl.textContent = `${formatLargeNumber(triCount)} tris`;
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

	// Screen vertical = X axis (halfH), screen horizontal = Z axis (halfW)
	const minX: number = MAP_MIN + halfH;
	const maxX: number = MAP_MAX - halfH;
	const minZ: number = MAP_MIN + halfW;
	const maxZ: number = MAP_MAX - halfW;

	if (minX < maxX) {
		cam.target.x = Math.max(minX, Math.min(maxX, cam.target.x));
	} else {
		cam.target.x = (MAP_MIN + MAP_MAX) / 2;
	}
	if (minZ < maxZ) {
		cam.target.z = Math.max(minZ, Math.min(maxZ, cam.target.z));
	} else {
		cam.target.z = (MAP_MIN + MAP_MAX) / 2;
	}
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

	if (_currentPreset !== 'mapeditor') {
		hBar.style.display = 'none';
		vBar.style.display = 'none';
		return;
	}

	const aspect: number = scene.getEngine().getAspectRatio(cam);
	const viewW: number = _orthoSize * aspect * 2;
	const viewH: number = _orthoSize * 2;
	const mapW: number = MAP_MAX - MAP_MIN;
	const mapH: number = MAP_MAX - MAP_MIN;

	const hRatio: number = Math.min(1, viewW / mapW);
	const vRatio: number = Math.min(1, viewH / mapH);

	// Hide scrollbars when fully zoomed out
	hBar.style.display = hRatio >= 1 ? 'none' : '';
	vBar.style.display = vRatio >= 1 ? 'none' : '';

	if (hRatio >= 1 && vRatio >= 1) return;

	// Horizontal thumb
	const hTrack: HTMLElement | null = hBar.querySelector('.sb-track');
	const vTrack: HTMLElement | null = vBar.querySelector('.sb-track');
	if (!hTrack || !vTrack) return;

	const hTrackW: number = hTrack.clientWidth;
	const vTrackH: number = vTrack.clientHeight;

	// Thumb sizes
	const hThumbW: number = Math.max(24, hRatio * hTrackW);
	const vThumbH: number = Math.max(24, vRatio * vTrackH);
	hThumb.style.width = `${String(hThumbW)}px`;
	vThumb.style.height = `${String(vThumbH)}px`;

	// Camera position → thumb position
	// Screen right = world +Z → horizontal scrollbar tracks Z
	// Screen down = world +X → vertical scrollbar tracks X
	const halfW: number = _orthoSize * aspect;
	const halfH: number = _orthoSize;
	const minTZ: number = MAP_MIN + halfW;
	const maxTZ: number = MAP_MAX - halfW;
	const minTX: number = MAP_MIN + halfH;
	const maxTX: number = MAP_MAX - halfH;

	const hProgress: number = maxTZ > minTZ ? (cam.target.z - minTZ) / (maxTZ - minTZ) : 0.5;
	const vProgress: number = maxTX > minTX ? (cam.target.x - minTX) / (maxTX - minTX) : 0.5;

	hThumb.style.left = `${String(Math.max(0, Math.min(hTrackW - hThumbW, hProgress * (hTrackW - hThumbW))))}px`;
	vThumb.style.top = `${String(Math.max(0, Math.min(vTrackH - vThumbH, vProgress * (vTrackH - vThumbH))))}px`;
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

		// Set initial ortho size to fill viewport with no gap
		_orthoSize = computeOrthoMax();
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
			if (_currentPreset !== 'mapeditor') return;
			evt.preventDefault();

			const aspect: number = scene.getEngine().getAspectRatio(cam);

			// Ctrl+scroll or pinch-to-zoom → zoom toward cursor
			if (evt.ctrlKey || evt.metaKey) {
				const orthoMax: number = computeOrthoMax();
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
				_orthoSize = Math.max(ORTHO_MIN, Math.min(orthoMax, _orthoSize * factor));

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
				return;
			}

			// Plain scroll → pan (deltaX = horizontal, deltaY = vertical)
			const panSpeed: number = _orthoSize * 0.002;
			// screen right = world +Z, screen up = world -X
			cam.target.z += evt.deltaX * panSpeed;
			cam.target.x += evt.deltaY * panSpeed;
			clampCameraToMap(cam, scene);
			updateScrollbars(cam, scene);
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

		if (_currentPreset !== 'mapeditor') return;

		// Delete/Backspace clears the selected tile(s) in map editor mode
		if (e.key === 'Delete' || e.key === 'Backspace') {
			e.preventDefault();
			const rect = getSelectionRect();
			if (rect) {
				clearSelectionRect(debug);
			} else {
				clearSelectedTile(debug);
			}
		}

		// G toggles grid overlay
		if (e.key === 'g' || e.key === 'G') {
			toggleGridOverlay(runtime.engine.scene, debug);
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
		if (_heldKeys.has('w') || _heldKeys.has('W') || _heldKeys.has('ArrowUp')) cam.target.x -= speed;
		if (_heldKeys.has('s') || _heldKeys.has('S') || _heldKeys.has('ArrowDown'))
			cam.target.x += speed;
		if (_heldKeys.has('a') || _heldKeys.has('A') || _heldKeys.has('ArrowLeft'))
			cam.target.z -= speed;
		if (_heldKeys.has('d') || _heldKeys.has('D') || _heldKeys.has('ArrowRight'))
			cam.target.z += speed;

		clampCameraToMap(cam, scene);
		updateScrollbars(cam, scene);

		// Hide 3D meshes that look wrong in top-down ortho view every frame
		// (they may be re-enabled by lighting/post-processing updates)
		for (const mesh of scene.meshes) {
			if (mesh.name === 'VolumetricLightScatteringMesh' || mesh.name === 'sky-gradient') {
				mesh.isVisible = false;
			}
		}
	});

	// ── Resize: recalculate ortho bounds + ortho max ──
	const parent: HTMLElement | null = canvas.parentElement;
	if (parent) {
		const orthoResizeObserver: ResizeObserver = new ResizeObserver(() => {
			if (_currentPreset === 'mapeditor') {
				const orthoMax: number = computeOrthoMax();
				// If current zoom is beyond new max, clamp it
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

	// ── Scrollbar thumb drag ──
	setupScrollbarDrag('#sb-thumb-h', 'horizontal', cam, scene);
	setupScrollbarDrag('#sb-thumb-v', 'vertical', cam, scene);
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
		const mapRange: number = MAP_MAX - MAP_MIN - halfView * 2;
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
	});

	document.addEventListener('mouseup', () => {
		if (dragging) {
			dragging = false;
			thumb.style.cursor = 'grab';
		}
	});
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
	// eslint-disable-next-line no-console -- Dev harness diagnostic output
	console.log('[WebForge] Starting dev harness...');

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
		console.error('[WebForge] Failed to create runtime:', result.error);
		return;
	}

	const runtime: RuntimeInstance = result.data;
	const backend: string = runtime.engine.isWebGPU ? 'WebGPU' : 'WebGL2';
	// eslint-disable-next-line no-console -- Dev harness diagnostic output
	console.log(`[WebForge] Runtime created — backend: ${backend}`);

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

	// Render the test tilemap
	const mapResult: BabylonResult<RenderedTilemap> = renderTilemap({
		scene: runtime.engine.scene,
		mapDataInput: TEST_MAP_DATA,
		assetBasePath: '/',
	});

	let tilemap: RenderedTilemap | null = null;

	if (mapResult.ok) {
		tilemap = mapResult.data;
		debug.tilemap = tilemap;
		const chunkCount: Num = tilemap.chunks.length;
		const cliffCount: Num = tilemap.cliffChunks.length;
		// eslint-disable-next-line no-console -- Dev harness diagnostic output
		console.log(`[WebForge] Tilemap rendered — ${chunkCount} chunks, ${cliffCount} cliff chunks`);

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
				`[WebForge] Lighting active — ${String(lightCount)} lights [${lightNames}], ` +
					`shadows: ${String(hasShadows)}, flicker: ${String(hasFlicker)}, ` +
					`dayNight: ${String(hasDayNight)}, glow: ${String(hasGlow)}`,
			);
		} else {
			// eslint-disable-next-line no-console -- Dev harness diagnostic output
			console.log('[WebForge] No lighting system configured');
		}

		// Build dynamic UI sections after tilemap is loaded
		buildCameraNavigationUI(runtime, debug);
		buildLayerUI(debug);
		buildSkyUI(debug, runtime.engine.scene);
		buildLightsUI(debug);
		buildPostProcessingUI(debug);
		buildFogUI(runtime.engine.scene);
		buildCameraDetailsUI(runtime);
		buildGlowDetailsUI(debug);
		buildInfoUI(debug, runtime.engine.scene);
		buildTileInspectorUI(debug, runtime.engine.scene);
		buildKeyboardShortcutsUI();

		// Center camera on the map (map is 32 tiles wide, 1 unit per tile)
		const mapCenterX: Num = 16;
		const mapCenterZ: Num = 16;
		runtime.camera.target = new BABYLON.Vector3(mapCenterX, 0, mapCenterZ);

		// Apply initial ortho bounds now that camera target is centered
		if (_currentPreset === 'mapeditor') {
			const arcCam = runtime.camera as BABYLON.ArcRotateCamera;
			_orthoSize = computeOrthoMax();
			applyOrthoBounds(arcCam, runtime.engine.scene);
			clampCameraToMap(arcCam, runtime.engine.scene);
		}
	} else {
		// eslint-disable-next-line no-console -- Dev harness diagnostic output
		console.error('[WebForge] Failed to render tilemap:', mapResult.error);
	}

	// Start render loop
	const loopResult = startRenderLoop(runtime.engine);
	if (!loopResult.ok) {
		// eslint-disable-next-line no-console -- Dev harness diagnostic output
		console.error('[WebForge] Failed to start render loop:', loopResult.error);
		return;
	}
	// eslint-disable-next-line no-console -- Dev harness diagnostic output
	console.log('[WebForge] Render loop started');
	// eslint-disable-next-line no-console -- Dev harness diagnostic output
	console.log('[WebForge] Debug API: window.__WEBFORGE__ (try __WEBFORGE__.status())');

	// Dispose on page unload
	window.addEventListener('beforeunload', () => {
		closeTilePickerPanel();
		if (tilemap) {
			disposeTilemap({ tilemap });
		}
		disposeRuntime(runtime);
		// eslint-disable-next-line no-console -- Dev harness diagnostic output
		console.log('[WebForge] Runtime disposed');
	});
}

await main();
