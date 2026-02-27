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
	type RenderedTilemap,
} from '../src/rendering/tilemap-renderer';

import type { RuntimeInstance } from '../src/runtime';
import type { BabylonResult } from '../src/core/babylon-result';
import type { CameraPreset } from '../src/schemas/camera-config';
import type { Num, Bool } from '@/schemas/common';
import type { ParallaxInstance } from '../src/rendering/parallax-manager';
import type { SkyInstance } from '../src/rendering/sky-system';
import type { ColorRgba } from '../src/schemas/scene-setup-config';

import { TEST_MAP_DATA } from './test-map';

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

let _currentPreset = 'free';
let selectedEffectColor = 'white';
let _firstPersonCam: BABYLON.UniversalCamera | null = null;
let _isFirstPerson = false;
let _lastFadeOutHandle: { dispose: () => void } | null = null;

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
			const orthoSize = 20;
			arcCam.orthoLeft = -orthoSize;
			arcCam.orthoRight = orthoSize;
			arcCam.orthoTop = orthoSize;
			arcCam.orthoBottom = -orthoSize;
		} else if (_currentPreset === 'mapeditor') {
			// Switching away from mapeditor — restore perspective
			arcCam.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
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
				'free',
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
 * Builds a single layer row with visibility toggle and opacity slider.
 *
 * @param tilemap - The rendered tilemap.
 * @param layer - The layer data.
 * @param index - The layer index.
 * @param container - The parent container element.
 */
function buildLayerRow(
	tilemap: RenderedTilemap,
	layer: { name: string; visible: boolean; opacity: number },
	index: number,
	container: HTMLElement,
): void {
	const row = document.createElement('div');
	row.style.cssText = 'padding: 3px 0;';

	// Layer visibility toggle with formatted name
	const displayName = layer.name
		? layer.name
				.replaceAll('_', ' ')
				.split(' ')
				.map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
				.join(' ')
		: `Layer ${String(index)}`;

	row.append(
		createToggleRow(
			`${String(index)}. ${displayName}`,
			layer.visible,
			(on) => {
				setLayerVisibility({
					tilemap,
					layerIndex: index as Num,
					visible: on as Bool,
				});
			},
			`layer-${String(index)}-visible`,
		),
	);

	// Opacity slider
	const opacityRow = document.createElement('div');
	opacityRow.className = 'control-row';
	opacityRow.style.cssText = 'padding-left: 12px;';
	opacityRow.dataset['control'] = `layer-${String(index)}-opacity`;

	const opLabel = document.createElement('span');
	opLabel.className = 'control-label';
	opLabel.textContent = 'Opacity';

	const opSlider = document.createElement('input');
	opSlider.type = 'range';
	opSlider.min = '0';
	opSlider.max = '1';
	opSlider.step = '0.05';
	opSlider.value = String(layer.opacity);

	const opValue = document.createElement('span');
	opValue.className = 'control-value';
	opValue.textContent = layer.opacity.toFixed(2);

	opSlider.addEventListener('input', () => {
		const val = Number(opSlider.value);
		setLayerOpacity({
			tilemap,
			layerIndex: index as Num,
			opacity: val as Num,
		});
		opValue.textContent = val.toFixed(2);
	});

	opacityRow.append(opLabel);
	opacityRow.append(opSlider);
	opacityRow.append(opValue);
	row.append(opacityRow);

	container.append(row);
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

	for (let i = 0; i < layers.length; i++) {
		const layer = layers[i];
		if (!layer) continue;

		buildLayerRow(tilemap, layer, i, container as HTMLElement);
	}
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
		camera: { mode: 'editor' },
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
		buildLayerUI(debug);
		buildSkyUI(debug, runtime.engine.scene);
		buildLightsUI(debug);
		buildPostProcessingUI(debug);
		buildFogUI(runtime.engine.scene);
		buildCameraDetailsUI(runtime);
		buildGlowDetailsUI(debug);
		buildInfoUI(debug, runtime.engine.scene);

		// Center camera on the map (map is 32 tiles wide, 1 unit per tile)
		const mapCenterX: Num = 16;
		const mapCenterZ: Num = 16;
		runtime.camera.target = new BABYLON.Vector3(mapCenterX, 0, mapCenterZ);
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
		if (tilemap) {
			disposeTilemap({ tilemap });
		}
		disposeRuntime(runtime);
		// eslint-disable-next-line no-console -- Dev harness diagnostic output
		console.log('[WebForge] Runtime disposed');
	});
}

await main();
