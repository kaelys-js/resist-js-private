/**
 * Tests for @/schemas/common shared schemas.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import * as v from 'valibot';

import {
	StrSchema,
	NumSchema,
	BoolSchema,
	NonNegativeIntegerSchema,
	PositiveIntegerSchema,
	NonNegativeNumberSchema,
	UnitIntervalSchema,
	PortSchema,
	ExitCodeSchema,
	NodeMajorVersionSchema,
	NameSchema,
	DescriptionSchema,
	TagSchema,
	SlugSchema,
	TitleSchema,
	SummarySchema,
	ContentSchema,
	SearchQuerySchema,
	CommentSchema,
	SemverSchema,
	KebabCaseIdSchema,
	ProductNameSchema,
	IsoTimestampSchema,
	DateOnlySchema,
	TimeOnlySchema,
	YearSchema,
	DurationSchema,
	CronExpressionSchema,
	TimezoneSchema,
	EmailSchema,
	UuidSchema,
	UrlStringSchema,
	HttpsUrlSchema,
	RelativeUrlSchema,
	HostnameSchema,
	Ipv4Schema,
	HexColorSchema,
	HttpStatusCodeSchema,
	MimeTypeSchema,
	Base64Schema,
	Sha256Schema,
	Md5Schema,
	JwtSchema,
	JsonStringSchema,
	RegexPatternSchema,
	FileExtensionSchema,
	PathSchema,
	FilenameSchema,
	CommandSchema,
	PasswordSchema,
	PhoneSchema,
	UsernameSchema,
	PriceSchema,
	QuantitySchema,
	PercentageSchema,
	DiscountPercentSchema,
	PaginationLimitSchema,
	PaginationOffsetSchema,
	SortDirectionSchema,
	FilterOperatorSchema,
	EventNameSchema,
	NpmPackageNameSchema,
	FeatureFlagSchema,
	ErrorCodeSchema,
	LogLevelSchema,
	HttpMethodSchema,
	PlatformSchema,
	DEFAULT_TERMINAL_WIDTH,
	DEFAULT_JSON_INDENT,
	DEFAULT_PROGRESS_BAR_WIDTH,
	DEFAULT_EXIT_CODE,
	FAILURE_EXIT_CODE,
} from '@/schemas/common';

// =============================================================================
// Primitive Schemas
// =============================================================================

describe('StrSchema', () => {
	it('accepts string', () => {
		expect(v.safeParse(StrSchema, 'hello').success).toBe(true);
	});

	it('accepts empty string', () => {
		expect(v.safeParse(StrSchema, '').success).toBe(true);
	});

	it('rejects number', () => {
		expect(v.safeParse(StrSchema, 42).success).toBe(false);
	});
});

describe('NumSchema', () => {
	it('accepts number', () => {
		expect(v.safeParse(NumSchema, 42).success).toBe(true);
	});

	it('rejects string', () => {
		expect(v.safeParse(NumSchema, '42').success).toBe(false);
	});
});

describe('BoolSchema', () => {
	it('accepts true', () => {
		expect(v.safeParse(BoolSchema, true).success).toBe(true);
	});

	it('accepts false', () => {
		expect(v.safeParse(BoolSchema, false).success).toBe(true);
	});

	it('rejects string', () => {
		expect(v.safeParse(BoolSchema, 'true').success).toBe(false);
	});
});

// =============================================================================
// Integer Schemas
// =============================================================================

describe('NonNegativeIntegerSchema', () => {
	it('accepts 0', () => {
		expect(v.safeParse(NonNegativeIntegerSchema, 0).success).toBe(true);
	});

	it('accepts positive integer', () => {
		expect(v.safeParse(NonNegativeIntegerSchema, 42).success).toBe(true);
	});

	it('rejects negative', () => {
		expect(v.safeParse(NonNegativeIntegerSchema, -1).success).toBe(false);
	});

	it('rejects float', () => {
		expect(v.safeParse(NonNegativeIntegerSchema, 1.5).success).toBe(false);
	});
});

describe('PositiveIntegerSchema', () => {
	it('accepts 1', () => {
		expect(v.safeParse(PositiveIntegerSchema, 1).success).toBe(true);
	});

	it('rejects 0', () => {
		expect(v.safeParse(PositiveIntegerSchema, 0).success).toBe(false);
	});

	it('rejects negative', () => {
		expect(v.safeParse(PositiveIntegerSchema, -1).success).toBe(false);
	});
});

describe('UnitIntervalSchema', () => {
	it('accepts 0', () => {
		expect(v.safeParse(UnitIntervalSchema, 0).success).toBe(true);
	});

	it('accepts 1', () => {
		expect(v.safeParse(UnitIntervalSchema, 1).success).toBe(true);
	});

	it('accepts 0.5', () => {
		expect(v.safeParse(UnitIntervalSchema, 0.5).success).toBe(true);
	});

	it('rejects -0.1', () => {
		expect(v.safeParse(UnitIntervalSchema, -0.1).success).toBe(false);
	});

	it('rejects 1.1', () => {
		expect(v.safeParse(UnitIntervalSchema, 1.1).success).toBe(false);
	});
});

describe('PortSchema', () => {
	it('accepts 80', () => {
		expect(v.safeParse(PortSchema, 80).success).toBe(true);
	});

	it('accepts 65535', () => {
		expect(v.safeParse(PortSchema, 65535).success).toBe(true);
	});

	it('rejects 0', () => {
		expect(v.safeParse(PortSchema, 0).success).toBe(false);
	});

	it('rejects 65536', () => {
		expect(v.safeParse(PortSchema, 65536).success).toBe(false);
	});
});

describe('ExitCodeSchema', () => {
	it('accepts 0', () => {
		expect(v.safeParse(ExitCodeSchema, 0).success).toBe(true);
	});

	it('accepts 255', () => {
		expect(v.safeParse(ExitCodeSchema, 255).success).toBe(true);
	});

	it('rejects -1', () => {
		expect(v.safeParse(ExitCodeSchema, -1).success).toBe(false);
	});

	it('rejects 256', () => {
		expect(v.safeParse(ExitCodeSchema, 256).success).toBe(false);
	});
});

// =============================================================================
// Name / Text Schemas
// =============================================================================

describe('NameSchema', () => {
	it('accepts non-empty name', () => {
		expect(v.safeParse(NameSchema, 'My App').success).toBe(true);
	});

	it('rejects empty string', () => {
		expect(v.safeParse(NameSchema, '').success).toBe(false);
	});

	it('rejects over 100 chars', () => {
		expect(v.safeParse(NameSchema, 'a'.repeat(101)).success).toBe(false);
	});
});

describe('DescriptionSchema', () => {
	it('accepts valid description', () => {
		expect(v.safeParse(DescriptionSchema, 'A short description').success).toBe(true);
	});

	it('rejects over 500 chars', () => {
		expect(v.safeParse(DescriptionSchema, 'a'.repeat(501)).success).toBe(false);
	});
});

describe('TagSchema', () => {
	it('accepts lowercase with hyphens', () => {
		expect(v.safeParse(TagSchema, 'my-tag').success).toBe(true);
	});

	it('rejects uppercase', () => {
		expect(v.safeParse(TagSchema, 'MyTag').success).toBe(false);
	});
});

describe('SlugSchema', () => {
	it('accepts lowercase with hyphens', () => {
		expect(v.safeParse(SlugSchema, 'my-slug').success).toBe(true);
	});

	it('rejects spaces', () => {
		expect(v.safeParse(SlugSchema, 'my slug').success).toBe(false);
	});
});

describe('TitleSchema', () => {
	it('accepts valid title', () => {
		expect(v.safeParse(TitleSchema, 'My Page Title').success).toBe(true);
	});

	it('rejects over 200 chars', () => {
		expect(v.safeParse(TitleSchema, 'a'.repeat(201)).success).toBe(false);
	});
});

describe('SearchQuerySchema', () => {
	it('accepts non-empty query', () => {
		expect(v.safeParse(SearchQuerySchema, 'search term').success).toBe(true);
	});

	it('rejects empty', () => {
		expect(v.safeParse(SearchQuerySchema, '').success).toBe(false);
	});
});

// =============================================================================
// Versioning
// =============================================================================

describe('SemverSchema', () => {
	it('accepts valid semver', () => {
		expect(v.safeParse(SemverSchema, '1.2.3').success).toBe(true);
	});

	it('rejects invalid', () => {
		expect(v.safeParse(SemverSchema, 'not-semver').success).toBe(false);
	});
});

describe('KebabCaseIdSchema', () => {
	it('accepts kebab-case', () => {
		expect(v.safeParse(KebabCaseIdSchema, 'my-component').success).toBe(true);
	});

	it('rejects camelCase', () => {
		expect(v.safeParse(KebabCaseIdSchema, 'myComponent').success).toBe(false);
	});
});

// =============================================================================
// Date/Time
// =============================================================================

describe('IsoTimestampSchema', () => {
	it('accepts ISO timestamp', () => {
		expect(v.safeParse(IsoTimestampSchema, '2024-01-15T10:30:00Z').success).toBe(true);
	});

	it('rejects invalid date', () => {
		expect(v.safeParse(IsoTimestampSchema, 'not-a-date').success).toBe(false);
	});
});

describe('DateOnlySchema', () => {
	it('accepts YYYY-MM-DD', () => {
		expect(v.safeParse(DateOnlySchema, '2024-01-15').success).toBe(true);
	});

	it('rejects invalid format', () => {
		expect(v.safeParse(DateOnlySchema, '01-15-2024').success).toBe(false);
	});
});

describe('YearSchema', () => {
	it('accepts valid year', () => {
		expect(v.safeParse(YearSchema, 2024).success).toBe(true);
	});

	it('rejects below 1900', () => {
		expect(v.safeParse(YearSchema, 1899).success).toBe(false);
	});
});

describe('DurationSchema', () => {
	it('accepts 15m', () => {
		expect(v.safeParse(DurationSchema, '15m').success).toBe(true);
	});

	it('accepts 7d', () => {
		expect(v.safeParse(DurationSchema, '7d').success).toBe(true);
	});

	it('rejects invalid', () => {
		expect(v.safeParse(DurationSchema, 'forever').success).toBe(false);
	});
});

// =============================================================================
// Validation Schemas (with v.check callbacks)
// =============================================================================

describe('TimezoneSchema', () => {
	it('accepts valid timezone', () => {
		expect(v.safeParse(TimezoneSchema, 'America/New_York').success).toBe(true);
	});

	it('accepts UTC', () => {
		expect(v.safeParse(TimezoneSchema, 'UTC').success).toBe(true);
	});

	it('rejects invalid timezone', () => {
		expect(v.safeParse(TimezoneSchema, 'Not/A/Timezone').success).toBe(false);
	});
});

describe('JsonStringSchema', () => {
	it('accepts valid JSON object', () => {
		expect(v.safeParse(JsonStringSchema, '{"key":"value"}').success).toBe(true);
	});

	it('accepts valid JSON array', () => {
		expect(v.safeParse(JsonStringSchema, '[1,2,3]').success).toBe(true);
	});

	it('rejects invalid JSON', () => {
		expect(v.safeParse(JsonStringSchema, '{invalid}').success).toBe(false);
	});
});

describe('RegexPatternSchema', () => {
	it('accepts valid regex', () => {
		expect(v.safeParse(RegexPatternSchema, '^[a-z]+$').success).toBe(true);
	});

	it('rejects invalid regex', () => {
		expect(v.safeParse(RegexPatternSchema, '[invalid').success).toBe(false);
	});
});

// =============================================================================
// Network / URL
// =============================================================================

describe('EmailSchema', () => {
	it('accepts valid email', () => {
		expect(v.safeParse(EmailSchema, 'user@example.com').success).toBe(true);
	});

	it('rejects invalid', () => {
		expect(v.safeParse(EmailSchema, 'not-an-email').success).toBe(false);
	});
});

describe('UuidSchema', () => {
	it('accepts valid UUID', () => {
		expect(v.safeParse(UuidSchema, '550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
	});

	it('rejects invalid', () => {
		expect(v.safeParse(UuidSchema, 'not-a-uuid').success).toBe(false);
	});
});

describe('UrlStringSchema', () => {
	it('accepts valid URL', () => {
		expect(v.safeParse(UrlStringSchema, 'https://example.com').success).toBe(true);
	});

	it('rejects invalid', () => {
		expect(v.safeParse(UrlStringSchema, 'not-a-url').success).toBe(false);
	});
});

describe('HostnameSchema', () => {
	it('accepts valid hostname', () => {
		expect(v.safeParse(HostnameSchema, 'example.com').success).toBe(true);
	});

	it('rejects empty', () => {
		expect(v.safeParse(HostnameSchema, '').success).toBe(false);
	});
});

describe('HttpStatusCodeSchema', () => {
	it('accepts 200', () => {
		expect(v.safeParse(HttpStatusCodeSchema, 200).success).toBe(true);
	});

	it('accepts 404', () => {
		expect(v.safeParse(HttpStatusCodeSchema, 404).success).toBe(true);
	});

	it('rejects 99', () => {
		expect(v.safeParse(HttpStatusCodeSchema, 99).success).toBe(false);
	});

	it('rejects 600', () => {
		expect(v.safeParse(HttpStatusCodeSchema, 600).success).toBe(false);
	});
});

// =============================================================================
// Security / Auth
// =============================================================================

describe('PasswordSchema', () => {
	it('accepts 8+ chars', () => {
		expect(v.safeParse(PasswordSchema, 'password123').success).toBe(true);
	});

	it('rejects short', () => {
		expect(v.safeParse(PasswordSchema, 'short').success).toBe(false);
	});
});

describe('JwtSchema', () => {
	it('accepts valid JWT format', () => {
		expect(v.safeParse(JwtSchema, 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123').success).toBe(true);
	});

	it('rejects invalid', () => {
		expect(v.safeParse(JwtSchema, 'not.a.jwt!').success).toBe(false);
	});
});

describe('Sha256Schema', () => {
	it('accepts 64-char hex', () => {
		expect(v.safeParse(Sha256Schema, 'a'.repeat(64)).success).toBe(true);
	});

	it('rejects wrong length', () => {
		expect(v.safeParse(Sha256Schema, 'a'.repeat(63)).success).toBe(false);
	});
});

describe('Base64Schema', () => {
	it('accepts valid base64', () => {
		expect(v.safeParse(Base64Schema, 'SGVsbG8gV29ybGQ=').success).toBe(true);
	});

	it('rejects invalid chars', () => {
		expect(v.safeParse(Base64Schema, 'not base64!!').success).toBe(false);
	});
});

// =============================================================================
// File System
// =============================================================================

describe('PathSchema', () => {
	it('accepts non-empty path', () => {
		expect(v.safeParse(PathSchema, '/usr/local/bin').success).toBe(true);
	});

	it('rejects empty', () => {
		expect(v.safeParse(PathSchema, '').success).toBe(false);
	});
});

describe('FileExtensionSchema', () => {
	it('accepts .ts', () => {
		expect(v.safeParse(FileExtensionSchema, '.ts').success).toBe(true);
	});

	it('rejects without dot', () => {
		expect(v.safeParse(FileExtensionSchema, 'ts').success).toBe(false);
	});
});

// =============================================================================
// Commerce
// =============================================================================

describe('PriceSchema', () => {
	it('accepts 0', () => {
		expect(v.safeParse(PriceSchema, 0).success).toBe(true);
	});

	it('accepts 9.99', () => {
		expect(v.safeParse(PriceSchema, 9.99).success).toBe(true);
	});

	it('rejects negative', () => {
		expect(v.safeParse(PriceSchema, -1).success).toBe(false);
	});
});

describe('PercentageSchema', () => {
	it('accepts 0', () => {
		expect(v.safeParse(PercentageSchema, 0).success).toBe(true);
	});

	it('accepts 100', () => {
		expect(v.safeParse(PercentageSchema, 100).success).toBe(true);
	});

	it('rejects 101', () => {
		expect(v.safeParse(PercentageSchema, 101).success).toBe(false);
	});
});

// =============================================================================
// API / Pagination
// =============================================================================

describe('PaginationLimitSchema', () => {
	it('accepts 1', () => {
		expect(v.safeParse(PaginationLimitSchema, 1).success).toBe(true);
	});

	it('accepts 100', () => {
		expect(v.safeParse(PaginationLimitSchema, 100).success).toBe(true);
	});

	it('rejects 0', () => {
		expect(v.safeParse(PaginationLimitSchema, 0).success).toBe(false);
	});

	it('rejects 101', () => {
		expect(v.safeParse(PaginationLimitSchema, 101).success).toBe(false);
	});
});

describe('SortDirectionSchema', () => {
	it('accepts asc', () => {
		expect(v.safeParse(SortDirectionSchema, 'asc').success).toBe(true);
	});

	it('accepts desc', () => {
		expect(v.safeParse(SortDirectionSchema, 'desc').success).toBe(true);
	});

	it('rejects invalid', () => {
		expect(v.safeParse(SortDirectionSchema, 'up').success).toBe(false);
	});
});

// =============================================================================
// Picklists
// =============================================================================

describe('LogLevelSchema', () => {
	it.each(['trace', 'debug', 'info', 'warn', 'error', 'silent'])('accepts %s', (level) => {
		expect(v.safeParse(LogLevelSchema, level).success).toBe(true);
	});

	it('rejects invalid', () => {
		expect(v.safeParse(LogLevelSchema, 'verbose').success).toBe(false);
	});
});

describe('HttpMethodSchema', () => {
	it.each(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])('accepts %s', (method) => {
		expect(v.safeParse(HttpMethodSchema, method).success).toBe(true);
	});

	it('rejects lowercase', () => {
		expect(v.safeParse(HttpMethodSchema, 'get').success).toBe(false);
	});
});

// =============================================================================
// Branded Constants
// =============================================================================

describe('Branded constants', () => {
	it('DEFAULT_TERMINAL_WIDTH is 80', () => {
		expect(DEFAULT_TERMINAL_WIDTH).toBe(80);
	});

	it('DEFAULT_JSON_INDENT is 2', () => {
		expect(DEFAULT_JSON_INDENT).toBe(2);
	});

	it('DEFAULT_PROGRESS_BAR_WIDTH is a positive integer', () => {
		expect(DEFAULT_PROGRESS_BAR_WIDTH).toBeGreaterThan(0);
	});

	it('DEFAULT_EXIT_CODE is 0', () => {
		expect(DEFAULT_EXIT_CODE).toBe(0);
	});

	it('FAILURE_EXIT_CODE is 1', () => {
		expect(FAILURE_EXIT_CODE).toBe(1);
	});
});

// =============================================================================
// Error Code Schema
// =============================================================================

describe('ErrorCodeSchema', () => {
	it('accepts DOMAIN.CODE format', () => {
		expect(v.safeParse(ErrorCodeSchema, 'IO.READ_FAILED').success).toBe(true);
	});

	it('rejects lowercase', () => {
		expect(v.safeParse(ErrorCodeSchema, 'io.read_failed').success).toBe(false);
	});

	it('rejects without dot', () => {
		expect(v.safeParse(ErrorCodeSchema, 'NODOTERROR').success).toBe(false);
	});
});

// =============================================================================
// Feature Flag
// =============================================================================

describe('FeatureFlagSchema', () => {
	it('accepts kebab-case', () => {
		expect(v.safeParse(FeatureFlagSchema, 'dark-mode').success).toBe(true);
	});

	it('rejects uppercase', () => {
		expect(v.safeParse(FeatureFlagSchema, 'DarkMode').success).toBe(false);
	});
});

// =============================================================================
// NPM
// =============================================================================

describe('NpmPackageNameSchema', () => {
	it('accepts scoped package', () => {
		expect(v.safeParse(NpmPackageNameSchema, '@scope/package').success).toBe(true);
	});

	it('accepts unscoped package', () => {
		expect(v.safeParse(NpmPackageNameSchema, 'my-package').success).toBe(true);
	});
});

describe('EventNameSchema', () => {
	it('accepts snake_case', () => {
		expect(v.safeParse(EventNameSchema, 'page_view').success).toBe(true);
	});

	it('rejects spaces', () => {
		expect(v.safeParse(EventNameSchema, 'page view').success).toBe(false);
	});
});
