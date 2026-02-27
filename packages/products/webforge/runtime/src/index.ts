/**
 * WebForge Game Runtime
 *
 * Zero-framework game runtime powered by Babylon.js.
 * This is the player-facing engine that runs compiled game projects.
 *
 * @module
 */

// Result type for Babylon.js mutable objects
export { type BabylonResult } from './core/babylon-result';

// Runtime lifecycle
export {
	createRuntime,
	createTestRuntime,
	disposeRuntime,
	RuntimeConfigSchema,
	type RuntimeConfig,
	type RuntimeInstance,
} from './runtime';

// Engine
export {
	createBabylonEngine,
	createTestEngine,
	startRenderLoop,
	stopRenderLoop,
	registerResizeHandler,
	disposeEngine,
	type BabylonEngineInstance,
} from './core/engine';

// Camera
export {
	createCamera,
	createHd2dCamera,
	updateCameraTarget,
	rotateTactics,
	screenShake,
	switchCameraPreset,
	resetCamera,
	type CameraTargetOptions,
	type RotateTacticsOptions,
	type ScreenShakeOptions,
	type ShakeHandle,
	type SwitchCameraPresetOptions,
	type PresetTransitionHandle,
	type ResetCameraOptions,
} from './core/camera-controller';

// Scene setup
export { applySceneSetup } from './rendering/scene-setup';

// Performance monitoring
export {
	createPerformanceMonitor,
	getMetrics,
	disposePerformanceMonitor,
	type PerformanceMonitor,
	type PerformanceMetrics,
} from './core/performance-monitor';

// Debug inspector
export { showInspector, hideInspector } from './core/debug-inspector';

// Schemas — Engine / Camera / Scene / Quality
export { EngineConfigSchema, type EngineConfig } from './schemas/engine-config';
export {
	CameraConfigSchema,
	CameraPresetSchema,
	TransitionEasingSchema,
	type CameraConfig,
	type CameraPreset,
	type TransitionEasing,
} from './schemas/camera-config';
export {
	SceneSetupConfigSchema,
	ColorRgbaSchema,
	Vector3Schema,
	FogConfigSchema,
	type SceneSetupConfig,
	type ColorRgba,
	type Vector3,
	type FogConfig,
} from './schemas/scene-setup-config';
export {
	QualityConfigSchema,
	QUALITY_PRESETS,
	type QualityConfig,
	type QualityPresetSettings,
} from './schemas/quality-config';

// Schemas — Map data
export {
	MapDataSchema,
	TileLayerSchema,
	TilesetConfigSchema,
	TilePropertiesSchema,
	ChunkConfigSchema,
	AutotileTypeSchema,
	LayerTypeSchema,
	type MapData,
	type TileLayer,
	type TilesetConfig,
	type TileProperties,
	type ChunkConfig,
	type AutotileType,
	type LayerType,
} from './schemas/map-data';

// Schemas — Post-processing config
export {
	PostProcessingConfigSchema,
	BloomConfigSchema,
	DepthOfFieldConfigSchema,
	ToneMappingConfigSchema,
	ColorGradingConfigSchema,
	VignetteConfigSchema,
	GrainConfigSchema,
	SsaoConfigSchema,
	ChromaticAberrationConfigSchema,
	SharpenConfigSchema,
	FxaaConfigSchema,
	DitheringConfigSchema,
	HdrEnvironmentConfigSchema,
	PostProcessingPresetSchema,
	ColorGradingPresetSchema,
	type PostProcessingConfig,
	type BloomConfig,
	type DepthOfFieldConfig,
	type ToneMappingConfig,
	type ColorGradingConfig,
	type VignetteConfig,
	type GrainConfig,
	type SsaoConfig,
	type ChromaticAberrationConfig,
	type SharpenConfig,
	type FxaaConfig,
	type DitheringConfig,
	type HdrEnvironmentConfig,
	type PostProcessingPresetName,
	type ColorGradingPreset,
} from './schemas/post-processing-config';

// Post-processing presets + quality scaling
export {
	POST_PROCESSING_PRESETS,
	getPostProcessingPreset,
	resolvePostProcessingConfig,
	applyQualityScaling,
} from './rendering/post-processing-presets';

// Post-processing pipeline
export {
	createPostProcessingPipeline,
	updatePostProcessingConfig,
	disposePostProcessingPipeline,
	type PostProcessingPipeline,
} from './rendering/post-processing';

// HDR environment
export {
	loadHdrEnvironment,
	applyHdrEnvironmentToScene,
	disposeHdrEnvironment,
	type HdrEnvironmentInstance,
} from './rendering/hdr-environment';

// Tilemap renderer
export {
	renderTilemap,
	disposeTilemap,
	updateTile,
	setLayerVisibility,
	setLayerOpacity,
	type RenderedTilemap,
} from './rendering/tilemap-renderer';

// Tile query
export { getTileProperties } from './rendering/tile-query';

// Tileset loader
export {
	loadTileset,
	computeTileUVs,
	resolveGlobalTileId,
	type LoadedTileset,
} from './rendering/tileset-loader';

// Tile geometry
export { type TileUV } from './rendering/tile-geometry';

// Autotile resolver
export { resolveAutotile, buildAdjacencyBitmask } from './rendering/autotile-resolver';

// Tile animator
export {
	createTileAnimator,
	disposeTileAnimator,
	type TileAnimationManager,
} from './rendering/tile-animator';

// Schemas — Lighting config
export {
	LightingConfigSchema,
	LightConfigSchema,
	PointLightConfigSchema,
	SpotLightConfigSchema,
	DirectionalLightConfigSchema,
	HemisphericLightConfigSchema,
	ShadowConfigSchema,
	FlickerConfigSchema,
	FlickerTypeSchema,
	ShadowTypeSchema,
	ShadowFilterQualitySchema,
	ShadowMapSizeSchema,
	LightFalloffTypeSchema,
	LightIntensityModeSchema,
	VolumetricLightConfigSchema,
	LensFlareConfigSchema,
	LensFlareEntrySchema,
	DayNightCycleConfigSchema,
	TimeKeyframeSchema,
	SunPathConfigSchema,
	GlowLayerConfigSchema,
	type LightingConfig,
	type LightConfig,
	type PointLightConfig,
	type SpotLightConfig,
	type DirectionalLightConfig,
	type HemisphericLightConfig,
	type ShadowConfig,
	type FlickerConfig,
	type FlickerType,
	type ShadowType,
	type ShadowFilterQuality,
	type ShadowMapSize,
	type LightFalloffType,
	type LightIntensityMode,
	type VolumetricLightConfig,
	type LensFlareConfig,
	type LensFlareEntry,
	type DayNightCycleConfig,
	type TimeKeyframe,
	type SunPathConfig,
	type GlowLayerConfig,
} from './schemas/lighting-config';

// Color temperature
export { colorTemperatureToRgb } from './rendering/color-temperature';

// Light manager
export {
	createLighting,
	disposeLighting,
	updateLightPosition,
	updateLightIntensity,
	updateLightColor,
	removeLightById,
	type LightingInstance,
	type ManagedLight,
} from './rendering/light-manager';

// Shadow manager
export {
	createShadowGenerator,
	addShadowCasters,
	applyShadowQualityScaling,
	disposeShadowGenerator,
	type ShadowGeneratorInstance,
} from './rendering/shadow-manager';

// Light animation (flicker)
export {
	createFlicker,
	computeFlicker,
	computeColorShift,
	computePositionJitter,
	pseudoNoise,
	disposeFlicker,
	type FlickerInstance,
} from './rendering/light-animation';

// Day/night cycle
export {
	createDayNightCycle,
	interpolateKeyframes,
	computeSunDirection,
	setTimeOfDay,
	getTimeOfDay,
	disposeDayNightCycle,
	DEFAULT_DAY_CYCLE_KEYFRAMES,
	type DayNightCycleInstance,
	type InterpolatedValues,
} from './rendering/day-night-cycle';

// Glow manager
export {
	createGlowLayer,
	updateGlowLayer,
	disposeGlowLayer,
} from './rendering/glow-manager';

// Schemas — Sky config
export {
	SkyConfigSchema,
	SkyTypeSchema,
	SkyGradientStopSchema,
	ParallaxLayerSchema,
	type SkyConfig,
	type SkyType,
	type SkyGradientStop,
	type ParallaxLayer,
} from './schemas/sky-config';

// Sky system
export { createSky, disposeSky, type SkyInstance } from './rendering/sky-system';

// Parallax manager
export {
	createParallax,
	disposeParallax,
	computeParallaxOffset,
	type ParallaxInstance,
} from './rendering/parallax-manager';

// Screen effects
export {
	screenTint,
	screenFlash,
	screenFadeIn,
	screenFadeOut,
	type ScreenEffectHandle,
} from './rendering/screen-effects';
