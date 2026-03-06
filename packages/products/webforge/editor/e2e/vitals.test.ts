import { test, expect } from '@playwright/test';

/**
 * Builds a valid vitals beacon payload matching VitalsBeaconPayloadSchema.
 *
 * @returns JSON string of a valid payload
 */
function validPayload(): string {
	return JSON.stringify({
		sessionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
		url: '/scenes/1',
		timestamp: new Date().toISOString(),
		metrics: [
			{
				name: 'LCP',
				value: 2450,
				rating: 'needsImprovement',
				navigationType: 'navigate',
			},
		],
		device: {
			isLowEndDevice: false,
			isLowEndExperience: false,
			deviceMemory: 8,
			hardwareConcurrency: 4,
			effectiveType: '4g',
			saveData: false,
		},
	});
}

/**
 * Common headers for vitals beacon POST requests.
 * Includes origin to satisfy SvelteKit CSRF protection.
 */
const BEACON_HEADERS = {
	'content-type': 'text/plain',
	origin: 'http://127.0.0.1:4173',
};

// =============================================================================
// /api/vitals endpoint
// =============================================================================

test.describe('vitals API — POST /api/vitals', () => {
	test('valid payload returns 204', async ({ request }) => {
		const response = await request.post('/api/vitals', {
			data: validPayload(),
			headers: BEACON_HEADERS,
		});
		expect(response.status()).toBe(204);
	});

	test('empty body returns 400', async ({ request }) => {
		const response = await request.post('/api/vitals', {
			data: '',
			headers: BEACON_HEADERS,
		});
		expect(response.status()).toBe(400);
	});

	test('malformed JSON returns 400', async ({ request }) => {
		const response = await request.post('/api/vitals', {
			data: 'not-json{{{',
			headers: BEACON_HEADERS,
		});
		expect(response.status()).toBe(400);
	});

	test('schema-invalid payload returns 400', async ({ request }) => {
		const response = await request.post('/api/vitals', {
			data: JSON.stringify({ invalid: true }),
			headers: BEACON_HEADERS,
		});
		expect(response.status()).toBe(400);
	});

	test('oversized body (>64KB) returns 400', async ({ request }) => {
		const oversized: string = 'x'.repeat(70_000);
		const response = await request.post('/api/vitals', {
			data: oversized,
			headers: BEACON_HEADERS,
		});
		expect(response.status()).toBe(400);
	});

	test('valid payload with multiple metrics returns 204', async ({ request }) => {
		const payload: string = JSON.stringify({
			sessionId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
			url: '/',
			timestamp: new Date().toISOString(),
			metrics: [
				{ name: 'FCP', value: 800, rating: 'good', navigationType: 'navigate' },
				{ name: 'LCP', value: 1200, rating: 'good', navigationType: 'navigate' },
				{ name: 'CLS', value: 0.05, rating: 'good', navigationType: 'navigate' },
			],
			device: {
				isLowEndDevice: false,
				isLowEndExperience: false,
				deviceMemory: 4,
				hardwareConcurrency: 2,
				effectiveType: '3g',
				saveData: false,
			},
		});
		const response = await request.post('/api/vitals', {
			data: payload,
			headers: BEACON_HEADERS,
		});
		expect(response.status()).toBe(204);
	});

	test('empty metrics array returns 204', async ({ request }) => {
		const payload: string = JSON.stringify({
			sessionId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
			url: '/',
			timestamp: new Date().toISOString(),
			metrics: [],
			device: {
				isLowEndDevice: false,
				isLowEndExperience: false,
				deviceMemory: 8,
				hardwareConcurrency: 8,
				effectiveType: '4g',
				saveData: false,
			},
		});
		const response = await request.post('/api/vitals', {
			data: payload,
			headers: BEACON_HEADERS,
		});
		expect(response.status()).toBe(204);
	});
});
