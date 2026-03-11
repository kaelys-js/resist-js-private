# 14 — Media: Stream, Images, Fonts, WebRTC/RealtimeKit

## Context

Cloudflare provides several media services: Stream (video), Images (image storage + transforms), Fonts (Google Fonts proxy), and RealtimeKit/TURN (WebRTC infrastructure). Locally, we simulate these using local storage + sharp for image processing + Caddy file serving.

---

## Documentation Links

- Cloudflare Stream: https://developers.cloudflare.com/stream/
- Cloudflare Images: https://developers.cloudflare.com/images/
- Cloudflare Image Resizing: https://developers.cloudflare.com/images/transform-images/
- Cloudflare Fonts: https://developers.cloudflare.com/speed/optimization/content/fonts/
- Cloudflare Calls (RealtimeKit): https://developers.cloudflare.com/calls/
- Caddy file_server: https://caddyserver.com/docs/caddyfile/directives/file_server

---

## 1. Valibot Schema: `MediaConfigSchema`

### File: `packages/shared/schemas/core-config/src/edge-media.ts`

```typescript
import * as v from 'valibot';

/** Image transform format. */
export const ImageFormatSchema = v.picklist(['webp', 'avif', 'jpeg', 'png', 'auto']);
export type ImageFormat = v.InferOutput<typeof ImageFormatSchema>;

/** Image Resizing / Polish configuration. */
export const ImageResizingConfigSchema = v.strictObject({
	enabled: v.optional(v.boolean(), false),
	/** Port for local sharp-based image transformer. Default: `9013`. */
	servicePort: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(65535)), 9013),
	/** Maximum width for resized images. Default: `4096`. */
	maxWidth: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 4096),
	/** Maximum height for resized images. Default: `4096`. */
	maxHeight: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 4096),
	/** Polish mode for automatic optimization. Default: `'off'`. */
	polish: v.optional(v.picklist(['off', 'lossless', 'lossy']), 'off'),
	/** Default output format. Default: `'auto'`. */
	defaultFormat: v.optional(ImageFormatSchema, 'auto'),
	/** Image quality (1-100) for lossy formats. Default: `85`. */
	quality: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)), 85),
});
export type ImageResizingConfig = v.InferOutput<typeof ImageResizingConfigSchema>;

/** Cloudflare Images (storage + transform) configuration. */
export const CloudflareImagesConfigSchema = v.strictObject({
	enabled: v.optional(v.boolean(), false),
	/** Local storage directory. Default: `'.resist/images/'`. */
	storageDir: v.optional(v.pipe(v.string(), v.minLength(1)), '.resist/images/'),
});
export type CloudflareImagesConfig = v.InferOutput<typeof CloudflareImagesConfigSchema>;

/** Cloudflare Stream configuration. */
export const StreamConfigSchema = v.strictObject({
	enabled: v.optional(v.boolean(), false),
	/** Local storage directory. Default: `'.resist/stream/'`. */
	storageDir: v.optional(v.pipe(v.string(), v.minLength(1)), '.resist/stream/'),
});
export type StreamConfig = v.InferOutput<typeof StreamConfigSchema>;

/** Font optimization configuration. */
export const FontConfigSchema = v.strictObject({
	/** Whether to proxy and cache Google Fonts locally. Default: `false`. */
	enabled: v.optional(v.boolean(), false),
	/** Local cache directory. Default: `'.resist/fonts/'`. */
	cacheDir: v.optional(v.pipe(v.string(), v.minLength(1)), '.resist/fonts/'),
});
export type FontConfig = v.InferOutput<typeof FontConfigSchema>;

/** WebRTC / RealtimeKit configuration. */
export const WebRtcConfigSchema = v.strictObject({
	enabled: v.optional(v.boolean(), false),
	/** Use local STUN only (no TURN). Default: `true`. */
	stunOnly: v.optional(v.boolean(), true),
	/** TURN server (coturn) port. Default: `3478`. */
	turnPort: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(65535)), 3478),
});
export type WebRtcConfig = v.InferOutput<typeof WebRtcConfigSchema>;

/** Complete Media configuration. */
export const MediaConfigSchema = v.strictObject({
	imageResizing: v.optional(ImageResizingConfigSchema, {}),
	images: v.optional(CloudflareImagesConfigSchema, {}),
	stream: v.optional(StreamConfigSchema, {}),
	fonts: v.optional(FontConfigSchema, {}),
	webRtc: v.optional(WebRtcConfigSchema, {}),
});
export type MediaConfig = v.InferOutput<typeof MediaConfigSchema>;
```

---

## 2. Caddy Directive Generation

### File: `packages/shared/utils/cli/src/tools/edge/utils/media.ts`

```typescript
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/utils/result/types';
import { ok } from '@/utils/result/helpers';
import { MediaConfigSchema } from '@/schemas/core-config/src/edge-media';
import type { MediaConfig } from '@/schemas/core-config/src/edge-media';

/**
 * Generate Image Resizing Caddy directives.
 *
 * Routes `/cdn-cgi/image/{options}/{path}` to local sharp service.
 */
export function generateImageResizingDirectives(
	port: v.InferOutput<typeof v.number>,
): ReadonlyArray<v.InferOutput<typeof v.string>> {
	return [
		'# Image Resizing (CF /cdn-cgi/image/ format)',
		'handle /cdn-cgi/image/* {',
		`	reverse_proxy localhost:${String(port)}`,
		'}',
		'',
	];
}

/** Generate Cloudflare Images local storage directives. */
export function generateImagesDirectives(
	storageDir: v.InferOutput<typeof v.string>,
): ReadonlyArray<v.InferOutput<typeof v.string>> {
	return [
		'# Cloudflare Images (local storage)',
		'handle /cdn-cgi/imagedelivery/* {',
		`	root * ${storageDir}`,
		'	file_server',
		'}',
		'',
	];
}

/** Generate Stream video serving directives. */
export function generateStreamDirectives(
	storageDir: v.InferOutput<typeof v.string>,
): ReadonlyArray<v.InferOutput<typeof v.string>> {
	return [
		'# Cloudflare Stream (local video serving)',
		'handle /cdn-cgi/stream/* {',
		`	root * ${storageDir}`,
		'	file_server',
		'}',
		'',
	];
}

/** Generate Font proxy/cache directives. */
export function generateFontDirectives(): ReadonlyArray<v.InferOutput<typeof v.string>> {
	return [
		'# Cloudflare Fonts (Google Fonts proxy)',
		'handle /cdn-cgi/fonts/* {',
		'	reverse_proxy https://fonts.googleapis.com {',
		'		header_up Host "fonts.googleapis.com"',
		'	}',
		'}',
		'',
	];
}

/** Generate complete Media Caddyfile directives. */
export function generateMediaDirectives(
	config: MediaConfig,
): Result<v.InferOutput<typeof v.string>> {
	const configResult = safeParse(MediaConfigSchema, config);
	if (!configResult.ok) return configResult;
	const validConfig = configResult.data;

	const sections: Array<string> = [
		'# ==========================================================',
		'# Media Services',
		'# ==========================================================',
		'',
	];

	if (validConfig.imageResizing?.enabled) {
		sections.push(...generateImageResizingDirectives(validConfig.imageResizing.servicePort ?? 9013));
	}

	if (validConfig.images?.enabled) {
		sections.push(...generateImagesDirectives(validConfig.images.storageDir ?? '.resist/images/'));
	}

	if (validConfig.stream?.enabled) {
		sections.push(...generateStreamDirectives(validConfig.stream.storageDir ?? '.resist/stream/'));
	}

	if (validConfig.fonts?.enabled) {
		sections.push(...generateFontDirectives());
	}

	return ok(sections.join('\n'));
}

/** Get companion services for media features. */
export function getMediaServices(
	config: MediaConfig,
): ReadonlyArray<{ name: string; command: string; port: number }> {
	const services: Array<{ name: string; command: string; port: number }> = [];

	if (config.imageResizing?.enabled) {
		services.push({
			name: 'image-transformer',
			command: `node .resist/services/image-transformer.js --port=${String(config.imageResizing.servicePort ?? 9013)}`,
			port: config.imageResizing.servicePort ?? 9013,
		});
	}

	return services;
}
```

---

## 3. Verification Steps

```bash
pnpm tool edge &
sleep 3

# Test 1: Image resize via CF URL format
curl -s -o /dev/null -w "%{http_code}" "https://localhost:3000/cdn-cgi/image/width=300,format=webp/test.jpg"
# Expected: 200

# Test 2: Stream video serving
curl -s -o /dev/null -w "%{http_code}" "https://localhost:3000/cdn-cgi/stream/test-video.mp4"
# Expected: 200 (if file exists in .resist/stream/)

# Test 3: Font proxy
curl -s -D- "https://localhost:3000/cdn-cgi/fonts/css2?family=Inter" | grep "Content-Type"
# Expected: text/css
```

---

## 4. File Summary

| File | Purpose |
|------|---------|
| `packages/shared/schemas/core-config/src/edge-media.ts` | `MediaConfigSchema`, `ImageResizingConfigSchema`, `StreamConfigSchema`, `FontConfigSchema`, `WebRtcConfigSchema` |
| `packages/shared/utils/cli/src/tools/edge/utils/media.ts` | `generateMediaDirectives()`, `getMediaServices()` |

---

## 5. Dependencies

- **00-foundation.md** — `.resist/` directory, companion service lifecycle
- **08-performance.md** — Polish and image optimization settings shared

---

## 6. Implementation Order

1. Add image, stream, font, webRTC schemas
2. Add `MediaConfigSchema`
3. Create image transformer service (sharp-based HTTP server)
4. Create `media.ts` with Caddy directives
5. Hook into edge tool
6. Write tests
