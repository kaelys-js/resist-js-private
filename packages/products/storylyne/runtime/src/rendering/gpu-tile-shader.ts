/**
 * GPU tile shader source — GLSL vertex/fragment for data-texture tile rendering.
 *
 * Provides shader source strings for the GPU tilemap renderer.
 * The fragment shader reads tile IDs from a RGBA32F data texture,
 * looks up atlas UVs, applies flip/rotate/animate transforms, and
 * outputs the final tile color with per-layer tint/brightness/saturation/contrast.
 *
 * @example
 * ```typescript
 * import { GPU_TILE_VERTEX_SHADER, GPU_TILE_FRAGMENT_SHADER } from './gpu-tile-shader';
 *
 * const material = new BABYLON.ShaderMaterial('gpuTile', scene, {
 *   vertexSource: GPU_TILE_VERTEX_SHADER,
 *   fragmentSource: GPU_TILE_FRAGMENT_SHADER,
 * }, { ... });
 * ```
 *
 * @module
 */

import type { Str } from '@/schemas/common';

// =============================================================================
// Vertex Shader
// =============================================================================

/**
 * GLSL vertex shader for flat tile layers (no height displacement).
 *
 * Transforms vertex positions and passes world-space tile coordinates
 * to the fragment shader via `vWorldTilePos`.
 */
export const GPU_TILE_VERTEX_SHADER: Str = /* glsl */ `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 worldViewProjection;
uniform vec2 mapSize;

varying vec2 vWorldTilePos;

void main() {
    vWorldTilePos = uv * mapSize;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}
` as Str;

// =============================================================================
// Height Vertex Shader
// =============================================================================

/**
 * GLSL vertex shader with height map displacement.
 *
 * Reads per-tile height from an R32F data texture and offsets the
 * vertex Y position for terrain elevation.
 */
export const GPU_TILE_HEIGHT_VERTEX_SHADER: Str = /* glsl */ `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 worldViewProjection;
uniform vec2 mapSize;
uniform sampler2D heightDataTexture;
uniform float tileWorldHeight;
uniform float layerYOffset;

varying vec2 vWorldTilePos;

void main() {
    vWorldTilePos = uv * mapSize;
    vec3 pos = position;

    ivec2 tc = ivec2(floor(uv * mapSize));
    if (tc.x >= 0 && tc.y >= 0 && tc.x < int(mapSize.x) && tc.y < int(mapSize.y)) {
        float h = texelFetch(heightDataTexture, tc, 0).r;
        pos.y += h * tileWorldHeight + layerYOffset;
    }

    gl_Position = worldViewProjection * vec4(pos, 1.0);
}
` as Str;

// =============================================================================
// Fragment Shader
// =============================================================================

/**
 * GLSL fragment shader for data-texture-based tile rendering.
 *
 * Performs per-pixel tile lookup:
 * 1. Convert fragment world position → tile coordinate
 * 2. texelFetch tile data (ID + visual flags) from RGBA32F data texture
 * 3. Decode visual flags (flip, rotate, opacity, animation, etc.)
 * 4. Compute atlas UV from tile ID + sub-tile position
 * 5. Sample tileset atlas with NEAREST filtering
 * 6. Apply per-layer color adjustments (tint, brightness, saturation, contrast)
 */
export const GPU_TILE_FRAGMENT_SHADER: Str = /* glsl */ `
precision highp float;

uniform sampler2D tileDataTexture;
uniform sampler2D tileAtlas;
uniform vec2 mapSize;
uniform vec2 tilePixelSize;
uniform float layerOpacity;
uniform float animationFrame;
uniform vec4 layerTint;
uniform float layerBrightness;
uniform float layerSaturation;
uniform float layerContrast;
uniform vec2 layerOffset;

varying vec2 vWorldTilePos;

void main() {
    // Apply layer offset for parallax / scrolling
    vec2 tilePos = vWorldTilePos + layerOffset;

    // Integer tile coordinate
    ivec2 tileCoord = ivec2(floor(tilePos));

    // Bounds check — discard outside map
    if (tileCoord.x < 0 || tileCoord.y < 0 ||
        tileCoord.x >= int(mapSize.x) || tileCoord.y >= int(mapSize.y)) {
        discard;
    }

    // Fetch tile data from RGBA32F data texture
    vec4 tileData = texelFetch(tileDataTexture, tileCoord, 0);
    uint tileId = uint(tileData.r);
    uint flags = uint(tileData.g);

    // Empty tile — discard
    if (tileId == 0u) {
        discard;
    }

    // =========================================================================
    // Decode visual flags
    // =========================================================================
    bool flipH = (flags & 0x1u) != 0u;
    bool flipV = ((flags >> 1u) & 0x1u) != 0u;
    uint rotation = (flags >> 2u) & 0x3u;
    uint tileOpacity = (flags >> 4u) & 0xFu;
    // shadowDisable = (flags >> 8u) & 0x1u; — used by lighting pipeline
    // glow = (flags >> 9u) & 0x1u; — used by glow layer
    // tintIndex = (flags >> 10u) & 0x3Fu; — future palette lookup
    uint animBase = (flags >> 16u) & 0xFFu;
    uint animCount = (flags >> 24u) & 0xFu;
    // bush = (flags >> 28u) & 0x1u; — future lower-half transparency

    // =========================================================================
    // Animation frame advancement
    // =========================================================================
    uint finalTileId = tileId;
    if (animCount > 0u) {
        finalTileId = tileId + animBase + (uint(animationFrame) % animCount);
    }

    // =========================================================================
    // Atlas UV computation (tileset-agnostic — grid derived from texture)
    // =========================================================================
    vec2 atlasPixels = vec2(textureSize(tileAtlas, 0));
    vec2 atlasGrid = floor(atlasPixels / tilePixelSize);
    vec2 tileUvSize = tilePixelSize / atlasPixels;

    // Convert 1-based tile ID to 0-based atlas index (ID 0 = empty, ID 1 = first tile)
    uint atlasIdx = finalTileId - 1u;
    uint atlasCol = atlasIdx % uint(atlasGrid.x);
    uint atlasRow = atlasIdx / uint(atlasGrid.x);

    // Sub-tile position (fractional part of tilePos = position within tile)
    vec2 subTilePos = fract(tilePos);

    // Apply flip
    if (flipH) subTilePos.x = 1.0 - subTilePos.x;
    if (flipV) subTilePos.y = 1.0 - subTilePos.y;

    // Apply rotation (clockwise)
    if (rotation == 1u) {
        // 90° CW
        float tmp = subTilePos.x;
        subTilePos.x = subTilePos.y;
        subTilePos.y = 1.0 - tmp;
    } else if (rotation == 2u) {
        // 180°
        subTilePos = 1.0 - subTilePos;
    } else if (rotation == 3u) {
        // 270° CW (90° CCW)
        float tmp = subTilePos.x;
        subTilePos.x = 1.0 - subTilePos.y;
        subTilePos.y = tmp;
    }

    // Half-texel inset to prevent atlas bleeding
    vec2 halfTexel = 0.5 / atlasPixels;

    // Final atlas UV
    vec2 atlasUV = vec2(float(atlasCol), float(atlasRow)) * tileUvSize
        + subTilePos * (tileUvSize - 2.0 * halfTexel)
        + halfTexel;

    // =========================================================================
    // Sample atlas
    // =========================================================================
    vec4 tileColor = texture2D(tileAtlas, atlasUV);

    // Alpha test — discard transparent pixels
    if (tileColor.a < 0.5) {
        discard;
    }

    // =========================================================================
    // Per-tile opacity
    // =========================================================================
    float opacity = float(tileOpacity) / 15.0;
    tileColor.a *= opacity * layerOpacity;

    // =========================================================================
    // Per-layer color adjustments
    // =========================================================================

    // Tint (multiply)
    tileColor *= layerTint;

    // Brightness (additive)
    tileColor.rgb += vec3(layerBrightness);

    // Saturation (HSL-style desaturation)
    float luminance = dot(tileColor.rgb, vec3(0.299, 0.587, 0.114));
    tileColor.rgb = mix(vec3(luminance), tileColor.rgb, layerSaturation);

    // Contrast (centered around 0.5)
    tileColor.rgb = (tileColor.rgb - 0.5) * layerContrast + 0.5;

    // Clamp final color
    tileColor = clamp(tileColor, 0.0, 1.0);

    gl_FragColor = tileColor;
}
` as Str;
