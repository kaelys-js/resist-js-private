/**
 * RFC 9116 security.txt route.
 *
 * Provides security contact information at /.well-known/security.txt.
 * Expires field is set to 1 year from build time. Prerendered at build time.
 */

import type { RequestHandler } from './$types';
import {
	SECURITY_CANONICAL_URL,
	SECURITY_CONTACT_URL,
	SECURITY_POLICY_URL,
	SECURITY_PREFERRED_LANGUAGES,
} from '$lib/config/app-meta';

export const prerender = true;

/**
 * ISO 8601 date 1 year from now, used as Expires value per RFC 9116.
 *
 * @returns ISO 8601 date string
 */
function getExpiresDate(): string {
	const expires = new Date();
	expires.setFullYear(expires.getFullYear() + 1);
	return expires.toISOString();
}

export const GET: RequestHandler = () => {
	const body = [
		`Contact: ${SECURITY_CONTACT_URL}`,
		`Expires: ${getExpiresDate()}`,
		`Preferred-Languages: ${SECURITY_PREFERRED_LANGUAGES}`,
		`Canonical: ${SECURITY_CANONICAL_URL}`,
		`Policy: ${SECURITY_POLICY_URL}`,
		'',
	].join('\n');

	return new Response(body, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
