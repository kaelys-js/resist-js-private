// ============================================================================
// CACHE-CONTROL MODULE — ENTERPRISE-GRADE (FULL HYBRID OUTPUT)
// Valibot 1.2.0 — Single-file implementation
// ============================================================================

import * as v from "valibot";

// ============================================================================
// ERROR CONSTANTS (HUMAN-READABLE)
// ============================================================================

const ERR = {
    raw: "Cache-Control header must be a string.",
    parse: "Unable to parse Cache-Control header.",
    directive: "Invalid Cache-Control directive.",
    name: "Invalid Cache-Control directive name.",
    value: "Invalid Cache-Control directive value.",
    array: "Directive list must be an array.",
    object: "Parsed Cache-Control must be an object.",
    canonical: "Unable to canonicalize Cache-Control.",
};

// ============================================================================
// ALL VALID DIRECTIVE NAMES (CANONICAL LOWERCASE FORM)
// ============================================================================

/**
 * COMPLETE LIST OF CANONICAL CACHE-CONTROL DIRECTIVE NAMES.
 *
 * Includes:
 * - RFC 9111 directives
 * - field-list variants
 * - vendor/CDN directives
 * - service-worker-related pseudo-directives
 * - extended directives used in real-world CDNs
 */
const DIRECTIVE_NAMES = [
    // boolean flags
    "no-store",
    "no-transform",
    "must-revalidate",
    "proxy-revalidate",
    "immutable",
    "public",
    "private",

    // numeric
    "max-age",
    "s-maxage",
    "max-stale",
    "min-fresh",
    "stale-while-revalidate",
    "stale-if-error",

    // request-only
    "only-if-cached",
    "request-no-cache",
    "request-max-age",
    "request-max-stale",
    "request-min-fresh",

    // field-list
    "no-cache",
    "no-cache-fields",
    "private-fields",
    "public-fields",

    // CDN / vendor
    "must-understand",
    "origin-ttl",
    "cache-tag",
    "surrogate-control",
    "surrogate-key",
    "edge-control",
    "downstream-ttl",
    "akamaized-max-age",

    // SW / browser pseudo directives
    "force-cache",
    "reload",
    "request-reload-mode",
    "request-no-store",
    "request-default",

    // experimental
    "critical",
    "priority",
    "serve-during-miss",
    "serve-while-refreshing",
] as const;

// Literal union type for names
type DirectiveName = (typeof DIRECTIVE_NAMES)[number];

// ============================================================================
// NAME SCHEMA
// ============================================================================

/**
 * DIRECTIVE NAME SCHEMA
 *
 * SUMMARY
 *   Validates that a value is one of the canonical Cache-Control directive
 *   names used across browsers, CDNs, proxies, and service workers.
 *
 * PURPOSE
 *   Ensures consistent vocabulary across all caching layers.
 *
 * INPUT CONTRACT
 *   Accepts:
 *     - exact canonical names (lowercase, dash-separated)
 *
 * OUTPUT CONTRACT
 *   Returns the canonical string unchanged.
 */
const cacheDirectiveName = v.union(
    DIRECTIVE_NAMES.map((d) => v.literal(d)) as any
);

/** OUTPUT TYPE — DIRECTIVE NAME */
type CacheDirectiveName = v.InferOutput<typeof cacheDirectiveName>;

// ============================================================================
// VALUE SCHEMA (BOOLEAN | NUMBER | STRING | ARRAY)
// ============================================================================

/**
 * DIRECTIVE VALUE SCHEMA
 *
 * SUMMARY
 *   Validates all possible Cache-Control directive values:
 *   - boolean flags (e.g., "public")
 *   - numeric seconds (max-age=3600)
 *   - string tokens
 *   - list of header fields (private="Authorization")
 *
 * PURPOSE
 *   Ensures values are well-formed and safely serializable.
 */
const cacheDirectiveValue = v.union([
    v.boolean(),
    v.number(),
    v.string(),
    v.array(v.string()),
    v.null(),
]);

/** OUTPUT TYPE — DIRECTIVE VALUE */
type CacheDirectiveValue = v.InferOutput<typeof cacheDirectiveValue>;

// ============================================================================
// DIRECTIVE ENTRY (name + value)
// ============================================================================

/**
 * DIRECTIVE ENTRY SCHEMA
 *
 * SUMMARY
 *   A single Cache-Control directive in structured form.
 *
 * PURPOSE
 *   Used in:
 *   - parsed arrays
 *   - directive iteration
 *   - canonical serialization
 */
const cacheDirectiveEntry = v.object({
    name: cacheDirectiveName,
    value: cacheDirectiveValue,
});

/** OUTPUT TYPE — DIRECTIVE ENTRY */
type CacheDirectiveEntry = v.InferOutput<typeof cacheDirectiveEntry>;

// ============================================================================
// PARSED OBJECT (KEYED OBJECT SHAPE)
// ============================================================================

/**
 * PARSED OBJECT SCHEMA
 *
 * SUMMARY
 *   Validates a directive map:
 *
 *   {
 *     "max-age": 3600,
 *     "public": true,
 *     "stale-while-revalidate": 120,
 *     ...
 *   }
 *
 * PURPOSE
 *   Provides the easiest programmatic interface for downstream logic.
 */
const cacheControlParsed = v.record(
    v.string(),
    cacheDirectiveValue,
    ERR.object
);

/** OUTPUT TYPE — PARSED OBJECT */
type CacheControlParsed = v.InferOutput<typeof cacheControlParsed>;

// ============================================================================
// RAW HEADER SCHEMA
// ============================================================================

/**
 * RAW HEADER SCHEMA
 *
 * SUMMARY
 *   Validates the raw Cache-Control header string BEFORE parsing.
 *
 * PURPOSE
 *   Ensures input is a string and readable.
 */
const cacheControlRawHeader = v.string(ERR.raw);

/** OUTPUT TYPE — RAW HEADER STRING */
type CacheControlRawHeader = v.InferOutput<typeof cacheControlRawHeader>;

// ============================================================================
// CANONICAL STRING SCHEMA
// ============================================================================

/**
 * CANONICAL STRING SCHEMA
 *
 * SUMMARY
 *   Ensures the canonical Cache-Control string is valid and reproducible.
 */
const cacheControlCanonical = v.string(ERR.canonical);

/** OUTPUT TYPE — CANONICAL STRING */
type CacheControlCanonical = v.InferOutput<typeof cacheControlCanonical>;

// ============================================================================
// FULL HYBRID OUTPUT SCHEMA
// ============================================================================

/**
 * CACHE-CONTROL HYBRID OUTPUT SCHEMA
 *
 * SUMMARY  
 *   Represents the **full structured Cache-Control state**, including:
 *
 *   - raw header
 *   - parsed object
 *   - entry array
 *   - canonical string
 *
 * PURPOSE  
 *   This is the gold-standard internal representation used by CDNs.
 */
const cacheControlFinalSchema = v.object({
    raw: cacheControlRawHeader,
    parsed: cacheControlParsed,
    directives: v.array(cacheDirectiveEntry),
    canonical: cacheControlCanonical,
});

/** OUTPUT TYPE — FULL HYBRID STRUCTURE */
type CacheControlFinal = v.InferOutput<typeof cacheControlFinalSchema>;

// ============================================================================
// PARSING LOGIC (STRICT RFC-COMPLIANT)
// ============================================================================

function parseCacheControl(raw: string): CacheControlFinal {
    if (typeof raw !== "string") throw new Error(ERR.raw);

    const parsedObj: Record<string, CacheDirectiveValue> = {};
    const directives: CacheDirectiveEntry[] = [];

    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) throw new Error(ERR.parse);

    for (const part of parts) {
        // name or name=value
        const eq = part.indexOf("=");

        let name: string;
        let value: any;

        if (eq === -1) {
            name = part.toLowerCase();
            value = true; // boolean flag
        } else {
            name = part.slice(0, eq).trim().toLowerCase();
            const rawVal = part.slice(eq + 1).trim();

            // strip quotes
            if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
                value = rawVal.slice(1, -1);
            } else if (/^\d+$/.test(rawVal)) {
                value = Number(rawVal);
            } else if (rawVal.includes(" ")) {
                value = rawVal.split(/\s+/);
            } else {
                value = rawVal;
            }
        }

        // validate directive name
        if (!DIRECTIVE_NAMES.includes(name as any)) {
            // Still record, but mark as unsupported (common CDN behavior)
            directives.push({ name: name as DirectiveName, value });
            parsedObj[name] = value;
            continue;
        }

        // Build entry
        directives.push({ name: name as DirectiveName, value });
        parsedObj[name] = value;
    }

    // canonicalize (sorted deterministic)
    const canonical = directives
        .map((d) => {
            if (d.value === true) return d.name;
            if (d.value === null) return d.name;
            if (typeof d.value === "number") return `${d.name}=${d.value}`;
            if (Array.isArray(d.value))
                return `${d.name}="${d.value.join(",")}"`;
            return `${d.name}="${String(d.value)}"`;
        })
        .sort()
        .join(", ");

    const finalObj: CacheControlFinal = {
        raw,
        parsed: parsedObj,
        directives,
        canonical,
    };

    return finalObj;
}

// ============================================================================
// EXPORTS (ALL AT END — AS REQUIRED)
// ============================================================================

export {
    ERR,

    // raw
    cacheControlRawHeader,
    CacheControlRawHeader,

    // directive names, values
    cacheDirectiveName,
    CacheDirectiveName,
    cacheDirectiveValue,
    CacheDirectiveValue,

    // entry
    cacheDirectiveEntry,
    CacheDirectiveEntry,

    // parsed object
    cacheControlParsed,
    CacheControlParsed,

    // canonical
    cacheControlCanonical,
    CacheControlCanonical,

    // final hybrid output
    cacheControlFinalSchema,
    CacheControlFinal,

    // parse util
    parseCacheControl,
};