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
	createHd2dCamera,
	updateCameraTarget,
	type CameraTargetOptions,
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
export { CameraConfigSchema, type CameraConfig } from './schemas/camera-config';
export {
	SceneSetupConfigSchema,
	ColorRgbaSchema,
	FogConfigSchema,
	type SceneSetupConfig,
	type ColorRgba,
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
	type RenderedTilemap,
} from './rendering/tilemap-renderer';

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
