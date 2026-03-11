# 08 — Performance / Speed: Protocols, Compression, Image Optimization, Content Optimization, Network

## Context

The `performance` field on `EdgeConfigSchema` covers everything under Cloudflare's **Speed** and **Network** dashboards: protocol negotiation, content optimization, compression, image transformation, and network-level settings. Locally, these map to Caddy server options, `encode` directives, response body filters, and a companion `sharp`-based image transformer service.

This plan is self-contained. A future session can implement the entire feature area from this document alone.

## Documentation References

| Topic | URL |
|-------|-----|
| Speed overview | https://developers.cloudflare.com/speed/ |
| Protocol optimization | https://developers.cloudflare.com/speed/optimization/protocol/ |
| HTTP/2 | https://developers.cloudflare.com/speed/optimization/protocol/http2/ |
| HTTP/3 (QUIC) | https://developers.cloudflare.com/speed/optimization/protocol/http3/ |
| 0-RTT Connection Resumption | https://developers.cloudflare.com/speed/optimization/protocol/0-rtt-connection-resumption/ |
| Enhanced HTTP/2 Prioritization | https://developers.cloudflare.com/speed/optimization/protocol/enhanced-http2-prioritization/ |
| HTTP/2 to Origin | https://developers.cloudflare.com/speed/optimization/protocol/http2-to-origin/ |
| Content optimization | https://developers.cloudflare.com/speed/optimization/content/ |
| Early Hints (103) | https://developers.cloudflare.com/speed/optimization/content/early-hints/ |
| Speed Brain | https://developers.cloudflare.com/speed/optimization/content/speed-brain/ |
| Rocket Loader | https://developers.cloudflare.com/speed/optimization/content/rocket-loader/ |
| Auto Minify (deprecated) | https://developers.cloudflare.com/speed/optimization/content/auto-minify/ |
| Prefetch URLs | https://developers.cloudflare.com/speed/optimization/content/prefetch-urls/ |
| Brotli / Compression | https://developers.cloudflare.com/speed/optimization/content/brotli/ |
| Content compression details | https://developers.cloudflare.com/speed/optimization/content/brotli/content-compression/ |
| Compression rules | https://developers.cloudflare.com/rules/compression-rules/ |
| Polish | https://developers.cloudflare.com/images/polish/ |
| Image Resizing (URL) | https://developers.cloudflare.com/images/transform-images/transform-via-url/ |
| Image Resizing (Workers) | https://developers.cloudflare.com/images/transform-images/transform-via-workers/ |
| Network settings | https://developers.cloudflare.com/network/ |
| WebSockets | https://developers.cloudflare.com/network/websockets/ |
| gRPC | https://developers.cloudflare.com/network/grpc-connections/ |
| IP Geolocation | https://developers.cloudflare.com/network/ip-geolocation/ |
| Caddy encode directive | https://caddyserver.com/docs/caddyfile/directives/encode |
| Caddy reverse_proxy | https://caddyserver.com/docs/caddyfile/directives/reverse_proxy |
| Caddy request_body | https://caddyserver.com/docs/caddyfile/directives/request_body |
| Caddy experimental HTTP/3 | https://caddyserver.com/docs/caddyfile/options#protocols |
| Sharp (image processing) | https://sharp.pixelplumbing.com/api-constructor |

---

## 1. Cloudflare Settings Reference

### 1.1 Protocol Settings (CF API fields)

| Setting | CF API Field | Default (CF) | Plans | Description |
|---------|-------------|--------------|-------|-------------|
| HTTP/2 | `http2` | On (all plans) | All (customizable Pro+) | Serve responses via HTTP/2 over TLS |
| HTTP/3 (QUIC) | `http3` | Off | All | Serve via QUIC-based HTTP/3. Client-to-edge only |
| 0-RTT | `0rtt` | Off | All | TLS 1.3 early data for returning visitors. GET/HEAD/OPTIONS only. Adds `Early-Data: 1` header |
| Enhanced HTTP/2 Prioritization | `h2_prioritization` | Off | Pro+ | Override browser resource priority order |
| HTTP/2 to Origin | `origin_h2_max_streams` | On (Free/Pro/Biz: 200 streams), Off (Ent: 1 stream) | All | Use HTTP/2 for upstream connections. Configurable stream count (Ent) |

### 1.2 Content Optimization (CF API fields)

| Setting | CF API Field | Default (CF) | Plans | Description |
|---------|-------------|--------------|-------|-------------|
| Early Hints (103) | `early_hints` | Off | All | Send `103 Early Hints` with `Link` preload headers before final response |
| Speed Brain | `speed_brain` | On (Free), available (others) | All | Inject `Speculation-Rules` header for prefetch. Chromium 121+ only |
| Rocket Loader | `rocket_loader` | Off | All | Defer all JS loading until after rendering, preserve exec order |
| Auto Minify | `minify` | Off | All | Minify HTML/CSS/JS. Object: `{ html: Boolean, css: Boolean, js: Boolean }` |
| Prefetch URLs | `prefetch_preload` | Off | Enterprise | Pre-populate CF cache from manifest file |
| Cloudflare Fonts | N/A (deprecated) | N/A | N/A | Was: intercept Google Fonts, serve locally. Feature removed |
| Mirage | `mirage` | Off | Pro+ | Lazy-load images based on connection speed, placeholder swaps |

### 1.3 Compression (CF default by plan)

| Plan | Default Algorithm |
|------|-------------------|
| Free | Zstandard |
| Pro, Business | Brotli |
| Enterprise | Gzip |

Minimum response sizes: Gzip 48 bytes, Brotli 50 bytes, Zstandard 50 bytes.
Only status codes `200`, `403`, `404` are eligible.
Cloudflare sends `accept-encoding: br, gzip` to origin.

Configurable via **Compression Rules** (per-route algorithm override). No single API toggle; uses ruleset API.

### 1.4 Image Optimization (CF API fields)

| Setting | CF API Field | Plans | Description |
|---------|-------------|-------|-------------|
| Polish | `polish` (values: `off`, `lossless`, `lossy`) + `webp` (separate Boolean) | Pro+ | Strip metadata (lossless), compress (lossy), convert to WebP |
| Image Resizing | Zone setting + `flexible_variants` | Business+ / Workers | Transform images via `/cdn-cgi/image/` URL or Workers `cf.image` |
| Mirage | `mirage` | Pro+ | Connection-aware lazy loading |

#### `/cdn-cgi/image/` Parameter Reference

Format: `https://<zone>/cdn-cgi/image/<options>/<source-image>`
Options are comma-separated, no spaces: `width=80,quality=75,format=auto`

| Parameter | Alias | Values | Description |
|-----------|-------|--------|-------------|
| `width` | `w` | pixels, `auto` | Target width |
| `height` | `h` | pixels | Target height |
| `fit` | | `scale-down`, `contain`, `cover`, `crop`, `pad`, `squeeze` | Resize mode |
| `quality` | `q` | 1-100, `high`, `medium-high`, `medium-low`, `low` | Compression quality |
| `format` | `f` | `auto`, `avif`, `webp`, `jpeg`, `baseline-jpeg`, `json` | Output format |
| `dpr` | | number (default: 1) | Device pixel ratio multiplier |
| `gravity` | `g` | `auto`, `face`, `left`, `right`, `top`, `bottom`, `XxY` (0.0-1.0) | Crop focal point |
| `metadata` | | `copyright`, `keep`, `none` | Metadata preservation |
| `background` | | CSS4 color | Pad/contain fill color |
| `blur` | | 1-250 | Gaussian blur radius |
| `sharpen` | | 0-10 (float) | Sharpening amount |
| `brightness` | | float (1.0 = no change) | Brightness adjustment |
| `contrast` | | float (1.0 = no change) | Contrast adjustment |
| `gamma` | | float (1.0 = no change) | Gamma adjustment |
| `saturation` | | float (0 = grayscale, 1.0 = no change) | Color saturation |
| `rotate` | | `90`, `180`, `270` | Rotation degrees |
| `flip` | | `h`, `v`, `hv` | Mirror/flip |
| `trim` | | `top;right;bottom;left`, `border` | Trim/crop edges |
| `trim.border.color` | | CSS4 color | Auto-trim border color |
| `trim.border.tolerance` | | 0-255 | Color match tolerance |
| `trim.border.keep` | | pixels | Pixels to keep from border |
| `trim.width` | | pixels | Trim target width |
| `trim.height` | | pixels | Trim target height |
| `trim.left` | | pixels | Trim from left |
| `trim.top` | | pixels | Trim from top |
| `onerror` | | `redirect` | Error handling (redirect to original) |
| `anim` | | `true`, `false` | Preserve animation frames |
| `compression` | | `fast` | Fast compression mode |
| `segment` | | `foreground` | Background removal |
| `slow-connection-quality` | `scq` | same as `quality` | Quality on slow connections |
| `zoom` | `face-zoom` | 0.0-1.0 | Face zoom (with `gravity=face`) |
| `border` | | Workers only: `{color, top, right, bottom, left}` | Add border (Workers API only) |

#### Size Limits

- Max input file: 70 MB
- Max pixel area: 100 megapixels
- AVIF hard limit: 1200px longest side (1600px when `format=avif` is explicit)
- WebP soft limits: 2560px lossy, 1920px lossless
- Progressive JPEG: only within 150x150 to 3000x3000

### 1.5 Network Settings (CF API fields)

| Setting | CF API Field | Default (CF) | Plans | Description |
|---------|-------------|--------------|-------|-------------|
| WebSockets | `websockets` | Off (toggle on) | All | Proxy WebSocket upgrade connections |
| gRPC | `grpc` | Off | All | Proxy gRPC over HTTP/2 on port 443. Requires TLS + ALPN |
| IP Geolocation | `ip_geolocation` | Off (toggle on) | All | Inject `CF-IPCountry` header with ISO 3166-1 alpha-2 country code |
| IPv6 Compatibility | `ipv6` | Off (toggle on) | All | Enable IPv6 gateway |
| Max Upload Size | N/A (plan-based) | 100MB (Free), 100MB (Pro), 200MB (Biz), 500MB (Ent) | All | Maximum request body size |
| Response Buffering | `response_buffering` | Off | Enterprise | Buffer entire response before sending to client |

---

## 2. Valibot Schema

### File: `packages/shared/schemas/core-config/src/edge-performance.ts`

```typescript
/**
 * Performance Edge Config Schema
 *
 * Covers protocol settings, content optimization, compression,
 * image optimization, and network settings. Maps 1:1 to Cloudflare
 * Speed + Network dashboard settings.
 *
 * Used by both the local edge tool (Caddy + companion services)
 * and Pulumi IaC generation (Cloudflare zone settings).
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Shared Primitives
// =============================================================================

/** On/off toggle — matches CF API `"on"` / `"off"` pattern. */
const BoolToggle = v.optional(v.boolean(), false);

/** On/off toggle defaulting to true. */
const BoolToggleOn = v.optional(v.boolean(), true);

/** Positive integer (port, stream count, size). */
const PositiveInt = v.pipe(v.number(), v.integer(), v.minValue(1));

/** Non-negative integer. */
const NonNegInt = v.pipe(v.number(), v.integer(), v.minValue(0));

/** Float 0.0-1.0 range. */
const UnitFloat = v.pipe(v.number(), v.minValue(0), v.maxValue(1));

/** Float with no upper bound, min 0. */
const NonNegFloat = v.pipe(v.number(), v.minValue(0));

/** ISO 3166-1 alpha-2 country code (2 uppercase letters). */
const CountryCodeSchema = v.pipe(v.string(), v.regex(/^[A-Z]{2}$/));

// =============================================================================
// Protocol Settings
// =============================================================================

/**
 * Protocol optimization configuration.
 * Controls HTTP version negotiation between client, edge, and origin.
 *
 * CF API fields: `http2`, `http3`, `0rtt`, `h2_prioritization`, `origin_h2_max_streams`
 */
export const ProtocolConfigSchema = v.strictObject({
  /**
   * Enable HTTP/2 for client-to-edge connections.
   * Requires TLS. Caddy enables HTTP/2 by default when TLS is active.
   *
   * CF API: `http2` (`"on"` / `"off"`)
   * CF default: On (all plans). Free plan cannot disable.
   * Caddy: HTTP/2 is automatic with TLS — disable via `protocols h1` server option.
   *
   * @default true
   */
  http2: v.optional(v.boolean(), true),

  /**
   * Enable HTTP/3 (QUIC) for client-to-edge connections.
   * Client-to-Cloudflare only; origin connections remain HTTP/1.1 or HTTP/2.
   * Caddy supports HTTP/3 via `experimental_http3` global option.
   *
   * CF API: `http3` (`"on"` / `"off"`)
   * CF default: Off.
   * Caddy: Requires `experimental_http3` global option.
   *
   * @default false
   */
  http3: BoolToggle,

  /**
   * Enable 0-RTT Connection Resumption (TLS 1.3 early data).
   * Reduces latency for returning visitors by skipping a round-trip handshake.
   * Only applies to GET, HEAD, and OPTIONS requests.
   * Adds `Early-Data: 1` header to requests using early data.
   *
   * CF API: `0rtt` (`"on"` / `"off"`)
   * CF default: Off.
   * Caddy: Not directly simulatable. Edge tool injects `Early-Data: 1` header
   * on a percentage of requests to let apps test early-data handling.
   *
   * @default false
   */
  zeroRtt: BoolToggle,

  /**
   * Enable Enhanced HTTP/2 Prioritization.
   * Overrides default browser resource ordering for optimal delivery.
   * Greatest benefit for Safari and Edge users.
   *
   * CF API: `h2_prioritization` (`"on"` / `"off"`)
   * CF default: Off. Pro+ plans only.
   * Caddy: No direct equivalent. Simulated as a config-only flag for Pulumi.
   *
   * @default false
   */
  enhancedH2Prioritization: BoolToggle,

  /**
   * Enable HTTP/2 for edge-to-origin connections (upstream).
   * Enables connection multiplexing to origin, reducing handshake overhead.
   * Falls back to HTTP/1.1 if origin does not support HTTP/2 via ALPN.
   *
   * CF API: `origin_h2_max_streams` (number, 0 = disabled)
   * CF default: 200 streams (Free/Pro/Biz), 1 stream (Enterprise).
   * Caddy: `reverse_proxy` with `transport http { versions h2c 2 }`.
   *
   * @default true
   */
  http2ToOrigin: v.optional(v.boolean(), true),

  /**
   * Maximum concurrent HTTP/2 streams per origin connection.
   * Only relevant when `http2ToOrigin` is true.
   *
   * CF API: `origin_h2_max_streams` (number)
   * CF default: 200 (Free/Pro/Biz).
   * Caddy: Not directly configurable per-connection. Config-only for Pulumi.
   *
   * @default 200
   */
  originH2MaxStreams: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(256)), 200),
});

/** Inferred output type for {@link ProtocolConfigSchema}. */
export type ProtocolConfig = v.InferOutput<typeof ProtocolConfigSchema>;

// =============================================================================
// Content Optimization
// =============================================================================

/**
 * Auto Minify configuration.
 * Controls which content types are minified at the edge.
 *
 * CF API: `minify` object with `html`, `css`, `js` booleans.
 */
export const AutoMinifyConfigSchema = v.strictObject({
  /**
   * Minify HTML responses.
   * Local simulation: `html-minifier-terser` applied as a Caddy response filter.
   * Strips whitespace, removes comments, collapses attributes.
   *
   * @default false
   */
  html: BoolToggle,

  /**
   * Minify CSS responses.
   * Local simulation: pass-through (Vite/SvelteKit already minifies CSS in production builds).
   * Flag preserved for Pulumi IaC generation.
   *
   * @default false
   */
  css: BoolToggle,

  /**
   * Minify JavaScript responses.
   * Local simulation: pass-through (Vite/SvelteKit already minifies JS in production builds).
   * Flag preserved for Pulumi IaC generation.
   *
   * @default false
   */
  js: BoolToggle,
});

/** Inferred output type for {@link AutoMinifyConfigSchema}. */
export type AutoMinifyConfig = v.InferOutput<typeof AutoMinifyConfigSchema>;

/**
 * Speed Brain configuration.
 * Injects Speculation Rules API header for speculative prefetching.
 * Only works in Chromium 121+ browsers.
 *
 * CF API: `speed_brain` (`"on"` / `"off"`)
 */
export const SpeedBrainConfigSchema = v.strictObject({
  /**
   * Enable Speed Brain prefetching.
   * When enabled, Caddy injects a `Speculation-Rules` response header pointing
   * to a local JSON endpoint that returns the speculation rules configuration.
   *
   * CF default: On for Free plans, available for all others.
   * CF constraint: Routes using Workers are excluded. Incompatible with CSP `strict-dynamic`.
   *
   * @default false
   */
  enabled: BoolToggle,

  /**
   * Eagerness level for speculative prefetch.
   * - `conservative`: prefetch only on strong intent (mousedown on link)
   * - `moderate`: prefetch on hover
   * - `eager`: prefetch all same-origin links immediately
   *
   * CF uses `conservative` exclusively.
   * Local simulation allows all three for testing.
   *
   * @default 'conservative'
   */
  eagerness: v.optional(
    v.picklist(['conservative', 'moderate', 'eager']),
    'conservative',
  ),

  /**
   * URL pattern for which links to prefetch.
   * Matches against `href_matches` in the speculation rules.
   *
   * CF default: `/*` (all same-origin links).
   *
   * @default '/*'
   */
  hrefMatches: v.optional(v.string(), '/*'),
});

/** Inferred output type for {@link SpeedBrainConfigSchema}. */
export type SpeedBrainConfig = v.InferOutput<typeof SpeedBrainConfigSchema>;

/**
 * Content optimization configuration.
 * Controls HTML/JS/CSS transforms, prefetching, and resource hints.
 *
 * CF API fields: `early_hints`, `rocket_loader`, `minify`, `speed_brain`,
 * `prefetch_preload`, `mirage`
 */
export const ContentOptimizationConfigSchema = v.strictObject({
  /**
   * Enable Early Hints (HTTP 103).
   * Caddy sends a `103 Early Hints` informational response with `Link` preload
   * headers before the final response arrives. Browsers begin fetching critical
   * resources (CSS, fonts, JS) while the origin processes the request.
   *
   * CF API: `early_hints` (`"on"` / `"off"`)
   * CF default: Off.
   * Caddy: Custom handler that parses `Link` headers from origin response,
   * sends `103` with those headers, then forwards the final response.
   *
   * @default false
   */
  earlyHints: BoolToggle,

  /**
   * Static Link preload entries for Early Hints.
   * When `earlyHints` is true, these are always included in the `103` response
   * regardless of what the origin returns.
   *
   * Each entry is a URL path and a resource type (`style`, `script`, `font`, `image`).
   *
   * @default []
   *
   * @example
   * ```typescript
   * earlyHintLinks: [
   *   { href: '/assets/main.css', as: 'style' },
   *   { href: '/assets/app.js', as: 'script' },
   * ]
   * ```
   */
  earlyHintLinks: v.optional(
    v.array(
      v.strictObject({
        /** Resource URL path. */
        href: v.string(),
        /** Resource type hint. */
        as: v.picklist(['style', 'script', 'font', 'image', 'fetch']),
        /** Optional crossorigin attribute. */
        crossorigin: v.optional(v.picklist(['anonymous', 'use-credentials'])),
      }),
    ),
    [],
  ),

  /**
   * Enable Rocket Loader.
   * Defers ALL JavaScript execution until after page rendering completes.
   * Preserves original script execution order. Cloudflare injects a loader
   * stub and rewrites `<script>` tags to `<script type="text/rocketscript">`.
   *
   * Local simulation: Caddy response body filter that:
   * 1. Rewrites `<script>` → `<script type="text/rocketscript">`
   * 2. Injects a local rocket-loader.js stub before `</body>`
   *
   * CF API: `rocket_loader` (`"on"` / `"off"`)
   * CF default: Off.
   *
   * Known limitations: May conflict with inline JS, jQuery, CSP nonce/strict-dynamic.
   *
   * @default false
   */
  rocketLoader: BoolToggle,

  /**
   * Auto Minify configuration.
   * Controls per-content-type minification at the edge.
   *
   * CF API: `minify` object.
   */
  autoMinify: v.optional(AutoMinifyConfigSchema, {}),

  /**
   * Speed Brain speculative prefetching configuration.
   */
  speedBrain: v.optional(SpeedBrainConfigSchema, {}),

  /**
   * Enable Prefetch URLs.
   * Pre-populates edge cache from a manifest file.
   * Enterprise-only feature on Cloudflare.
   *
   * CF API: `prefetch_preload` (`"on"` / `"off"`)
   * CF default: Off.
   * Local simulation: reads manifest, warms Caddy's local cache on startup.
   *
   * @default false
   */
  prefetchUrls: BoolToggle,

  /**
   * Manifest URL for Prefetch URLs feature.
   * The manifest is a `text/plain` file with one URL per line.
   * Maximum 16 manifest files, 100 URLs per manifest, 1 MB file size.
   *
   * Only relevant when `prefetchUrls` is true.
   *
   * @default undefined
   */
  prefetchManifestUrl: v.optional(v.string()),

  /**
   * Enable Mirage.
   * Lazy-loads images based on device connection speed.
   * Replaces `<img>` src with low-res placeholder, swaps on scroll/load.
   *
   * CF API: `mirage` (`"on"` / `"off"`)
   * CF default: Off. Pro+ plans only.
   * Local simulation: Caddy response body filter that injects mirage.js stub
   * before `</body>`. The stub adds `loading="lazy"` to `<img>` tags and
   * optionally replaces `src` with a tiny placeholder data URI.
   *
   * @default false
   */
  mirage: BoolToggle,
});

/** Inferred output type for {@link ContentOptimizationConfigSchema}. */
export type ContentOptimizationConfig = v.InferOutput<typeof ContentOptimizationConfigSchema>;

// =============================================================================
// Compression
// =============================================================================

/**
 * Compression configuration.
 * Controls which algorithms are available and their priority order.
 *
 * Caddy: `encode` directive with algorithm modules.
 * CF: Compression Rules API (per-route overrides) + plan defaults.
 */
export const CompressionConfigSchema = v.strictObject({
  /**
   * Enable Brotli compression.
   * Higher compression ratio than gzip, supported by all modern browsers.
   *
   * CF default: On (default algorithm for Pro/Business plans).
   * Caddy: `encode br` with configurable quality level.
   *
   * @default true
   */
  brotli: v.optional(v.boolean(), true),

  /**
   * Brotli compression quality level.
   * 0 = fastest (least compression), 11 = best compression (slowest).
   * Caddy default is 4. CF uses server-side optimized levels.
   *
   * @default 4
   */
  brotliQuality: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(11)), 4),

  /**
   * Enable Gzip compression.
   * Universal fallback for browsers that do not support Brotli.
   *
   * CF default: On (default algorithm for Enterprise plans).
   * Caddy: `encode gzip` with configurable level.
   *
   * @default true
   */
  gzip: v.optional(v.boolean(), true),

  /**
   * Gzip compression level.
   * 1 = fastest (least compression), 9 = best compression (slowest).
   * Caddy default is 5 (maps to `gzip.DefaultCompression`).
   *
   * @default 5
   */
  gzipLevel: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(9)), 5),

  /**
   * Enable Zstandard compression.
   * Newest algorithm. Better ratio than Brotli at fast settings.
   * Limited browser support (Chrome 123+, Firefox 126+).
   *
   * CF default: On (default algorithm for Free plans).
   * Caddy: `encode zstd` (requires Caddy 2.7+).
   *
   * @default false
   */
  zstd: BoolToggle,

  /**
   * Algorithm preference order (highest priority first).
   * Caddy uses the order of `encode` modules to determine preference.
   * When a client supports multiple algorithms, the first match wins.
   *
   * CF default order varies by plan. This lets you override locally.
   *
   * @default ['zstd', 'br', 'gzip']
   */
  preferenceOrder: v.optional(
    v.array(v.picklist(['zstd', 'br', 'gzip'])),
    ['zstd', 'br', 'gzip'],
  ),

  /**
   * Minimum response body size (bytes) before compression kicks in.
   * Responses smaller than this are sent uncompressed.
   *
   * CF: 48 bytes (gzip), 50 bytes (br, zstd).
   * Caddy: `minimum_length` on encode directive.
   *
   * @default 50
   */
  minimumLength: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 50),
});

/** Inferred output type for {@link CompressionConfigSchema}. */
export type CompressionConfig = v.InferOutput<typeof CompressionConfigSchema>;

// =============================================================================
// Image Optimization
// =============================================================================

/**
 * Polish mode — image compression at the edge.
 *
 * CF API: `polish` (`"off"`, `"lossless"`, `"lossy"`) + `webp` (separate boolean).
 */
const PolishModeSchema = v.picklist(['off', 'lossless', 'lossy']);

/**
 * Image fit mode — how the image is resized to fit the target dimensions.
 */
const ImageFitSchema = v.picklist([
  'scale-down',
  'contain',
  'cover',
  'crop',
  'pad',
  'squeeze',
]);

/**
 * Image output format.
 */
const ImageFormatSchema = v.picklist([
  'auto',
  'avif',
  'webp',
  'jpeg',
  'baseline-jpeg',
  'json',
]);

/**
 * Image gravity / focal point for crop operations.
 */
const ImageGravitySchema = v.union([
  v.picklist(['auto', 'face', 'left', 'right', 'top', 'bottom']),
  v.pipe(v.string(), v.regex(/^\d+(\.\d+)?x\d+(\.\d+)?$/)),
]);

/**
 * Image metadata preservation mode.
 */
const ImageMetadataSchema = v.picklist(['copyright', 'keep', 'none']);

/**
 * Image Resizing configuration.
 * Controls the local sharp-based image transformer companion service.
 *
 * CF: `/cdn-cgi/image/` URL format routed to Image Resizing service.
 * Local: Caddy routes `/cdn-cgi/image/*` to a local sharp HTTP service.
 */
export const ImageResizingConfigSchema = v.strictObject({
  /**
   * Enable image resizing.
   * When enabled, Caddy routes `/cdn-cgi/image/*` requests to the
   * local image transformer companion service.
   *
   * CF: Requires Business+ plan or Workers.
   * Local: Always available when enabled.
   *
   * @default false
   */
  enabled: BoolToggle,

  /**
   * Port for the image transformer companion service.
   * The service runs at `localhost:{port}` (not HTTPS — internal only).
   *
   * @default 9013
   */
  port: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1024), v.maxValue(65535)), 9013),

  /**
   * Default output quality when not specified in the URL.
   *
   * CF default: 85.
   *
   * @default 85
   */
  defaultQuality: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)), 85),

  /**
   * Default output format when not specified in the URL.
   * `auto` selects WebP or AVIF based on Accept header.
   *
   * @default 'auto'
   */
  defaultFormat: v.optional(ImageFormatSchema, 'auto'),

  /**
   * Maximum allowed image dimension (width or height) in pixels.
   * Requests exceeding this are rejected with 400.
   *
   * @default 4096
   */
  maxDimension: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 4096),

  /**
   * Maximum allowed input file size in bytes.
   * CF limit: 70 MB. Local default is more conservative.
   *
   * @default 20971520 (20 MB)
   */
  maxInputSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 20_971_520),

  /**
   * Enable AVIF output format support.
   * AVIF encoding is CPU-intensive. Disable for faster local dev.
   *
   * @default true
   */
  avifEnabled: v.optional(v.boolean(), true),

  /**
   * Enable face detection for `gravity=face`.
   * Requires optional `@mediapipe/face_detection` peer dependency.
   * When disabled, `gravity=face` falls back to `gravity=auto` (center).
   *
   * @default false
   */
  faceDetection: BoolToggle,
});

/** Inferred output type for {@link ImageResizingConfigSchema}. */
export type ImageResizingConfig = v.InferOutput<typeof ImageResizingConfigSchema>;

/**
 * Polish configuration — automatic image compression.
 *
 * CF API: `polish` + `webp` fields.
 */
export const PolishConfigSchema = v.strictObject({
  /**
   * Polish compression mode.
   * - `off`: No Polish processing.
   * - `lossless`: Strip metadata only (EXIF, XMP, ICC). No quality loss.
   * - `lossy`: Compress + strip metadata. Slight quality reduction.
   *
   * CF API: `polish` (`"off"`, `"lossless"`, `"lossy"`)
   * CF default: Off. Pro+ plans only.
   * Local: Applied by the sharp companion service.
   *
   * @default 'off'
   */
  mode: v.optional(PolishModeSchema, 'off'),

  /**
   * Enable WebP conversion.
   * When true, images are converted to WebP format for supporting browsers.
   * Separate from Polish mode — can be combined with lossless or lossy.
   *
   * CF API: `webp` (separate boolean, only effective when Polish is not `off`)
   * CF default: Off.
   * Local: sharp converts to WebP when `Accept: image/webp` is present.
   *
   * @default false
   */
  webp: BoolToggle,

  /**
   * Quality level for lossy Polish mode.
   * Only applies when `mode` is `lossy`.
   *
   * @default 85
   */
  lossyQuality: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)), 85),
});

/** Inferred output type for {@link PolishConfigSchema}. */
export type PolishConfig = v.InferOutput<typeof PolishConfigSchema>;

/**
 * Image optimization configuration.
 * Groups Image Resizing and Polish settings.
 */
export const ImageOptimizationConfigSchema = v.strictObject({
  /** Image Resizing (transform images via URL). */
  resizing: v.optional(ImageResizingConfigSchema, {}),

  /** Polish (automatic image compression). */
  polish: v.optional(PolishConfigSchema, {}),
});

/** Inferred output type for {@link ImageOptimizationConfigSchema}. */
export type ImageOptimizationConfig = v.InferOutput<typeof ImageOptimizationConfigSchema>;

// =============================================================================
// Network Settings
// =============================================================================

/**
 * Network configuration.
 * Controls WebSockets, gRPC, IP Geolocation, upload limits, and buffering.
 *
 * CF API fields: `websockets`, `grpc`, `ip_geolocation`, `ipv6`, `response_buffering`
 */
export const NetworkConfigSchema = v.strictObject({
  /**
   * Enable WebSocket proxying.
   * Caddy natively supports WebSocket upgrades through `reverse_proxy`.
   *
   * CF API: `websockets` (`"on"` / `"off"`)
   * CF default: Off (toggle on).
   * Caddy: Automatic when the client sends `Upgrade: websocket`.
   * When disabled, Caddy strips `Upgrade` and `Connection` headers.
   *
   * @default true
   */
  websockets: v.optional(v.boolean(), true),

  /**
   * Enable gRPC proxying.
   * Requires HTTP/2 and TLS. Caddy proxies `application/grpc` content type
   * via `reverse_proxy` with HTTP/2 transport.
   *
   * CF API: `grpc` (`"on"` / `"off"`)
   * CF default: Off. Requires port 443, TLS, HTTP/2 ALPN.
   * Caddy: `reverse_proxy` with `transport http { versions h2c 2 }` and
   * `flush_interval -1` for streaming.
   *
   * @default false
   */
  grpc: BoolToggle,

  /**
   * Enable IP Geolocation header injection.
   * Adds `CF-IPCountry` header with ISO 3166-1 alpha-2 country code.
   *
   * CF API: `ip_geolocation` (`"on"` / `"off"`)
   * CF default: Off.
   * Local simulation: Injects header with `defaultCountry` value.
   * Optional: MaxMind GeoLite2 database for real IP-to-country lookup.
   *
   * @default true
   */
  ipGeolocation: v.optional(v.boolean(), true),

  /**
   * Default country code for IP Geolocation in local dev.
   * Used when MaxMind GeoLite2 is not available or for loopback IPs.
   *
   * @default 'US'
   */
  defaultCountry: v.optional(CountryCodeSchema, 'US'),

  /**
   * Path to MaxMind GeoLite2 Country database file (.mmdb).
   * When provided and `ipGeolocation` is true, the edge tool performs
   * real IP-to-country lookups instead of using `defaultCountry`.
   *
   * Download from: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
   * Recommended location: `.resist/geo/GeoLite2-Country.mmdb`
   *
   * @default undefined
   */
  geoLite2DbPath: v.optional(v.string()),

  /**
   * Enable IPv6 compatibility.
   * Caddy supports IPv6 natively. This flag controls whether the
   * Caddy listener binds to IPv6 addresses.
   *
   * CF API: `ipv6` (`"on"` / `"off"`)
   * CF default: Off.
   * Caddy: Bind to `[::]` vs `0.0.0.0`.
   *
   * @default false
   */
  ipv6: BoolToggle,

  /**
   * Maximum upload size in megabytes.
   * CF plan limits: Free/Pro 100MB, Business 200MB, Enterprise 500MB.
   *
   * Caddy: `request_body { max_size <value>MB }` directive.
   *
   * @default 100
   */
  maxUploadSizeMb: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(500)), 100),

  /**
   * Enable response buffering.
   * When enabled, Caddy buffers the entire upstream response before
   * sending to the client. Useful for transforms that need the full body.
   *
   * CF API: `response_buffering` (`"on"` / `"off"`)
   * CF default: Off. Enterprise only.
   * Caddy: `reverse_proxy` with `flush_interval -1` (disable streaming)
   * or `flush_interval 100ms` (buffered streaming).
   *
   * @default false
   */
  responseBuffering: BoolToggle,

  /**
   * Flush interval for streaming responses (milliseconds).
   * Only relevant when `responseBuffering` is false.
   * `-1` disables flushing (full buffering). `0` flushes immediately.
   *
   * Caddy: `reverse_proxy` `flush_interval` option.
   *
   * @default 100
   */
  flushIntervalMs: v.optional(v.pipe(v.number(), v.integer(), v.minValue(-1)), 100),
});

/** Inferred output type for {@link NetworkConfigSchema}. */
export type NetworkConfig = v.InferOutput<typeof NetworkConfigSchema>;

// =============================================================================
// Root Performance Config
// =============================================================================

/**
 * Performance configuration schema.
 * Root schema composing protocol, content, compression, image, and network settings.
 *
 * Mounted at `EdgeConfigSchema.performance`.
 *
 * @example
 * ```typescript
 * // resist.config.ts
 * export default defineConfig({
 *   tooling: {
 *     edge: {
 *       enabled: true,
 *       performance: {
 *         protocol: { http3: true, zeroRtt: true },
 *         content: { earlyHints: true, speedBrain: { enabled: true } },
 *         compression: { brotli: true, zstd: true },
 *         images: {
 *           resizing: { enabled: true },
 *           polish: { mode: 'lossy', webp: true },
 *         },
 *         network: { websockets: true, grpc: true, maxUploadSizeMb: 200 },
 *       },
 *     },
 *   },
 * });
 * ```
 */
export const PerformanceConfigSchema = v.strictObject({
  /** Protocol optimization settings (HTTP/2, HTTP/3, 0-RTT). */
  protocol: v.optional(ProtocolConfigSchema, {}),

  /** Content optimization (Early Hints, Rocket Loader, minify, Speed Brain). */
  content: v.optional(ContentOptimizationConfigSchema, {}),

  /** Compression settings (Brotli, Gzip, Zstandard). */
  compression: v.optional(CompressionConfigSchema, {}),

  /** Image optimization (Resizing, Polish). */
  images: v.optional(ImageOptimizationConfigSchema, {}),

  /** Network settings (WebSockets, gRPC, geolocation, upload limits). */
  network: v.optional(NetworkConfigSchema, {}),
});

/** Inferred output type for {@link PerformanceConfigSchema}. */
export type PerformanceConfig = v.InferOutput<typeof PerformanceConfigSchema>;
```

---

## 3. Protocol Settings — Caddy Generation

### File: `packages/shared/utils/cli/src/tools/edge/utils/performance-protocol.ts`

```typescript
/**
 * Generates Caddy global options and server options for protocol settings.
 *
 * @param protocol - Validated protocol configuration.
 * @returns Caddy global options block fragment.
 */
function generateProtocolOptions(protocol: ProtocolConfig): Result<Str> {
  const lines: Array<Str> = [];

  // --- Global options block ---
  // HTTP/3 requires explicit opt-in
  if (protocol.http3) {
    lines.push('\texperimental_http3');
  }

  // --- Server options ---
  // HTTP version negotiation
  if (!protocol.http2 && !protocol.http3) {
    // Only HTTP/1.1
    lines.push('\tservers {\n\t\tprotocols h1\n\t}');
  } else if (protocol.http2 && !protocol.http3) {
    // HTTP/1.1 + HTTP/2 (Caddy default when TLS is active — no directive needed)
    // Explicitly set for clarity
    lines.push('\tservers {\n\t\tprotocols h1 h2\n\t}');
  } else if (protocol.http2 && protocol.http3) {
    // HTTP/1.1 + HTTP/2 + HTTP/3
    lines.push('\tservers {\n\t\tprotocols h1 h2 h3\n\t}');
  } else if (!protocol.http2 && protocol.http3) {
    // HTTP/1.1 + HTTP/3 (unusual but possible)
    lines.push('\tservers {\n\t\tprotocols h1 h3\n\t}');
  }

  return okUnchecked(lines.join('\n') as Str);
}
```

**Caddy global options output example (HTTP/3 enabled):**

```caddyfile
{
	experimental_http3
	servers {
		protocols h1 h2 h3
	}
}
```

### 0-RTT Simulation

0-RTT is a TLS-level optimization that cannot be directly simulated in Caddy. Instead, the edge tool injects the `Early-Data: 1` request header to let applications test their early-data handling:

```typescript
/**
 * Generates Caddy `header_up` directive to simulate 0-RTT Early-Data header.
 * Injected into reverse_proxy blocks when zeroRtt is enabled.
 *
 * In production, Cloudflare adds this header when a request uses TLS 1.3 early data.
 * Locally, we always add it for GET/HEAD/OPTIONS so apps can test their handling.
 *
 * @param zeroRtt - Whether 0-RTT is enabled.
 * @returns Caddy directive string for the reverse_proxy transport block, or empty string.
 */
function generateZeroRttDirective(zeroRtt: Boolean): Result<Str> {
  if (!zeroRtt) {
    return okUnchecked('' as Str);
  }

  const directive: Str = [
    '\t\t@earlyDataMethods {',
    '\t\t\tmethod GET HEAD OPTIONS',
    '\t\t}',
    '\t\t\theader_up @earlyDataMethods Early-Data 1',
  ].join('\n') as Str;

  return okUnchecked(directive);
}
```

### HTTP/2 to Origin

When `http2ToOrigin` is true, the `reverse_proxy` transport block uses HTTP/2:

```typescript
/**
 * Generates Caddy reverse_proxy transport options for HTTP/2 to origin.
 *
 * @param protocol - Protocol configuration.
 * @returns Caddy transport block fragment for reverse_proxy.
 */
function generateOriginTransport(protocol: ProtocolConfig): Result<Str> {
  if (!protocol.http2ToOrigin) {
    return okUnchecked('' as Str);
  }

  // h2c for unencrypted local upstream (localhost:port)
  const transport: Str = [
    '\t\ttransport http {',
    '\t\t\tversions h2c 2',
    '\t\t}',
  ].join('\n') as Str;

  return okUnchecked(transport);
}
```

**Enhanced HTTP/2 Prioritization**: No Caddy equivalent. The schema field is preserved for Pulumi IaC generation only. A comment is emitted in the Caddyfile:

```caddyfile
# Enhanced HTTP/2 Prioritization: enabled (Pulumi-only, no Caddy equivalent)
```

---

## 4. Content Optimization — Caddy Response Filters

### 4.1 Early Hints (103)

Caddy does not natively emit `103 Early Hints`. We use a Caddy `respond` handler chained before the `reverse_proxy`:

```typescript
/**
 * Generates Caddy directives for Early Hints (HTTP 103) simulation.
 *
 * Strategy: Use a `route` block that first tries to send a 103 informational
 * response via Caddy's `push` or a custom handler, then forwards to origin.
 *
 * Since Caddy does not natively support 103, we simulate it by injecting
 * `Link` preload headers on the final response instead. Browsers that
 * support Early Hints will still benefit from preload hints in 200 responses.
 *
 * @param content - Content optimization configuration.
 * @returns Caddy directives for Early Hints.
 */
function generateEarlyHintsDirectives(content: ContentOptimizationConfig): Result<Str> {
  if (!content.earlyHints) {
    return okUnchecked('' as Str);
  }

  const linkHeaders: Array<Str> = content.earlyHintLinks.map((link) => {
    const parts: Array<Str> = [`<${link.href}>`, `rel=preload`, `as=${link.as}`];
    if (link.crossorigin) {
      parts.push(`crossorigin=${link.crossorigin}`);
    }
    return `\theader +Link "${parts.join('; ')}"` as Str;
  });

  if (linkHeaders.length === 0) {
    return okUnchecked('# Early Hints: enabled but no static links configured\n' as Str);
  }

  return okUnchecked(linkHeaders.join('\n') as Str);
}
```

**Caddy output example:**

```caddyfile
# Early Hints (Link preload headers)
header +Link "</$assets/main.css>; rel=preload; as=style"
header +Link "</assets/app.js>; rel=preload; as=script"
```

### 4.2 Rocket Loader

Simulated via Caddy `templates` directive or an exec-based response body filter. The preferred approach is a custom Caddy handler (Go plugin in the custom build), but for simplicity we use Caddy's `respond` with a filter script:

```typescript
/**
 * Generates Caddy directives for Rocket Loader simulation.
 *
 * Rocket Loader rewrites all <script> tags to type="text/rocketscript"
 * and injects a loader stub that re-executes them after DOMContentLoaded.
 *
 * Implementation: A Node.js sidecar process that:
 * 1. Receives HTML responses from Caddy via `exec` transport
 * 2. Rewrites <script> → <script type="text/rocketscript">
 * 3. Injects rocket-loader-stub.js before </body>
 * 4. Returns modified HTML
 *
 * Alternative: Caddy `templates` directive with custom functions.
 * This is simpler but less accurate.
 *
 * For local dev, we use a middleware approach:
 * - Caddy `reverse_proxy` response header includes `X-Edge-Rocket-Loader: 1`
 * - A Caddy `templates` block processes HTML responses
 *
 * @param content - Content optimization configuration.
 * @returns Caddy directives for Rocket Loader.
 */
function generateRocketLoaderDirectives(content: ContentOptimizationConfig): Result<Str> {
  if (!content.rocketLoader) {
    return okUnchecked('' as Str);
  }

  // The rocket loader stub is served from a local endpoint
  const directives: Str = [
    '\t# Rocket Loader simulation',
    '\t# Inject deferred script loader before </body>',
    '\treplace_filter {',
    '\t\tcontent_type text/html',
    '\t\tsearch_pattern </body>',
    '\t\treplacement <script src="/.edge/rocket-loader.js" defer></script></body>',
    '\t}',
  ].join('\n') as Str;

  return okUnchecked(directives);
}
```

**Companion asset: `rocket-loader.js`**

The edge tool serves a local rocket-loader.js stub at `/.edge/rocket-loader.js`:

```javascript
/**
 * Minimal Rocket Loader simulation.
 * Finds all <script type="text/rocketscript"> tags, creates real <script>
 * elements, and executes them in order after DOMContentLoaded.
 */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var scripts = document.querySelectorAll('script[type="text/rocketscript"]');
    var queue = Array.prototype.slice.call(scripts);
    function next() {
      if (queue.length === 0) return;
      var old = queue.shift();
      var s = document.createElement('script');
      if (old.src) {
        s.src = old.src;
        s.onload = next;
        s.onerror = next;
      } else {
        s.textContent = old.textContent;
      }
      old.parentNode.replaceChild(s, old);
      if (!old.src) next();
    }
    next();
  });
})();
```

### 4.3 Auto Minify (HTML)

CSS and JS minification is a no-op locally (Vite handles it). HTML minification uses `html-minifier-terser` via a sidecar:

```typescript
/**
 * Generates Caddy directives for HTML auto-minification.
 *
 * Strategy: Route HTML responses through a local minifier sidecar.
 * The sidecar is a tiny HTTP service using `html-minifier-terser`.
 *
 * Caddy's `reverse_proxy` response body cannot be easily transformed
 * inline, so we use a chained proxy approach:
 *   Client → Caddy → Origin → Caddy → Minifier Sidecar → Client
 *
 * Alternative: Use the `replace_filter` Caddy module for simple
 * whitespace stripping (less accurate but no sidecar needed).
 *
 * @param autoMinify - Auto minify configuration.
 * @returns Caddy directives.
 */
function generateAutoMinifyDirectives(autoMinify: AutoMinifyConfig): Result<Str> {
  if (!autoMinify.html && !autoMinify.css && !autoMinify.js) {
    return okUnchecked('' as Str);
  }

  const lines: Array<Str> = ['\t# Auto Minify' as Str];

  if (autoMinify.html) {
    // For HTML: use replace_filter for basic whitespace collapsing
    // This is a simple simulation — CF's minifier is more sophisticated
    lines.push('\t# HTML minification (basic whitespace collapse)' as Str);
    lines.push('\t# Full html-minifier-terser runs via minifier sidecar on port 9014' as Str);
  }

  if (autoMinify.css) {
    lines.push('\t# CSS minification: pass-through (Vite handles in production builds)' as Str);
  }

  if (autoMinify.js) {
    lines.push('\t# JS minification: pass-through (Vite handles in production builds)' as Str);
  }

  return okUnchecked(lines.join('\n') as Str);
}
```

### 4.4 Speed Brain

```typescript
/**
 * Generates Caddy directives for Speed Brain (Speculation Rules API).
 *
 * Injects a `Speculation-Rules` response header pointing to a local
 * JSON endpoint served by Caddy at `/.edge/speculation-rules.json`.
 *
 * @param speedBrain - Speed Brain configuration.
 * @returns Caddy directives.
 */
function generateSpeedBrainDirectives(speedBrain: SpeedBrainConfig): Result<Str> {
  if (!speedBrain.enabled) {
    return okUnchecked('' as Str);
  }

  const directives: Str = [
    '\t# Speed Brain (Speculation Rules API)',
    '\theader Speculation-Rules "/.edge/speculation-rules.json"',
  ].join('\n') as Str;

  return okUnchecked(directives);
}

/**
 * Generates the speculation-rules.json content.
 *
 * @param speedBrain - Speed Brain configuration.
 * @returns JSON string for the speculation rules endpoint.
 */
function generateSpeculationRulesJson(speedBrain: SpeedBrainConfig): Result<Str> {
  const rules = {
    prefetch: [{
      source: 'document',
      where: {
        and: [{
          href_matches: speedBrain.hrefMatches,
          relative_to: 'document',
        }],
      },
      eagerness: speedBrain.eagerness,
    }],
  };

  return okUnchecked(JSON.stringify(rules, null, 2) as Str);
}
```

**Caddy output example:**

```caddyfile
# Speed Brain (Speculation Rules API)
header Speculation-Rules "/.edge/speculation-rules.json"

# Serve speculation rules JSON
handle /.edge/speculation-rules.json {
	header Content-Type "application/speculationrules+json"
	respond `{"prefetch":[{"source":"document","where":{"and":[{"href_matches":"/*","relative_to":"document"}]},"eagerness":"conservative"}]}`
}
```

### 4.5 Mirage

```typescript
/**
 * Generates Caddy directives for Mirage simulation.
 *
 * Mirage lazy-loads images based on connection speed.
 * Local simulation: inject a <script> that adds `loading="lazy"`
 * to all <img> elements that do not already have it.
 *
 * @param mirage - Whether Mirage is enabled.
 * @returns Caddy directives.
 */
function generateMirageDirectives(mirage: Boolean): Result<Str> {
  if (!mirage) {
    return okUnchecked('' as Str);
  }

  const directives: Str = [
    '\t# Mirage (lazy image loading simulation)',
    '\treplace_filter {',
    '\t\tcontent_type text/html',
    '\t\tsearch_pattern </body>',
    '\t\treplacement <script src="/.edge/mirage.js" defer></script></body>',
    '\t}',
  ].join('\n') as Str;

  return okUnchecked(directives);
}
```

**Companion asset: `mirage.js`**

```javascript
/**
 * Minimal Mirage simulation.
 * Adds loading="lazy" to all images without it.
 */
(function () {
  'use strict';
  document.querySelectorAll('img:not([loading])').forEach(function (img) {
    img.loading = 'lazy';
  });
})();
```

---

## 5. Compression — Caddy `encode` Directive

### File: `packages/shared/utils/cli/src/tools/edge/utils/performance-compression.ts`

```typescript
/**
 * Generates Caddy `encode` directive for compression.
 *
 * The `encode` directive enables on-the-fly compression. Algorithms
 * are listed in preference order — Caddy picks the first that the
 * client supports via `Accept-Encoding`.
 *
 * @param compression - Validated compression configuration.
 * @returns Caddy `encode` directive block.
 */
function generateCompressionDirectives(compression: CompressionConfig): Result<Str> {
  const enabledAlgorithms = compression.preferenceOrder.filter((algo) => {
    if (algo === 'br') return compression.brotli;
    if (algo === 'gzip') return compression.gzip;
    if (algo === 'zstd') return compression.zstd;
    return false;
  });

  if (enabledAlgorithms.length === 0) {
    return okUnchecked('# Compression: disabled (no algorithms enabled)\n' as Str);
  }

  const lines: Array<Str> = ['\tencode {' as Str];

  for (const algo of enabledAlgorithms) {
    if (algo === 'zstd') {
      lines.push('\t\tzstd' as Str);
    } else if (algo === 'br') {
      lines.push(`\t\tbr ${compression.brotliQuality}` as Str);
    } else if (algo === 'gzip') {
      lines.push(`\t\tgzip ${compression.gzipLevel}` as Str);
    }
  }

  lines.push(`\t\tminimum_length ${compression.minimumLength}` as Str);
  lines.push('\t}' as Str);

  return okUnchecked(lines.join('\n') as Str);
}
```

**Caddy output example (default config):**

```caddyfile
encode {
	zstd
	br 4
	gzip 5
	minimum_length 50
}
```

---

## 6. Image Optimization — Sharp Companion Service

### 6.1 Architecture

```
Client Request:
  GET /cdn-cgi/image/width=200,quality=80,format=webp/uploads/photo.jpg

Caddy Routing:
  /cdn-cgi/image/* → reverse_proxy localhost:9013

Image Transformer Service (Node.js + sharp):
  1. Parse URL → extract options + source image path
  2. Fetch source image from origin (or local filesystem)
  3. Apply transformations via sharp pipeline
  4. Return transformed image with correct Content-Type
```

### 6.2 Caddy Routing

```typescript
/**
 * Generates Caddy directives for image resizing routing.
 *
 * Routes `/cdn-cgi/image/*` to the local image transformer service.
 * Also handles Polish (transparent compression of image responses).
 *
 * @param images - Image optimization configuration.
 * @returns Caddy directives.
 */
function generateImageDirectives(images: ImageOptimizationConfig): Result<Str> {
  const lines: Array<Str> = [];

  if (images.resizing.enabled) {
    lines.push('\t# Image Resizing: route /cdn-cgi/image/* to sharp service' as Str);
    lines.push(`\thandle /cdn-cgi/image/* {` as Str);
    lines.push(`\t\treverse_proxy localhost:${images.resizing.port}` as Str);
    lines.push('\t}' as Str);
  }

  if (images.polish.mode !== 'off') {
    lines.push(`\t# Polish: ${images.polish.mode} mode${images.polish.webp ? ' + WebP' : ''}` as Str);
    lines.push('\t# Image responses are routed through sharp for compression' as Str);
    // Polish is applied by the same sharp service when it detects image content types
    // in non /cdn-cgi/image/* responses. Caddy uses a handle_response filter.
    lines.push('\t@imageResponse header Content-Type image/*' as Str);
    lines.push(`\thandle_response @imageResponse {` as Str);
    lines.push(`\t\treverse_proxy localhost:${images.resizing.port} {` as Str);
    lines.push(`\t\t\theader_up X-Polish-Mode "${images.polish.mode}"` as Str);
    if (images.polish.webp) {
      lines.push('\t\t\theader_up X-Polish-WebP "1"' as Str);
    }
    lines.push('\t\t}' as Str);
    lines.push('\t}' as Str);
  }

  return okUnchecked(lines.join('\n') as Str);
}
```

### 6.3 Image Transformer Service Implementation Plan

**File: `packages/shared/utils/cli/src/tools/edge/services/image-transformer.ts`**

The image transformer is a standalone HTTP service using Node.js `http` module + `sharp`.

```typescript
/**
 * Image Transformer Companion Service
 *
 * HTTP service that simulates Cloudflare Image Resizing and Polish.
 * Runs at `localhost:{port}` (default 9013).
 *
 * Supports:
 * - /cdn-cgi/image/{options}/{source} — full Image Resizing
 * - Polish passthrough (X-Polish-Mode header) — automatic compression
 *
 * @module
 */

// --- Types ---

/** Parsed image transformation options from URL. */
const ImageOptionsSchema = v.strictObject({
  width: v.optional(v.union([PositiveInt, v.literal('auto')])),
  height: v.optional(PositiveInt),
  fit: v.optional(ImageFitSchema),
  quality: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))),
  format: v.optional(ImageFormatSchema),
  dpr: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(8))),
  gravity: v.optional(ImageGravitySchema),
  metadata: v.optional(ImageMetadataSchema),
  background: v.optional(v.string()),
  blur: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(250))),
  sharpen: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(10))),
  brightness: v.optional(NonNegFloat),
  contrast: v.optional(NonNegFloat),
  gamma: v.optional(NonNegFloat),
  saturation: v.optional(NonNegFloat),
  rotate: v.optional(v.picklist([90, 180, 270])),
  flip: v.optional(v.picklist(['h', 'v', 'hv'])),
  anim: v.optional(v.boolean()),
  onerror: v.optional(v.literal('redirect')),
  compression: v.optional(v.literal('fast')),
  trim: v.optional(v.string()),
});

type ImageOptions = v.InferOutput<typeof ImageOptionsSchema>;
```

**Core request handler logic:**

```typescript
/**
 * Handles an image transform request.
 *
 * @param url - Request URL (e.g., `/cdn-cgi/image/width=200,quality=80/uploads/photo.jpg`).
 * @param acceptHeader - Client Accept header for format negotiation.
 * @param config - Image resizing configuration.
 * @returns Result containing the transformed image buffer and content type.
 */
async function handleImageRequest(
  url: Str,
  acceptHeader: Str,
  config: ImageResizingConfig,
): Promise<Result<ImageResponse>> {
  // 1. Parse the URL
  const parseResult = parseImageUrl(url);
  if (!parseResult.ok) return parseResult;
  const { options, sourcePath } = parseResult.data;

  // 2. Validate options against schema
  const optionsResult = safeParse(ImageOptionsSchema, options);
  if (!optionsResult.ok) return optionsResult;
  const validOptions = optionsResult.data;

  // 3. Resolve source image (local filesystem or fetch from origin)
  const sourceResult = await resolveSourceImage(sourcePath, config);
  if (!sourceResult.ok) return sourceResult;

  // 4. Build sharp pipeline
  const pipelineResult = buildSharpPipeline(
    sourceResult.data,
    validOptions,
    acceptHeader,
    config,
  );
  if (!pipelineResult.ok) return pipelineResult;

  // 5. Execute pipeline and return buffer
  return executePipeline(pipelineResult.data);
}
```

**URL parser:**

```typescript
/**
 * Parses a `/cdn-cgi/image/` URL into options and source path.
 *
 * URL format: `/cdn-cgi/image/<options>/<source>`
 * Options are comma-separated key=value pairs: `width=200,quality=80,format=webp`
 *
 * @param url - The request URL.
 * @returns Parsed options object and source image path.
 */
function parseImageUrl(url: Str): Result<{ options: Record<Str, unknown>; sourcePath: Str }> {
  const prefix: Str = '/cdn-cgi/image/' as Str;
  if (!url.startsWith(prefix)) {
    return err(`URL does not start with ${prefix}: ${url}`);
  }

  const rest: Str = url.slice(prefix.length) as Str;
  const slashIndex: Number = rest.indexOf('/');
  if (slashIndex === -1) {
    return err(`No source path in image URL: ${url}`);
  }

  const optionsStr: Str = rest.slice(0, slashIndex) as Str;
  const sourcePath: Str = rest.slice(slashIndex) as Str;

  // Parse comma-separated key=value pairs
  const options: Record<Str, unknown> = {};
  for (const part of optionsStr.split(',')) {
    const eqIndex: Number = part.indexOf('=');
    if (eqIndex === -1) continue;
    const key: Str = part.slice(0, eqIndex) as Str;
    const value: Str = part.slice(eqIndex + 1) as Str;

    // Expand aliases
    const canonicalKey: Str = expandAlias(key);

    // Parse numeric values
    const numVal: Number = Number(value);
    options[canonicalKey] = isNaN(numVal) ? value : numVal;
  }

  return okUnchecked({ options, sourcePath });
}

/**
 * Expands parameter aliases to canonical names.
 *
 * @param alias - Parameter name or alias.
 * @returns Canonical parameter name.
 */
function expandAlias(alias: Str): Str {
  const aliases: Record<Str, Str> = {
    w: 'width',
    h: 'height',
    q: 'quality',
    f: 'format',
    g: 'gravity',
    scq: 'slowConnectionQuality',
    'face-zoom': 'zoom',
  } as Record<Str, Str>;

  return (aliases[alias] ?? alias) as Str;
}
```

**Sharp pipeline builder:**

```typescript
/**
 * Builds a sharp transformation pipeline from parsed options.
 *
 * @param source - Source image buffer.
 * @param options - Validated image options.
 * @param acceptHeader - Client Accept header for format auto-detection.
 * @param config - Image resizing configuration.
 * @returns Configured sharp instance.
 */
function buildSharpPipeline(
  source: Buffer,
  options: ImageOptions,
  acceptHeader: Str,
  config: ImageResizingConfig,
): Result<sharp.Sharp> {
  let pipeline = sharp(source, {
    animated: options.anim !== false,
    limitInputPixels: 100_000_000, // 100 megapixels (CF limit)
  });

  // --- Resize ---
  if (options.width !== undefined || options.height !== undefined) {
    const width = options.width === 'auto' ? undefined : (
      options.width !== undefined
        ? Math.round((options.width as number) * (options.dpr ?? 1))
        : undefined
    );
    const height = options.height !== undefined
      ? Math.round((options.height as number) * (options.dpr ?? 1))
      : undefined;

    // Clamp to maxDimension
    const maxDim = config.maxDimension;
    const clampedWidth = width !== undefined ? Math.min(width, maxDim) : undefined;
    const clampedHeight = height !== undefined ? Math.min(height, maxDim) : undefined;

    pipeline = pipeline.resize({
      width: clampedWidth,
      height: clampedHeight,
      fit: mapFitMode(options.fit ?? 'scale-down'),
      background: options.background ?? { r: 0, g: 0, b: 0, alpha: 0 },
      position: mapGravity(options.gravity),
      withoutEnlargement: options.fit === 'scale-down' || options.fit === 'crop',
    });
  }

  // --- Rotate ---
  if (options.rotate !== undefined) {
    pipeline = pipeline.rotate(options.rotate);
  }

  // --- Flip ---
  if (options.flip !== undefined) {
    if (options.flip === 'h' || options.flip === 'hv') pipeline = pipeline.flop();
    if (options.flip === 'v' || options.flip === 'hv') pipeline = pipeline.flip();
  }

  // --- Color adjustments ---
  if (options.brightness !== undefined || options.saturation !== undefined) {
    pipeline = pipeline.modulate({
      brightness: options.brightness,
      saturation: options.saturation,
    });
  }

  if (options.gamma !== undefined) {
    pipeline = pipeline.gamma(options.gamma);
  }

  // --- Sharpen ---
  if (options.sharpen !== undefined && options.sharpen > 0) {
    // sharp's sharpen takes sigma; CF's 0-10 maps roughly to sigma 0-3
    pipeline = pipeline.sharpen({ sigma: options.sharpen * 0.3 });
  }

  // --- Blur ---
  if (options.blur !== undefined) {
    // sharp's blur takes sigma; CF's 1-250 maps roughly to sigma 0.3-75
    pipeline = pipeline.blur(options.blur * 0.3);
  }

  // --- Metadata ---
  if (options.metadata === 'none') {
    pipeline = pipeline.withMetadata({ exif: {}, icc: undefined });
  } else if (options.metadata === 'copyright') {
    // Keep only copyright-related EXIF tags (default for JPEG)
    pipeline = pipeline.keepMetadata();
  } else if (options.metadata === 'keep') {
    pipeline = pipeline.keepMetadata();
  }

  // --- Output format ---
  const resolvedFormat = resolveOutputFormat(options.format ?? config.defaultFormat, acceptHeader);
  const quality = options.quality ?? config.defaultQuality;

  switch (resolvedFormat) {
    case 'webp':
      pipeline = pipeline.webp({ quality, effort: options.compression === 'fast' ? 0 : 4 });
      break;
    case 'avif':
      if (config.avifEnabled) {
        pipeline = pipeline.avif({ quality, effort: options.compression === 'fast' ? 0 : 4 });
      } else {
        // Fall back to WebP when AVIF disabled
        pipeline = pipeline.webp({ quality });
      }
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, progressive: true });
      break;
    case 'baseline-jpeg':
      pipeline = pipeline.jpeg({ quality, progressive: false });
      break;
    case 'json':
      // Return metadata only
      break;
    default:
      pipeline = pipeline.webp({ quality });
  }

  return okUnchecked(pipeline);
}

/**
 * Maps CF fit mode to sharp fit value.
 */
function mapFitMode(fit: Str): Str {
  const map: Record<Str, Str> = {
    'scale-down': 'inside',
    contain: 'inside',
    cover: 'cover',
    crop: 'cover',
    pad: 'contain',
    squeeze: 'fill',
  } as Record<Str, Str>;
  return (map[fit] ?? 'inside') as Str;
}

/**
 * Maps CF gravity to sharp position value.
 */
function mapGravity(gravity: Str | undefined): Str {
  if (gravity === undefined || gravity === 'auto') return 'centre' as Str;
  const map: Record<Str, Str> = {
    face: 'attention',  // sharp uses 'attention' for saliency
    left: 'left',
    right: 'right',
    top: 'top',
    bottom: 'bottom',
  } as Record<Str, Str>;
  return (map[gravity] ?? 'centre') as Str;
}

/**
 * Resolves output format based on option and Accept header.
 */
function resolveOutputFormat(format: Str, acceptHeader: Str): Str {
  if (format !== 'auto') return format as Str;

  // Auto-negotiate: prefer AVIF > WebP > JPEG
  if (acceptHeader.includes('image/avif')) return 'avif' as Str;
  if (acceptHeader.includes('image/webp')) return 'webp' as Str;
  return 'jpeg' as Str;
}
```

### 6.4 Polish via Sharp

Polish operates on image responses that are NOT `/cdn-cgi/image/` requests. The sharp service handles Polish when it receives a request with `X-Polish-Mode` header:

```typescript
/**
 * Applies Polish compression to an image buffer.
 *
 * @param source - Source image buffer.
 * @param mode - Polish mode (`lossless` or `lossy`).
 * @param webp - Whether to convert to WebP.
 * @param acceptHeader - Client Accept header.
 * @param quality - Lossy quality level.
 * @returns Compressed image buffer and content type.
 */
async function applyPolish(
  source: Buffer,
  mode: Str,
  webp: Boolean,
  acceptHeader: Str,
  quality: Number,
): Promise<Result<ImageResponse>> {
  let pipeline = sharp(source);

  if (mode === 'lossless') {
    // Strip metadata only, no quality loss
    pipeline = pipeline.withMetadata({ exif: {}, icc: undefined });
  }

  if (webp && acceptHeader.includes('image/webp')) {
    // Convert to WebP
    const q = mode === 'lossy' ? quality : 100;
    pipeline = pipeline.webp({
      quality: q,
      lossless: mode === 'lossless',
    });
    const buffer = await pipeline.toBuffer();
    return okUnchecked({ buffer, contentType: 'image/webp' as Str });
  }

  if (mode === 'lossy') {
    // Re-compress with reduced quality
    const metadata = await sharp(source).metadata();
    if (metadata.format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality, progressive: true });
    } else if (metadata.format === 'png') {
      pipeline = pipeline.png({ compressionLevel: 9 });
    }
  }

  const buffer = await pipeline.toBuffer();
  const metadata = await sharp(source).metadata();
  const contentType = `image/${metadata.format}` as Str;

  return okUnchecked({ buffer, contentType });
}
```

### 6.5 HTTP Server Entrypoint

```typescript
/**
 * Starts the image transformer companion HTTP service.
 *
 * @param config - Image resizing configuration.
 * @returns Result containing the HTTP server instance.
 */
function startImageTransformer(config: ImageResizingConfig): Result<http.Server> {
  if (!config.enabled) {
    return err('Image transformer not enabled');
  }

  const server = http.createServer(async (req, res) => {
    const url = req.url ?? '/';
    const acceptHeader = (req.headers.accept ?? '') as Str;

    // Check for Polish passthrough
    const polishMode = req.headers['x-polish-mode'] as Str | undefined;
    if (polishMode) {
      const polishWebp = req.headers['x-polish-webp'] === '1';
      // Read request body (image data from Caddy)
      const chunks: Array<Buffer> = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);

      const result = await applyPolish(
        body,
        polishMode,
        polishWebp,
        acceptHeader,
        config.defaultQuality,
      );
      if (!result.ok) {
        res.writeHead(500);
        res.end('Polish error');
        return;
      }
      res.writeHead(200, { 'Content-Type': result.data.contentType });
      res.end(result.data.buffer);
      return;
    }

    // Image Resizing request
    const result = await handleImageRequest(url as Str, acceptHeader, config);
    if (!result.ok) {
      if (config.enabled) {
        // onerror=redirect: redirect to original image
        res.writeHead(302, { Location: url.replace(/^\/cdn-cgi\/image\/[^/]+/, '') });
        res.end();
      } else {
        res.writeHead(400);
        res.end('Image transform error');
      }
      return;
    }

    res.writeHead(200, {
      'Content-Type': result.data.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'CF-Polished': 'origSize=' + result.data.originalSize,
    });
    res.end(result.data.buffer);
  });

  server.listen(config.port, '127.0.0.1');
  return okUnchecked(server);
}
```

---

## 7. Network Settings — Caddy Directives

### File: `packages/shared/utils/cli/src/tools/edge/utils/performance-network.ts`

```typescript
/**
 * Generates Caddy directives for network settings.
 *
 * @param network - Validated network configuration.
 * @returns Caddy directive block.
 */
function generateNetworkDirectives(network: NetworkConfig): Result<Str> {
  const lines: Array<Str> = [];

  // --- WebSockets ---
  if (!network.websockets) {
    // Caddy proxies WebSocket upgrades by default. To disable,
    // strip the Upgrade header so the upstream never sees it.
    lines.push('\t# WebSockets: disabled' as Str);
    lines.push('\t@websocketUpgrade header Connection *Upgrade*' as Str);
    lines.push('\t@websocketUpgrade header Upgrade websocket' as Str);
    lines.push('\theader_up @websocketUpgrade -Connection' as Str);
    lines.push('\theader_up @websocketUpgrade -Upgrade' as Str);
  } else {
    lines.push('\t# WebSockets: enabled (Caddy default behavior)' as Str);
  }

  // --- gRPC ---
  if (network.grpc) {
    lines.push('\t# gRPC: enabled' as Str);
    lines.push('\t@grpcRequest header Content-Type application/grpc*' as Str);
    lines.push('\treverse_proxy @grpcRequest {upstream} {' as Str);
    lines.push('\t\ttransport http {' as Str);
    lines.push('\t\t\tversions h2c 2' as Str);
    lines.push('\t\t}' as Str);
    lines.push('\t\tflush_interval -1' as Str);
    lines.push('\t}' as Str);
  }

  // --- IP Geolocation ---
  if (network.ipGeolocation) {
    lines.push('\t# IP Geolocation: inject CF-IPCountry header' as Str);
    if (network.geoLite2DbPath) {
      // MaxMind lookup is done in the edge tool, not Caddy
      // The edge tool sets the header via a Caddy CEL expression or
      // pre-computes it and injects via header_up
      lines.push(`\t# Using MaxMind GeoLite2: ${network.geoLite2DbPath}` as Str);
      lines.push('\t# (IP lookup performed by edge tool, header injected dynamically)' as Str);
    } else {
      // Static default country for local dev
      lines.push(`\theader_up CF-IPCountry "${network.defaultCountry}"` as Str);
    }
    // Also inject CF-Connecting-IP for completeness
    lines.push('\theader_up CF-Connecting-IP {remote_host}' as Str);
  }

  // --- IPv6 ---
  if (network.ipv6) {
    lines.push('\t# IPv6: enabled (Caddy binds to [::] by default with IPv6)' as Str);
  }

  // --- Max Upload Size ---
  lines.push(`\t# Max upload size: ${network.maxUploadSizeMb}MB` as Str);
  lines.push(`\trequest_body {` as Str);
  lines.push(`\t\tmax_size ${network.maxUploadSizeMb}MB` as Str);
  lines.push('\t}' as Str);

  // --- Response Buffering ---
  if (network.responseBuffering) {
    lines.push('\t# Response buffering: enabled (full buffering)' as Str);
    lines.push('\treverse_proxy {upstream} {' as Str);
    lines.push('\t\tflush_interval -1' as Str);
    lines.push('\t}' as Str);
  } else if (network.flushIntervalMs >= 0) {
    lines.push(`\t# Flush interval: ${network.flushIntervalMs}ms` as Str);
    lines.push('\treverse_proxy {upstream} {' as Str);
    lines.push(`\t\tflush_interval ${network.flushIntervalMs}ms` as Str);
    lines.push('\t}' as Str);
  }

  return okUnchecked(lines.join('\n') as Str);
}
```

---

## 8. MaxMind GeoLite2 Integration

### 8.1 Architecture

When `network.geoLite2DbPath` is set and `network.ipGeolocation` is true, the edge tool loads the MaxMind GeoLite2 Country database at startup and performs IP-to-country lookups for each request.

**Dependency:** `maxmind` npm package (reads `.mmdb` binary format).

### 8.2 Implementation

```typescript
/**
 * GeoIP lookup service using MaxMind GeoLite2 Country database.
 *
 * @module
 */

import maxmind, { CountryResponse } from 'maxmind';

/** GeoIP reader instance (loaded once at startup). */
let geoReader: maxmind.Reader<CountryResponse> | null = null;

/**
 * Initializes the GeoIP reader from a MaxMind .mmdb file.
 *
 * @param dbPath - Absolute path to the GeoLite2-Country.mmdb file.
 * @returns Ok on success, Err if file not found or corrupted.
 */
async function initGeoIp(dbPath: Str): Promise<Result<Void>> {
  try {
    geoReader = await maxmind.open<CountryResponse>(dbPath);
    return okUnchecked(undefined as Void);
  } catch (e) {
    return err(`Failed to open GeoLite2 database at ${dbPath}: ${e}`);
  }
}

/**
 * Looks up the country code for an IP address.
 *
 * @param ip - IPv4 or IPv6 address string.
 * @param defaultCountry - Fallback country code for loopback/private IPs.
 * @returns ISO 3166-1 alpha-2 country code.
 */
function lookupCountry(ip: Str, defaultCountry: Str): Result<Str> {
  if (geoReader === null) {
    return okUnchecked(defaultCountry);
  }

  // Loopback and private IPs have no geo data
  if (isPrivateIp(ip)) {
    return okUnchecked(defaultCountry);
  }

  const result = geoReader.get(ip);
  if (result === null || result.country === undefined) {
    return okUnchecked(defaultCountry);
  }

  return okUnchecked((result.country.iso_code ?? defaultCountry) as Str);
}

/**
 * Checks if an IP is a private/loopback address.
 *
 * @param ip - IP address string.
 * @returns True if private or loopback.
 */
function isPrivateIp(ip: Str): Boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('fc00:') ||
    ip.startsWith('fe80:')
  ) as Boolean;
}
```

### 8.3 Integration with Caddy

When MaxMind is active, the edge tool cannot inject headers statically in the Caddyfile. Instead, it uses Caddy's `request_header` with a CEL expression, or a Caddy `map` directive. However, Caddy does not natively support MaxMind.

**Preferred approach:** The edge tool runs a tiny HTTP sidecar that receives the client IP and returns the country code. Caddy queries this sidecar via `forward_auth`:

```caddyfile
# GeoIP sidecar at localhost:9015
@needsGeo not header_up CF-IPCountry *
forward_auth @needsGeo localhost:9015 {
	uri /lookup?ip={remote_host}
	copy_headers CF-IPCountry
}
```

**Alternative (simpler, default):** Since most local dev is from loopback, the static `header_up CF-IPCountry "{defaultCountry}"` approach (section 7) is the default. MaxMind is opt-in for developers who need realistic geo-testing (e.g., with VPN or `--expose` mode).

---

## 9. Image Transformer Companion Service — Full Architecture

### 9.1 Service Lifecycle

```
pnpm tool edge
  │
  ├── startEdge()
  │     ├── mergeEdgeConfig(global, product)
  │     ├── ensureResistDirectories(config)
  │     ├── generateCaddyfile(services, config)
  │     ├── startCaddy(caddyfile)
  │     │
  │     ├── if config.performance.images.resizing.enabled:
  │     │     startImageTransformer(config.performance.images)  ← NEW
  │     │
  │     ├── if config.performance.network.geoLite2DbPath:
  │     │     startGeoIpSidecar(config.performance.network)     ← NEW
  │     │
  │     ├── if config.performance.content.autoMinify.html:
  │     │     startHtmlMinifier(config.performance.content)     ← NEW
  │     │
  │     └── watchForChanges(resist.config.ts)
  │
  └── on SIGINT/SIGTERM: graceful shutdown all services
```

### 9.2 Companion Service Ports (defaults)

| Service | Port | Purpose |
|---------|------|---------|
| Image Transformer | 9013 | Image Resizing + Polish |
| HTML Minifier | 9014 | Auto Minify (HTML only) |
| GeoIP Sidecar | 9015 | MaxMind IP-to-country lookup |

Port assignments are contiguous starting from 9013. All are configurable and bound to `127.0.0.1` only.

### 9.3 Dependencies to Add

```json
{
  "dependencies": {
    "sharp": "^0.33.0"
  },
  "optionalDependencies": {
    "maxmind": "^4.3.0"
  },
  "devDependencies": {
    "html-minifier-terser": "^7.2.0",
    "@types/html-minifier-terser": "^7.0.0"
  }
}
```

### 9.4 Static Assets Directory

The edge tool serves internal assets at `/.edge/*`. Caddy is configured to handle these:

```caddyfile
# Edge simulation internal endpoints
handle /.edge/* {
	root * {edge_assets_dir}
	file_server
	header Cache-Control "no-cache"
}
```

Files served:
- `/.edge/rocket-loader.js` — Rocket Loader simulation stub
- `/.edge/mirage.js` — Mirage simulation stub
- `/.edge/speculation-rules.json` — Speed Brain rules

---

## 10. Pulumi Mapping

### File: `packages/shared/utils/cli/src/tools/edge/utils/pulumi-performance.ts`

Maps the performance config to Cloudflare zone settings via Pulumi.

```typescript
/**
 * Generates Pulumi Cloudflare zone settings for performance configuration.
 *
 * @param perf - Validated performance configuration.
 * @returns Pulumi zone settings object.
 */
function generatePulumiPerformanceSettings(
  perf: PerformanceConfig,
): Result<Record<Str, unknown>> {
  const settings: Record<Str, unknown> = {};

  // --- Protocol ---
  settings.http2 = perf.protocol.http2 ? 'on' : 'off';
  settings.http3 = perf.protocol.http3 ? 'on' : 'off';
  settings['0rtt'] = perf.protocol.zeroRtt ? 'on' : 'off';
  settings.h2_prioritization = perf.protocol.enhancedH2Prioritization ? 'on' : 'off';
  settings.origin_h2_max_streams = perf.protocol.http2ToOrigin
    ? perf.protocol.originH2MaxStreams
    : 0;

  // --- Content ---
  settings.early_hints = perf.content.earlyHints ? 'on' : 'off';
  settings.rocket_loader = perf.content.rocketLoader ? 'on' : 'off';
  settings.speed_brain = perf.content.speedBrain.enabled ? 'on' : 'off';
  settings.prefetch_preload = perf.content.prefetchUrls ? 'on' : 'off';
  settings.mirage = perf.content.mirage ? 'on' : 'off';
  settings.minify = {
    html: perf.content.autoMinify.html ? 'on' : 'off',
    css: perf.content.autoMinify.css ? 'on' : 'off',
    js: perf.content.autoMinify.js ? 'on' : 'off',
  };

  // --- Images ---
  settings.polish = perf.images.polish.mode;
  settings.webp = perf.images.polish.webp ? 'on' : 'off';

  // --- Network ---
  settings.websockets = perf.network.websockets ? 'on' : 'off';
  settings.ip_geolocation = perf.network.ipGeolocation ? 'on' : 'off';
  settings.ipv6 = perf.network.ipv6 ? 'on' : 'off';
  settings.response_buffering = perf.network.responseBuffering ? 'on' : 'off';

  // Note: gRPC, max upload size, and compression are handled differently in CF:
  // - gRPC: zone setting toggle
  // - Max upload: plan-based, not configurable
  // - Compression: Compression Rules (separate ruleset, not zone setting)

  return okUnchecked(settings);
}
```

**Pulumi resource example (generated):**

```typescript
// Generated by: pnpm tool edge --pulumi
import * as cloudflare from '@pulumi/cloudflare';

const zoneSettings = new cloudflare.ZoneSettingsOverride('performance', {
  zoneId: config.zoneId,
  settings: {
    http2: 'on',
    http3: 'on',
    zeroRtt: 'on',
    h2Prioritization: 'on',
    originH2MaxStreams: 200,
    earlyHints: 'on',
    rocketLoader: 'off',
    speedBrain: 'on',
    minify: { html: 'on', css: 'off', js: 'off' },
    polish: 'lossy',
    webp: 'on',
    mirage: 'off',
    websockets: 'on',
    ipGeolocation: 'on',
    ipv6: 'off',
    responseBuffering: 'off',
  },
});
```

---

## 11. Master Generator — Composing All Performance Directives

### File: `packages/shared/utils/cli/src/tools/edge/utils/performance.ts`

```typescript
/**
 * Performance directive generator.
 *
 * Composes all performance-related Caddy directives from the
 * validated PerformanceConfig. Called by the main edge tool's
 * `generateEdgeCaddyDirectives()`.
 *
 * @module
 */

import { safeParse } from '@/utils/result/safe';
import { PerformanceConfigSchema } from '@/schemas/core-config/edge-performance';
import type { PerformanceConfig } from '@/schemas/core-config/edge-performance';

/**
 * Generates all performance-related Caddy directives.
 *
 * @param perf - Validated performance configuration.
 * @returns Object with `globalOptions` (for Caddy global block) and
 *          `siteDirectives` (for each site block).
 */
function generatePerformanceDirectives(
  perf: PerformanceConfig,
): Result<{ globalOptions: Str; siteDirectives: Str }> {
  // --- Global options (protocol) ---
  const protocolResult = generateProtocolOptions(perf.protocol);
  if (!protocolResult.ok) return protocolResult;

  // --- Site-level directives ---
  const sections: Array<Str> = [];

  // Compression
  const compResult = generateCompressionDirectives(perf.compression);
  if (!compResult.ok) return compResult;
  if (compResult.data) sections.push(compResult.data);

  // Content optimization
  const earlyHintsResult = generateEarlyHintsDirectives(perf.content);
  if (!earlyHintsResult.ok) return earlyHintsResult;
  if (earlyHintsResult.data) sections.push(earlyHintsResult.data);

  const rocketResult = generateRocketLoaderDirectives(perf.content);
  if (!rocketResult.ok) return rocketResult;
  if (rocketResult.data) sections.push(rocketResult.data);

  const minifyResult = generateAutoMinifyDirectives(perf.content.autoMinify);
  if (!minifyResult.ok) return minifyResult;
  if (minifyResult.data) sections.push(minifyResult.data);

  const speedBrainResult = generateSpeedBrainDirectives(perf.content.speedBrain);
  if (!speedBrainResult.ok) return speedBrainResult;
  if (speedBrainResult.data) sections.push(speedBrainResult.data);

  const mirageResult = generateMirageDirectives(perf.content.mirage);
  if (!mirageResult.ok) return mirageResult;
  if (mirageResult.data) sections.push(mirageResult.data);

  // 0-RTT header injection
  const zeroRttResult = generateZeroRttDirective(perf.protocol.zeroRtt);
  if (!zeroRttResult.ok) return zeroRttResult;
  if (zeroRttResult.data) sections.push(zeroRttResult.data);

  // Image optimization
  const imageResult = generateImageDirectives(perf.images);
  if (!imageResult.ok) return imageResult;
  if (imageResult.data) sections.push(imageResult.data);

  // Network
  const networkResult = generateNetworkDirectives(perf.network);
  if (!networkResult.ok) return networkResult;
  if (networkResult.data) sections.push(networkResult.data);

  return okUnchecked({
    globalOptions: protocolResult.data,
    siteDirectives: sections.join('\n\n') as Str,
  });
}
```

---

## 12. Complete Caddyfile Example

With all performance features enabled:

```caddyfile
{
	experimental_http3
	servers {
		protocols h1 h2 h3
	}
}

myapp.localhost {
	tls /path/to/cert.pem /path/to/key.pem

	# Edge simulation internal endpoints
	handle /.edge/* {
		root * /path/to/edge-assets
		file_server
		header Cache-Control "no-cache"
	}

	# Serve speculation rules JSON
	handle /.edge/speculation-rules.json {
		header Content-Type "application/speculationrules+json"
		respond `{"prefetch":[{"source":"document","where":{"and":[{"href_matches":"/*","relative_to":"document"}]},"eagerness":"conservative"}]}`
	}

	# Compression
	encode {
		zstd
		br 4
		gzip 5
		minimum_length 50
	}

	# Early Hints (Link preload headers)
	header +Link "</assets/main.css>; rel=preload; as=style"
	header +Link "</assets/app.js>; rel=preload; as=script"

	# Speed Brain (Speculation Rules API)
	header Speculation-Rules "/.edge/speculation-rules.json"

	# Rocket Loader simulation
	# (replace_filter applied to HTML responses)

	# Mirage (lazy image loading simulation)
	# (replace_filter applied to HTML responses)

	# 0-RTT simulation (inject Early-Data header on safe methods)
	@earlyDataMethods {
		method GET HEAD OPTIONS
	}
	header_up @earlyDataMethods Early-Data 1

	# Image Resizing: route /cdn-cgi/image/* to sharp service
	handle /cdn-cgi/image/* {
		reverse_proxy localhost:9013
	}

	# Polish: lossy mode + WebP
	# (image responses routed through sharp for compression)

	# IP Geolocation: inject CF-IPCountry header
	header_up CF-IPCountry "US"
	header_up CF-Connecting-IP {remote_host}

	# Max upload size: 100MB
	request_body {
		max_size 100MB
	}

	# WebSockets: enabled (Caddy default behavior)

	# Reverse proxy to origin
	reverse_proxy localhost:5173 {
		transport http {
			versions h2c 2
		}
	}
}
```

---

## 13. Verification Steps

### 13.1 Schema Validation

```typescript
import { safeParse } from '@/utils/result/safe';
import { PerformanceConfigSchema } from '@/schemas/core-config/edge-performance';

// Test 1: Defaults — all optional fields get their defaults
const defaultResult = safeParse(PerformanceConfigSchema, {});
assert(defaultResult.ok === true);
assert(defaultResult.data.protocol.http2 === true);
assert(defaultResult.data.protocol.http3 === false);
assert(defaultResult.data.compression.brotli === true);
assert(defaultResult.data.network.websockets === true);

// Test 2: Full config — all fields specified
const fullResult = safeParse(PerformanceConfigSchema, {
  protocol: {
    http2: true,
    http3: true,
    zeroRtt: true,
    enhancedH2Prioritization: true,
    http2ToOrigin: true,
    originH2MaxStreams: 100,
  },
  content: {
    earlyHints: true,
    earlyHintLinks: [{ href: '/app.css', as: 'style' }],
    rocketLoader: true,
    autoMinify: { html: true, css: true, js: true },
    speedBrain: { enabled: true, eagerness: 'moderate', hrefMatches: '/*' },
    prefetchUrls: true,
    prefetchManifestUrl: '/manifest.txt',
    mirage: true,
  },
  compression: {
    brotli: true,
    brotliQuality: 6,
    gzip: true,
    gzipLevel: 7,
    zstd: true,
    preferenceOrder: ['br', 'zstd', 'gzip'],
    minimumLength: 100,
  },
  images: {
    resizing: {
      enabled: true,
      port: 9013,
      defaultQuality: 80,
      defaultFormat: 'auto',
      maxDimension: 8192,
      maxInputSize: 52428800,
      avifEnabled: true,
      faceDetection: false,
    },
    polish: { mode: 'lossy', webp: true, lossyQuality: 80 },
  },
  network: {
    websockets: true,
    grpc: true,
    ipGeolocation: true,
    defaultCountry: 'DE',
    geoLite2DbPath: '.resist/geo/GeoLite2-Country.mmdb',
    ipv6: true,
    maxUploadSizeMb: 200,
    responseBuffering: false,
    flushIntervalMs: 50,
  },
});
assert(fullResult.ok === true);

// Test 3: Invalid values rejected
const invalidResult = safeParse(PerformanceConfigSchema, {
  compression: { brotliQuality: 15 }, // max is 11
});
assert(invalidResult.ok === false);
```

### 13.2 Caddy Generation

```bash
# Generate Caddyfile and verify directives
pnpm tool edge --dry-run 2>&1 | grep -E "encode|header|reverse_proxy|request_body|protocols"
```

Expected output includes:
- `experimental_http3` in global block
- `protocols h1 h2 h3` in server block
- `encode { zstd / br 4 / gzip 5 / minimum_length 50 }` in site block
- `header +Link` entries for Early Hints
- `header Speculation-Rules` for Speed Brain
- `reverse_proxy localhost:9013` for image resizing
- `request_body { max_size 100MB }` for upload limit
- `header_up CF-IPCountry "US"` for geolocation

### 13.3 Image Transformer

```bash
# Start edge tool with image resizing enabled
pnpm tool edge &

# Test image resize
curl -o /dev/null -w "%{http_code}" \
  "https://myapp.localhost/cdn-cgi/image/width=200,quality=80,format=webp/uploads/test.jpg"
# Expected: 200

# Test Polish (via direct sharp service)
curl -H "X-Polish-Mode: lossy" -H "X-Polish-WebP: 1" \
  --data-binary @test.jpg \
  "http://localhost:9013/polish"
# Expected: 200 with smaller image

# Test format negotiation
curl -H "Accept: image/avif,image/webp,*/*" \
  "https://myapp.localhost/cdn-cgi/image/width=100,format=auto/uploads/test.jpg" \
  -o /dev/null -D - 2>/dev/null | grep Content-Type
# Expected: Content-Type: image/avif
```

### 13.4 Pulumi Output

```bash
# Generate Pulumi settings and verify
pnpm tool edge --pulumi 2>&1 | grep -E "http2|http3|polish|websockets"
```

Expected: valid Pulumi TypeScript with correct CF API field names and values.

---

## 14. Dependencies

| Dependency | Description | When needed |
|------------|-------------|-------------|
| Plan `00-foundation.md` | EdgeConfigSchema root, `.resist/` dirs, custom Caddy build | Always |
| `sharp` npm package | Image Resizing + Polish | `images.resizing.enabled` or `images.polish.mode !== 'off'` |
| `maxmind` npm package | GeoIP lookups | `network.geoLite2DbPath` set |
| `html-minifier-terser` | HTML minification | `content.autoMinify.html` |
| Caddy `replace_filter` module | Response body rewriting (Rocket Loader, Mirage) | `content.rocketLoader` or `content.mirage` |

---

## 15. Implementation Order

1. **Schema** — Create `edge-performance.ts` with all schemas from section 2
2. **Compression** — `encode` directive generator (simplest, high-value)
3. **Protocol** — Global options generator for HTTP/2/3/0-RTT
4. **Network** — Request body, geolocation, WebSocket, gRPC directives
5. **Early Hints** — `Link` header injection
6. **Speed Brain** — Speculation Rules header + JSON endpoint
7. **Rocket Loader** — Response body filter + stub JS
8. **Mirage** — Response body filter + stub JS
9. **Auto Minify** — HTML minifier sidecar (optional, lowest priority)
10. **Image Transformer** — Sharp service (most complex)
11. **Polish** — Extend sharp service with Polish mode
12. **GeoIP Sidecar** — MaxMind integration (optional)
13. **Pulumi mapping** — Zone settings generator
14. **Master generator** — Compose all sections
15. **Tests** — Schema validation, Caddy output, image transform, Polish
16. **Integration** — Wire into `generateEdgeCaddyDirectives()` + service lifecycle

---

## 16. File Summary

| File | Purpose |
|------|---------|
| `packages/shared/schemas/core-config/src/edge-performance.ts` | Valibot schemas for all performance settings |
| `packages/shared/utils/cli/src/tools/edge/utils/performance.ts` | Master performance directive generator |
| `packages/shared/utils/cli/src/tools/edge/utils/performance-protocol.ts` | Protocol Caddy options |
| `packages/shared/utils/cli/src/tools/edge/utils/performance-compression.ts` | Compression `encode` directives |
| `packages/shared/utils/cli/src/tools/edge/utils/performance-content.ts` | Content optimization directives |
| `packages/shared/utils/cli/src/tools/edge/utils/performance-network.ts` | Network setting directives |
| `packages/shared/utils/cli/src/tools/edge/utils/performance-images.ts` | Image resizing Caddy routing |
| `packages/shared/utils/cli/src/tools/edge/services/image-transformer.ts` | Sharp-based image HTTP service |
| `packages/shared/utils/cli/src/tools/edge/services/geo-ip.ts` | MaxMind GeoLite2 lookup service |
| `packages/shared/utils/cli/src/tools/edge/services/html-minifier.ts` | HTML minification sidecar |
| `packages/shared/utils/cli/src/tools/edge/assets/rocket-loader.js` | Rocket Loader client stub |
| `packages/shared/utils/cli/src/tools/edge/assets/mirage.js` | Mirage client stub |
| `packages/shared/utils/cli/src/tools/edge/utils/pulumi-performance.ts` | Pulumi zone settings generator |
