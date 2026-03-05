/**
 * RFC 9116 security.txt route.
 *
 * Provides security contact information at `/.well-known/security.txt`.
 * Expires field is set to 1 year from build time per RFC 9116 recommendations.
 * Prerendered at build time by adapter-static.
 *
 * Preferred-Languages is derived dynamically from {@link SUPPORTED_LOCALES}
 * to stay in sync when locales are added or removed.
 *
 * @see https://www.rfc-editor.org/rfc/rfc9116
 * @module
 */

import * as v from 'valibot';
import type { Str } from '@/schemas/common';
import type { RequestHandler } from './$types';
import { SUPPORTED_LOCALES } from '$lib/schemas/editor-state';
import {
	SECURITY_CANONICAL_URL,
	SECURITY_CONTACT_URL,
	SECURITY_POLICY_URL,
} from '$lib/config/app-meta';

export const prerender = true;

/** Schema for the security.txt fields. */
const SecurityTxtFieldsSchema = v.strictObject({
	contact: v.string(),
	expires: v.string(),
	preferredLanguages: v.string(),
	canonical: v.string(),
	policy: v.string(),
});

/**
 * Returns an ISO 8601 date 1 year from now, used as the `Expires` value per RFC 9116.
 *
 * @returns ISO 8601 date string (e.g. `'2027-03-05T00:00:00.000Z'`)
 */
function getExpiresDate(): Str {
	const expires: Date = new Date();
	expires.setFullYear(expires.getFullYear() + 1);
	return expires.toISOString();
}

/**
 * Generates the RFC 9116 security.txt response.
 *
 * Assembles contact, expiry, preferred languages, canonical URL, and policy
 * from app-meta constants and supported locales.
 *
 * @returns Plain text response with proper cache headers
 */
export const GET: RequestHandler = () => {
	const fields: v.InferOutput<typeof SecurityTxtFieldsSchema> = {
		contact: SECURITY_CONTACT_URL,
		expires: getExpiresDate(),
		preferredLanguages: SUPPORTED_LOCALES.join(', '),
		canonical: SECURITY_CANONICAL_URL,
		policy: SECURITY_POLICY_URL,
	};

	const body: Str = [
		`Contact: ${fields.contact}`,
		`Expires: ${fields.expires}`,
		`Preferred-Languages: ${fields.preferredLanguages}`,
		`Canonical: ${fields.canonical}`,
		`Policy: ${fields.policy}`,
		'',
	].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=86400',
		},
	});
};
