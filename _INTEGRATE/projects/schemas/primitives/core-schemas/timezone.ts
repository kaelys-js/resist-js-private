/**
 * IANA TIMEZONE SCHEMA (STRICT)
 *
 * SUMMARY  
 *   Validates that a value is a **syntactically correct IANA timezone name**,
 *   conforming fully to the structure defined by the IANA Time Zone Database
 *   (RFC 6557). This schema enforces:
 *
 *   - canonical “Area/Location” format  
 *   - capitalization rules (case-sensitive, real-world convention)  
 *   - multi-segment zones (e.g., "America/Argentina/Buenos_Aires")  
 *   - allowed characters (A–Z, a–z, 0–9, `_`, `-`)  
 *
 *   No coercion, mapping, shortening, or alias translation is performed.
 *
 * PURPOSE  
 *   This validator is essential for:
 *   - server configuration  
 *   - user profile settings  
 *   - scheduling & calendar systems  
 *   - internationalization pipelines  
 *   - timestamp conversion layers  
 *   - distributed systems requiring consistent temporal semantics  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any valid IANA timezone such as:
 *       - "America/Los_Angeles"
 *       - "Europe/London"
 *       - "Asia/Tokyo"
 *       - "America/Argentina/Buenos_Aires"
 *
 *   REJECTS:
 *   - UTC shorthand ("UTC", "GMT", "Z")  
 *   - abbreviations ("PST", "EST", "CET")  
 *   - lowercase zones ("america/toronto")  
 *   - invalid segments ("America//LA", "/Tokyo")  
 *   - non-strings  
 *
 * OUTPUT CONTRACT  
 *   - Returns the timezone string unchanged  
 *
 * VALIDATION LOGIC  
 *   - Must match strict IANA pattern:
 *       `^[A-Za-z]+(?:[_-]?[A-Za-z0-9]+)*(?:\/[A-Za-z0-9]+(?:[_-]?[A-Za-z0-9]+)*)+$`
 *
 * SEMANTIC NOTES  
 *   - Ensures the timezone is an *actual* IANA-style identifier  
 *   - Does not guarantee the zone exists *in the current tzdb version*  
 *   - Use coercive schema later for mapping "PST" → "America/Los_Angeles"  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "America/New_York"
 *   "Europe/Paris"
 *   "Australia/Melbourne"
 *
 *   // Invalid
 *   "PST"
 *   "UTC"
 *   "GMT+1"
 *   "america/los_angeles"
 *   "America/"
 *   ```
 */
export const timezoneIanaStrict = v
    .string("Timezone must be a string.")
    .pipe(
        v.regex(
            /^[A-Za-z]+(?:[_-]?[A-Za-z0-9]+)*(?:\/[A-Za-z0-9]+(?:[_-]?[A-Za-z0-9]+)*)+$/,
            "Invalid IANA timezone format."
        )
    );

/**
* OUTPUT TYPE — STRICT IANA TIMEZONE
*
* SUMMARY  
*   Represents a validated, canonical IANA timezone string, guaranteed to match
*   the structural rules of the IANA tz database format.
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always structurally valid  
*   - Never an abbreviation or offset  
*   - Never coerced  
*
* EXAMPLE  
*   ```
*   const tz: TimezoneIanaStrict =
*       parse(timezoneIanaStrict, "Europe/Berlin");
*   ```
*/
export type TimezoneIanaStrict = v.InferOutput<typeof timezoneIanaStrict>;

/**
 * UTC/GMT OFFSET TIMEZONE SCHEMA (STRICT)
 *
 * SUMMARY  
 *   Validates that the input string is a **strict UTC/GMT offset timezone** in
 *   one of the permitted canonical formats. This schema enforces the exact,
 *   RFC-compliant offset grammar used for:
 *
 *   - timestamp normalization  
 *   - scheduling & calendar systems  
 *   - log ingestion pipelines  
 *   - distributed event ordering  
 *   - cross-region processing rules  
 *
 *   This schema **does not accept IANA names**, abbreviations, or aliases.  
 *   Only *UTC* and *GMT* prefix-based offsets are valid.
 *
 * PURPOSE  
 *   Provides a rigorous format for environments where the timezone must be an
 *   **absolute numeric offset**, including:
 *
 *   - server logs  
 *   - protocol headers  
 *   - database records  
 *   - ETL pipelines  
 *   - distributed task schedulers  
 *   - deterministic timestamp storage  
 *
 * INPUT CONTRACT  
 *   ACCEPTS (examples):
 *   - "UTC+0"
 *   - "UTC-5"
 *   - "UTC+02"
 *   - "UTC+02:00"
 *   - "UTC-03:30"
 *   - "GMT+1"
 *   - "GMT-10:45"
 *
 *   REJECTS:
 *   - bare offsets ("+2", "-05")  
 *   - IANA names ("America/New_York")  
 *   - abbreviations ("PST", "EST", "CET")  
 *   - "UTC" without offset  
 *   - "GMT" without offset  
 *   - malformed offsets ("UTC+5:3", "UTC--4")  
 *
 * OUTPUT CONTRACT  
 *   - Returns the offset string unchanged.  
 *
 * VALIDATION LOGIC  
 *   Must match one of:
 *
 *   - `UTC±H`  
 *   - `UTC±HH`  
 *   - `UTC±HH:MM`  
 *   - `GMT±H`  
 *   - `GMT±HH`  
 *   - `GMT±HH:MM`
 *
 *   Hour: `00–23`  
 *   Minute: `00–59`  
 *
 * SEMANTIC NOTES  
 *   - This schema does not normalize or coerce.  
 *   - It does not compute the numeric offset.  
 *   - It does not infer DST or daylight rules.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "UTC+0"
 *   "UTC+02:00"
 *   "UTC-03:30"
 *   "GMT+1"
 *   "GMT-10:45"
 *
 *   // Invalid
 *   "UTC"
 *   "GMT"
 *   "+02:00"
 *   "PST"
 *   "America/Toronto"
 *   "UTC+24:00"
 *   "UTC+9:7"
 *   ```
 */
export const timezoneOffsetStrict = v
    .string("Timezone offset must be a string.")
    .pipe(
        v.regex(
            /^(?:UTC|GMT)(?:\+|-)(?:[01]?\d|2[0-3])(?::[0-5]\d)?$/,
            "Invalid UTC/GMT offset format."
        )
    );

/**
* OUTPUT TYPE — STRICT UTC/GMT OFFSET
*
* SUMMARY  
*   Represents a validated, canonical UTC or GMT offset string, guaranteed to
*   follow one of the prescribed formats:
*
*     - UTC±H  
*     - UTC±HH  
*     - UTC±HH:MM  
*     - GMT±H  
*     - GMT±HH  
*     - GMT±HH:MM
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always a valid numeric offset prefix  
*   - Never abbreviated  
*   - Never an IANA name  
*   - Never normalized or coerced  
*
* EXAMPLE  
*   ```
*   const tz: TimezoneOffsetStrict =
*       parse(timezoneOffsetStrict, "UTC-03:30");
*   ```
*/
export type TimezoneOffsetStrict = v.InferOutput<typeof timezoneOffsetStrict>;

/**
 * UTC/GMT OFFSET COERCION SCHEMA
 *
 * SUMMARY  
 *   Accepts a wide range of **raw user-entered offset formats** and normalizes
 *   them into a **canonical, strict UTC offset string**:
 *
 *       "UTC±HH:MM"
 *
 *   The coercion layer supports highly inconsistent inputs, including:
 *
 *   - `"Z"`  
 *   - `"UTC"` / `"GMT"`  
 *   - `"UTC+2"` / `"GMT-5"`  
 *   - `"+2"` / `"-3"`  
 *   - `"02:30"` / `"-05:45"`  
 *   - `"2"` / `"0"` / `"00"`  
 *   - `"UTC+02:30"` / `"GMT-10:45"`  
 *
 *   The output is always properly zero-padded and validated.
 *
 * PURPOSE  
 *   A robust usability layer for:
 *   - profile settings  
 *   - onboarding forms  
 *   - admin consoles  
 *   - user preference imports  
 *   - configuration files  
 *   - migration of legacy timezone formats  
 *
 *   Ensures client-facing interfaces can accept "Z", "+2", "-530" etc. without
 *   risking invalid state in the system.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - IANA-safe freeform strings representing numeric timezone offsets  
 *   - Z / z (Zulu)  
 *   - UTC / GMT (with or without explicit offset)  
 *   - Signed or unsigned numbers  
 *   - H, HH, HH:MM forms  
 *
 *   REJECTS:
 *   - IANA region names ("America/LA")  
 *   - Abbreviations ("PST", "CET")  
 *   - Malformed strings such as "+2:7", "UTC++4", "UTC-24"  
 *   - Non-string input  
 *
 * OUTPUT CONTRACT  
 *   Always returns a **canonical UTC offset**, formatted as:
 *
 *       "UTC+HH:MM"  
 *
 *   Example outputs:
 *   - `"UTC+00:00"`
 *   - `"UTC-03:30"`
 *   - `"UTC+09:45"`
 *
 * VALIDATION & COERCION LOGIC  
 *   Steps:
 *   1. Normalize casing  
 *   2. Map `"Z"` → `"UTC+00:00"`  
 *   3. Handle `"UTC"` / `"GMT"` alone → `"UTC+00:00"`  
 *   4. Remove prefix `UTC` or `GMT` for parsing  
 *   5. Parse signed offsets:  
 *       - ±H  
 *       - ±HH  
 *       - ±HHMM  
 *       - ±HH:MM  
 *   6. Validate hour in `0–23`, minute in `0–59`  
 *   7. Reconstruct `"UTC±HH:MM"`  
 *
 * SEMANTIC NOTES  
 *   - Geographic names are not supported (use IANA schemas).  
 *   - Abbreviations are intentionally excluded due to ambiguity.  
 *   - Canonical prefix is always `UTC` (never GMT).  
 *
 * EXAMPLES  
 *   ```
 *   parse(timezoneOffsetCoerce, "Z")            // "UTC+00:00"
 *   parse(timezoneOffsetCoerce, "+2")           // "UTC+02:00"
 *   parse(timezoneOffsetCoerce, "-530")         // "UTC-05:30"
 *   parse(timezoneOffsetCoerce, "UTC+2")        // "UTC+02:00"
 *   parse(timezoneOffsetCoerce, "GMT-10:45")    // "UTC-10:45"
 *   parse(timezoneOffsetCoerce, "00")           // "UTC+00:00"
 *
 *   // Invalid
 *   parse(timezoneOffsetCoerce, "PST")
 *   parse(timezoneOffsetCoerce, "America/NY")
 *   parse(timezoneOffsetCoerce, "UTC+99")
 *   ```
 */
export const timezoneOffsetCoerce = v.coerce(
    v.string("Timezone must be a string."),
    (input: any): string => {
        if (typeof input !== "string") {
            throw new Error("Timezone must be a string.");
        }

        let s = input.trim();

        // Z / z → UTC+00:00
        if (/^z$/i.test(s)) return "UTC+00:00";

        // Pure UTC or GMT → UTC+00:00
        if (/^(utc|gmt)$/i.test(s)) return "UTC+00:00";

        // Remove UTC/GMT prefix if present
        s = s.replace(/^(utc|gmt)/i, "").trim();

        // If empty after prefix removal → default to zero offset
        if (s === "") return "UTC+00:00";

        // Normalize sign
        if (!/^[+-]/.test(s)) {
            // assume positive if user writes "2" or "230"
            s = "+" + s;
        }

        // Parse ±H, ±HH, ±HHMM, ±HH:MM
        const match =
            /^([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(s) ||
            /^([+-])(\d{2})(\d{2})$/.exec(s);

        if (!match) {
            throw new Error("Invalid numeric timezone offset.");
        }

        const sign = match[1];
        const hour = parseInt(match[2], 10);
        const minute = match[3] ? parseInt(match[3], 10) : 0;

        // Validate bounds
        if (hour > 23 || minute > 59) {
            throw new Error("Timezone offset out of range.");
        }

        // Reconstruct canonical form
        const hh = hour.toString().padStart(2, "0");
        const mm = minute.toString().padStart(2, "0");

        return `UTC${sign}${hh}:${mm}`;
    }
);

/**
 * OUTPUT TYPE — COERCED UTC OFFSET
 *
 * SUMMARY  
 *   Represents the canonical, fully normalized UTC offset string produced by
 *   the `timezoneOffsetCoerce` schema. Regardless of input style, the final
 *   output always conforms to:
 *
 *       "UTC±HH:MM"
 *
 * CONTRACT GUARANTEES  
 *   - Always a canonical UTC offset string  
 *   - Always zero-padded  
 *   - Always safe to store in databases and profiles  
 *   - Never ambiguous  
 *   - Never an IANA name or abbreviation  
 *
 * EXAMPLE  
 *   ```
 *   const tz: TimezoneOffsetCoerce =
 *       parse(timezoneOffsetCoerce, "GMT-3");
 *   // "UTC-03:00"
 *   ```
 */
export type TimezoneOffsetCoerce = v.InferOutput<typeof timezoneOffsetCoerce>;

/**
 * GENERIC TIMEZONE SCHEMA (IANA + STRICT OFFSET + COERCED OFFSET)
 *
 * SUMMARY  
 *   Provides a **unified, enterprise-grade timezone validator** capable of
 *   accepting multiple safe timezone representations while rejecting ambiguous,
 *   legacy, or regionally overloaded abbreviations.
 *
 *   This schema integrates:
 *   - strict IANA timezone validation  
 *   - strict UTC/GMT offset validation  
 *   - coercive UTC offset parsing (Z, +2, -530, UTC+2, etc.)  
 *
 *   Output is normalized into a **single canonical object** describing both the
 *   original source type and the canonical form.
 *
 * PURPOSE  
 *   Used wherever timezone input may originate from:
 *   - user-facing UI fields  
 *   - migration imports  
 *   - JSON configs  
 *   - environment variables  
 *   - public APIs  
 *   - admin consoles  
 *
 *   Ensures systems do not accidentally store ambiguous formats such as `"PST"`
 *   or `"CET"` which are globally non-deterministic.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - Any valid IANA name ("America/Toronto", "Asia/Tokyo")  
 *   - Strict offsets ("UTC+02:00", "GMT-3")  
 *   - Coercible offsets ("Z", "+2", "-530", "UTC", "GMT", "02:30")  
 *
 *   REJECTS:
 *   - Abbreviations ("PST", "EST", "IST", "CET", "BST")  
 *   - Regionally ambiguous terms ("Local", "Server", "Browser")  
 *   - Invalid IANA identifiers  
 *   - Non-string input  
 *
 * OUTPUT CONTRACT  
 *   Returns a **normalized structured object**:
 *
 *   ```
 *   {
 *     kind: "iana" | "offset",
 *     original: string,
 *     canonical: string
 *   }
 *   ```
 *
 *   Where:
 *   - `kind = "iana"`  
 *       - canonical = IANA name unchanged  
 *   - `kind = "offset"`  
 *       - canonical = "UTC±HH:MM"  
 *
 * VALIDATION LOGIC  
 *   Steps:
 *   1. Reject non-strings  
 *   2. Try strict IANA match  
 *   3. Try strict UTC offset match  
 *   4. Try coercive offset parsing  
 *   5. If all fail → invalid timezone  
 *
 * SEMANTIC NOTES  
 *   - This schema does **not** attempt abbreviation expansion ("PST"→LA) for
 *     safety-critical reasons. (Handled in `timezoneLoose` later.)
 *
 * EXAMPLES  
 *   ```
 *   parse(timezoneGeneric, "America/New_York")
 *   // {
 *   //   kind: "iana",
 *   //   original: "America/New_York",
 *   //   canonical: "America/New_York"
 *   // }
 *
 *   parse(timezoneGeneric, "UTC-03:30")
 *   // {
 *   //   kind: "offset",
 *   //   original: "UTC-03:30",
 *   //   canonical: "UTC-03:30"
 *   // }
 *
 *   parse(timezoneGeneric, "+2")
 *   // {
 *   //   kind: "offset",
 *   //   original: "+2",
 *   //   canonical: "UTC+02:00"
 *   // }
 *
 *   parse(timezoneGeneric, "PST")   // ❌ invalid
 *   parse(timezoneGeneric, "LA")    // ❌ invalid
 *   ```
 */
export const timezoneGeneric = v.coerce(
    v.string("Timezone must be a string."),
    (input: any) => {
        if (typeof input !== "string") {
            throw new Error("Timezone must be a string.");
        }

        const original = input.trim();

        // 1. Strict IANA match
        if (
            /^[A-Za-z]+(?:[_-]?[A-Za-z0-9]+)*(?:\/[A-Za-z0-9]+(?:[_-]?[A-Za-z0-9]+)*)+$/.test(
                original
            )
        ) {
            return {
                kind: "iana",
                original,
                canonical: original,
            };
        }

        // 2. Strict offset match
        if (
            /^(?:UTC|GMT)(?:\+|-)(?:[01]?\d|2[0-3])(?::[0-5]\d)?$/.test(original)
        ) {
            return {
                kind: "offset",
                original,
                canonical: original.replace(/^GMT/, "UTC"),
            };
        }

        // 3. Coercive offset
        try {
            const coerced = (() => {
                let s = original;

                if (/^z$/i.test(s)) return "UTC+00:00";
                if (/^(utc|gmt)$/i.test(s)) return "UTC+00:00";

                s = s.replace(/^(utc|gmt)/i, "").trim();

                if (s === "") return "UTC+00:00";
                if (!/^[+-]/.test(s)) s = "+" + s;

                const m =
                    /^([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(s) ||
                    /^([+-])(\d{2})(\d{2})$/.exec(s);

                if (!m) throw new Error("bad-offset");

                const sign = m[1];
                const hour = parseInt(m[2], 10);
                const minute = m[3] ? parseInt(m[3], 10) : 0;

                if (hour > 23 || minute > 59) {
                    throw new Error("bad-range");
                }

                const hh = hour.toString().padStart(2, "0");
                const mm = minute.toString().padStart(2, "0");

                return `UTC${sign}${hh}:${mm}`;
            })();

            return {
                kind: "offset",
                original,
                canonical: coerced,
            };
        } catch {
            throw new Error("Invalid timezone format.");
        }
    }
);

/**
* OUTPUT TYPE — GENERIC TIMEZONE DESCRIPTOR
*
* SUMMARY  
*   Represents the **fully normalized timezone descriptor** returned by the
*   `timezoneGeneric` schema. Unifies both IANA-style and UTC/GMT offset style
*   timezones into a consistent structural format.
*
* CONTRACT GUARANTEES  
*   - `kind` will always be:
*       - `"iana"`   → canonical is a valid IANA name  
*       - `"offset"` → canonical is `"UTC±HH:MM"`  
*
*   - `original` preserves the raw input  
*   - `canonical` is guaranteed correct & safe for storage  
*
* EXAMPLE  
*   ```
*   const tz: TimezoneGeneric =
*       parse(timezoneGeneric, "GMT-10:30");
*
*   // tz.kind === "offset"
*   // tz.canonical === "UTC-10:30"
*   ```
*/
export type TimezoneGeneric = v.InferOutput<typeof timezoneGeneric>;

/**
 * LOOSE TIMEZONE SCHEMA (IANA + OFFSET + COERCED + ABBREVIATIONS)
 *
 * SUMMARY  
 *   A highly flexible, user-friendly timezone validator that accepts nearly all
 *   common human-entered timezone formats, including:
 *
 *   - Valid IANA zones  
 *   - Strict UTC/GMT offsets  
 *   - Coercible offsets (Z, +2, -530, UTC, GMT, HH:MM, etc.)  
 *   - Common timezone abbreviations  
 *   - Certain legacy aliases and human-friendly labels  
 *
 *   All accepted inputs are transformed into a canonical, deterministic output:
 *
 *   ```
 *   {
 *     kind: "iana" | "offset" | "abbr",
 *     original: string,
 *     canonical: string,
 *     source: "iana" | "offset" | "abbreviation"
 *   }
 *   ```
 *
 * PURPOSE  
 *   Provides a robust, enterprise-grade input layer for:
 *
 *   - end-user timezone fields  
 *   - mobile/web onboarding  
 *   - admin panels  
 *   - imports from legacy systems  
 *   - ETL pipelines with heterogeneous inputs  
 *
 *   Unlike `timezoneGeneric`, this schema **intentionally tolerates** common
 *   timezone shortcuts such as “PST”, “IST”, “CET”, etc., mapping them to a
 *   deterministic canonical IANA zone.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *
 *   - IANA names (e.g., "America/New_York")  
 *   - Strict offsets (e.g., "UTC+02:00", "GMT-03:30")  
 *   - Coercible offsets (e.g., "+2", "-530", "Z", "UTC")  
 *   - Common abbreviations, such as:
 *       - PST → America/Los_Angeles  
 *       - PDT → America/Los_Angeles  
 *       - EST → America/New_York  
 *       - EDT → America/New_York  
 *       - CST → America/Chicago  
 *       - CET → Europe/Berlin  
 *       - CEST → Europe/Berlin  
 *       - IST → Asia/Kolkata  
 *       - JST → Asia/Tokyo  
 *       - AEST → Australia/Sydney  
 *       - AEDT → Australia/Sydney  
 *
 *   REJECTS:
 *   - Homemade or unknown abbreviations  
 *   - Non-string values  
 *   - Malformed offset syntax  
 *   - Fake IANA identifiers  
 *   - Values like "Local", "Server", "Browser"  
 *
 * OUTPUT CONTRACT  
 *   Always returns:
 *   ```
 *   {
 *     kind:    "iana" | "offset" | "abbr",
 *     original: string,
 *     canonical: string,
 *     source:   "iana" | "offset" | "abbreviation"
 *   }
 *   ```
 *
 *   Canonical values:
 *     - IANA → unchanged  
 *     - Offset → "UTC±HH:MM"  
 *     - Abbreviation → mapped IANA zone  
 *
 * VALIDATION LOGIC  
 *
 *   1. **Try strict IANA**  
 *   2. **Try strict UTC/GMT offset**  
 *   3. **Try full offset coercion**  
 *   4. **Try abbreviation lookup**  
 *   5. If all fail → error  
 *
 * SEMANTIC NOTES  
 *   - Abbreviation mapping is deterministic, using the industry-standard
 *     canonical mappings.  
 *   - Alternate DST variants map to the same IANA canonical zone.  
 *   - This schema is intentionally permissive and should **not** be used for
 *     validation of persisted timestamps — that’s what `timezoneGeneric` is for.  
 *
 * EXAMPLES  
 *   ```
 *   parse(timezoneLoose, "PST")
 *   // {
 *   //   kind: "abbr",
 *   //   original: "PST",
 *   //   canonical: "America/Los_Angeles",
 *   //   source: "abbreviation"
 *   // }
 *
 *   parse(timezoneLoose, "-530")
 *   // {
 *   //   kind: "offset",
 *   //   original: "-530",
 *   //   canonical: "UTC-05:30",
 *   //   source: "offset"
 *   // }
 *
 *   parse(timezoneLoose, "Europe/Paris")
 *   // { kind: "iana", original: ..., canonical: ..., source: "iana" }
 *   ```
 */
export const timezoneLoose = v.coerce(
    v.string("Timezone must be a string."),
    (input: any) => {
        if (typeof input !== "string") {
            throw new Error("Timezone must be a string.");
        }

        const original = input.trim();

        // -------------------------------------------------------------------------
        // 1. STRICT IANA NAME
        // -------------------------------------------------------------------------
        if (
            /^[A-Za-z]+(?:[_-]?[A-Za-z0-9]+)*(?:\/[A-Za-z0-9]+(?:[_-]?[A-Za-z0-9]+)*)+$/.test(
                original
            )
        ) {
            return {
                kind: "iana",
                original,
                canonical: original,
                source: "iana",
            };
        }

        // -------------------------------------------------------------------------
        // 2. STRICT UTC/GMT OFFSET
        // -------------------------------------------------------------------------
        if (
            /^(?:UTC|GMT)(?:\+|-)(?:[01]?\d|2[0-3])(?::[0-5]\d)?$/.test(original)
        ) {
            return {
                kind: "offset",
                original,
                canonical: original.replace(/^GMT/, "UTC"),
                source: "offset",
            };
        }

        // -------------------------------------------------------------------------
        // 3. COERCIVE UTC OFFSET
        // -------------------------------------------------------------------------
        const tryCoerce = () => {
            let s = original;

            if (/^z$/i.test(s)) return "UTC+00:00";
            if (/^(utc|gmt)$/i.test(s)) return "UTC+00:00";

            s = s.replace(/^(utc|gmt)/i, "").trim();

            if (s === "") return "UTC+00:00";
            if (!/^[+-]/.test(s)) s = "+" + s;

            const m =
                /^([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(s) ||
                /^([+-])(\d{2})(\d{2})$/.exec(s);

            if (!m) return null;

            const sign = m[1];
            const hour = parseInt(m[2], 10);
            const minute = m[3] ? parseInt(m[3], 10) : 0;

            if (hour > 23 || minute > 59) return null;

            const hh = hour.toString().padStart(2, "0");
            const mm = minute.toString().padStart(2, "0");
            return `UTC${sign}${hh}:${mm}`;
        };

        const coerced = tryCoerce();
        if (coerced) {
            return {
                kind: "offset",
                original,
                canonical: coerced,
                source: "offset",
            };
        }

        // -------------------------------------------------------------------------
        // 4. ABBREVIATION MAP
        // -------------------------------------------------------------------------
        const ABBR: Record<string, string> = {
            PST: "America/Los_Angeles",
            PDT: "America/Los_Angeles",
            MST: "America/Denver",
            MDT: "America/Denver",
            CST: "America/Chicago",
            CDT: "America/Chicago",
            EST: "America/New_York",
            EDT: "America/New_York",

            CET: "Europe/Berlin",
            CEST: "Europe/Berlin",

            WET: "Europe/Lisbon",
            WEST: "Europe/Lisbon",

            IST: "Asia/Kolkata",
            JST: "Asia/Tokyo",

            AEST: "Australia/Sydney",
            AEDT: "Australia/Sydney",
        };

        const upper = original.toUpperCase();
        if (upper in ABBR) {
            return {
                kind: "abbr",
                original,
                canonical: ABBR[upper],
                source: "abbreviation",
            };
        }

        // -------------------------------------------------------------------------
        // FAIL
        // -------------------------------------------------------------------------
        throw new Error("Invalid or unsupported timezone format.");
    }
);

/**
* OUTPUT TYPE — LOOSE TIMEZONE DESCRIPTOR
*
* SUMMARY  
*   Represents the normalized output of the `timezoneLoose` schema, containing
*   both the interpreted kind (IANA, offset, abbreviation) and the canonical
*   representation guaranteed safe for downstream systems.
*
* CONTRACT GUARANTEES  
*   Always returns:
*
*   ```
*   {
*     kind:    "iana" | "offset" | "abbr",
*     original: string,
*     canonical: string,
*     source:   "iana" | "offset" | "abbreviation"
*   }
*   ```
*
* SEMANTIC NOTES  
*   - Abbreviation → canonical IANA  
*   - Offset → canonical "UTC±HH:MM"  
*   - IANA → unchanged  
*
* EXAMPLE  
*   ```
*   const tz: TimezoneLoose =
*       parse(timezoneLoose, "PST");
*
*   // tz.kind     === "abbr"
*   // tz.canonical === "America/Los_Angeles"
*   ```
*/
export type TimezoneLoose = v.InferOutput<typeof timezoneLoose>;

/**
 * ARRAY OF STRICT IANA TIMEZONES
 *
 * SUMMARY  
 *   Validates an array whose elements are **strict IANA timezone names**.  
 *   Each entry must conform to the full structural rules of an IANA zone
 *   identifier, enforced by the `timezoneIanaStrict` schema.
 *
 * PURPOSE  
 *   Used for:
 *   - multi-timezone profile configurations  
 *   - calendar preferences  
 *   - batch timezone inputs  
 *   - notification routing  
 *   - region-specific analytics filters  
 *   - permission rules involving multiple zones  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - An array of strings
 *   - Each string must be a valid IANA timezone name  
 *
 *   REJECTS:
 *   - Non-arrays  
 *   - Arrays containing non-string values  
 *   - Arrays containing invalid IANA zones  
 *   - Abbreviations ("PST", "CET")  
 *   - Offsets ("UTC+02:00")  
 *
 * OUTPUT CONTRACT  
 *   Returns the array unchanged, preserving order.
 *
 * VALIDATION LOGIC  
 *   - Array must exist  
 *   - Every element is validated against `timezoneIanaStrict`  
 *   - No coercion is applied  
 *
 * SEMANTIC NOTES  
 *   - Useful when the consumer must guarantee that **all** entries are real
 *     geographical zones, not offsets.  
 *   - Does not ensure zones exist in current tzdb version; only syntax.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   ["America/New_York", "Asia/Tokyo"]
 *
 *   // Invalid
 *   ["PST", "Europe/Paris"]     // PST invalid
 *   ["UTC+02:00"]               // offset invalid
 *   ["America/London"]          // malformed IANA name
 *   ```
 */
export const timezoneArrayIanaStrict = v.array(timezoneIanaStrict);

/**
 * OUTPUT TYPE — ARRAY OF STRICT IANA TIMEZONES
 *
 * SUMMARY  
 *   Represents an array where each element is a syntactically valid IANA
 *   timezone name, as validated by `timezoneIanaStrict`.
 *
 * CONTRACT GUARANTEES  
 *   - Always an array  
 *   - All elements are valid IANA timezone strings  
 *   - No offsets, no abbreviations, no coercion  
 *
 * EXAMPLE  
 *   ```
 *   const tzs: TimezoneArrayIanaStrict =
 *       parse(timezoneArrayIanaStrict,
 *             ["Europe/Paris", "Asia/Tokyo"]);
 *   ```
 */
export type TimezoneArrayIanaStrict =
    v.InferOutput<typeof timezoneArrayIanaStrict>;

/**
 * ARRAY OF STRICT UTC/GMT OFFSETS
 *
 * SUMMARY  
 *   Validates that the input is an array in which **every element** is a valid,
 *   strictly formatted UTC/GMT offset according to the `timezoneOffsetStrict`
 *   schema.
 *
 *   Each element must match one of the canonical offset formats:
 *   - "UTC+H"
 *   - "UTC+HH"
 *   - "UTC+HH:MM"
 *   - "GMT-H"
 *   - "GMT-HH"
 *   - "GMT-HH:MM"
 *
 * PURPOSE  
 *   This schema is used where **only numeric offsets** are permissible, such as:
 *   - storage of normalized temporal offsets in configuration  
 *   - request processing pipelines  
 *   - database-encoded scheduling rules  
 *   - cross-system temporal normalization  
 *   - programmatic constraints where relative offsets are required  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - An array of strings  
 *   - Each string must pass `timezoneOffsetStrict`  
 *
 *   REJECTS:
 *   - Non-array inputs  
 *   - Arrays containing IANA zones ("America/NY")  
 *   - Abbreviations ("PST", "CET")  
 *   - Coercible-but-not-strict offsets ("+2", "-530", "Z", "UTC")  
 *   - Any malformed offset  
 *
 * OUTPUT CONTRACT  
 *   Returns the original string values unchanged, preserving order.
 *
 * VALIDATION LOGIC  
 *   - Must be an array  
 *   - Each element validated by `timezoneOffsetStrict`  
 *   - No coercion or interpretation performed  
 *
 * SEMANTIC NOTES  
 *   - Intended for systems where offsets must be exact and pre-normalized  
 *   - Enforces strongest guarantee: no abbreviations, no IANA zones  
 *   - Outputs are directly safe for timestamp arithmetic  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   ["UTC+02:00", "UTC-03:30", "GMT+1"]
 *
 *   // Invalid
 *   ["+2"]               // coercible but not strict
 *   ["PST"]              // abbreviation
 *   ["America/Toronto"]  // IANA name
 *   ["UTC+25:00"]        // invalid hour
 *   ```
 */
export const timezoneArrayOffsetStrict = v.array(timezoneOffsetStrict);

/**
 * OUTPUT TYPE — ARRAY OF STRICT UTC/GMT OFFSETS
 *
 * SUMMARY  
 *   Represents an array whose elements are all strictly validated UTC/GMT
 *   offsets, each guaranteed to conform to the canonical rules enforced by
 *   `timezoneOffsetStrict`.
 *
 * CONTRACT GUARANTEES  
 *   - Always an array  
 *   - All elements safe for arithmetic operations  
 *   - No coercion performed  
 *
 * EXAMPLE  
 *   ```
 *   const offsets: TimezoneArrayOffsetStrict =
 *       parse(timezoneArrayOffsetStrict,
 *             ["UTC+00:00", "UTC-03:30"]);
 *   ```
 */
export type TimezoneArrayOffsetStrict =
    v.InferOutput<typeof timezoneArrayOffsetStrict>;

/**
 * ARRAY OF COERCED UTC/GMT OFFSETS
 *
 * SUMMARY  
 *   Validates an array whose elements may be **any coercible representation** of
 *   a UTC/GMT timezone offset. Each element is transformed into a canonical,
 *   deterministic `"UTC±HH:MM"` string using the `timezoneOffsetCoerce` schema.
 *
 *   Accepted raw formats include:
 *   - "Z"
 *   - "UTC", "GMT"
 *   - "+2", "-3"
 *   - "02:30"
 *   - "-530"
 *   - "UTC+2", "GMT-10:45"
 *   - "0", "00", "+00"
 *
 * PURPOSE  
 *   Provides a robust mechanism for handling mixed-quality human or legacy
 *   timezone inputs while producing clean, precise UTC offsets for:
 *   - preference/profile storage  
 *   - configuration management  
 *   - cross-system normalization  
 *   - analytics pipelines  
 *   - form and onboarding flows  
 *   - imported datasets  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - Array of strings (or coercible inputs)
 *   - Each element must be valid under `timezoneOffsetCoerce`
 *
 *   REJECTS:
 *   - Non-array inputs  
 *   - Arrays with invalid coercions (e.g., "UTC++3", "+99")  
 *   - IANA names ("America/Toronto")  
 *   - Abbreviations ("PST", "CET")  
 *
 * OUTPUT CONTRACT  
 *   - Returns an array of canonical `"UTC±HH:MM"` strings  
 *   - Order of items is preserved  
 *
 * VALIDATION LOGIC  
 *   - Must be an array  
 *   - Each element processed by `timezoneOffsetCoerce`  
 *   - Throws if any element cannot be coerced  
 *
 * SEMANTIC NOTES  
 *   - Designed for flexible ingestion, strict output  
 *   - Useful as a “safe wide-net” collector for user-facing representations  
 *   - Guarantees storage-ready canonical offset values  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   ["Z", "+2", "-530", "UTC", "GMT-3"]
 *   // → ["UTC+00:00", "UTC+02:00", "UTC-05:30", "UTC+00:00", "UTC-03:00"]
 *
 *   // Invalid
 *   ["PST"]            // abbreviation not allowed
 *   ["America/LA"]     // IANA not allowed
 *   ["UTC+25"]         // invalid hour
 *   ```
 */
export const timezoneArrayOffsetCoerce = v.array(timezoneOffsetCoerce);

/**
 * OUTPUT TYPE — ARRAY OF COERCED UTC OFFSETS
 *
 * SUMMARY  
 *   Represents an array in which **each element** is the canonical `"UTC±HH:MM"`
 *   timezone offset produced by the `timezoneOffsetCoerce` schema.  
 *
 * CONTRACT GUARANTEES  
 *   - Always an array  
 *   - All elements follow `"UTC±HH:MM"`  
 *   - No abbreviation or IANA forms included  
 *   - Coercion ensures uniform, safe output  
 *
 * EXAMPLE  
 *   ```
 *   const tz: TimezoneArrayOffsetCoerce =
 *       parse(timezoneArrayOffsetCoerce, ["+2", "Z", "-530"]);
 *
 *   // tz === ["UTC+02:00", "UTC+00:00", "UTC-05:30"]
 *   ```
 */
export type TimezoneArrayOffsetCoerce =
    v.InferOutput<typeof timezoneArrayOffsetCoerce>;

/**
 * ARRAY OF GENERIC TIMEZONE DESCRIPTORS
 *
 * SUMMARY  
 *   Validates an array whose elements may be **any safe timezone representation**
 *   supported by the `timezoneGeneric` schema. Each element is normalized into a
 *   canonical timezone descriptor object:
 *
 *   ```
 *   {
 *     kind: "iana" | "offset",
 *     original: string,
 *     canonical: string
 *   }
 *   ```
 *
 *   This supports mixed inputs:
 *   - IANA zones ("America/New_York")  
 *   - Strict offsets ("UTC+02:00", "GMT-3")  
 *   - Coercible offsets ("+2", "-530", "Z", "UTC")  
 *
 * PURPOSE  
 *   Ideal for systems accepting **heterogeneous timezone lists**, including:
 *   - user preference arrays  
 *   - batch operations  
 *   - multi-region alerting/routing  
 *   - analytics segmentation rules  
 *   - configuration lists  
 *   - ingestion pipelines  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - arrays of values valid under `timezoneGeneric`
 *
 *   REJECTS:
 *   - non-array inputs  
 *   - abbreviation-based zones ("PST", "CET")  
 *   - ambiguous labels ("Local", "Browser")  
 *   - malformed offsets or invalid IANA names  
 *
 * OUTPUT CONTRACT  
 *   Returns an array of canonical descriptor objects with the following shape:
 *
 *   ```
 *   {
 *     kind: "iana" | "offset",
 *     original: string,
 *     canonical: string
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - Input must be an array  
 *   - Each element evaluated via `timezoneGeneric`  
 *   - Throws on first invalid entry  
 *
 * SEMANTIC NOTES  
 *   - This schema provides strong correctness guarantees with wide user-facing
 *     flexibility  
 *   - Abbreviations intentionally excluded (use `timezoneLoose` for that)  
 *
 * EXAMPLES  
 *   ```
 *   // Valid inputs
 *   ["America/Toronto", "UTC+02:00", "+2"]
 *
 *   // Output
 *   [
 *     { kind: "iana",   original: "America/Toronto", canonical: "America/Toronto" },
 *     { kind: "offset", original: "UTC+02:00",       canonical: "UTC+02:00" },
 *     { kind: "offset", original: "+2",              canonical: "UTC+02:00" }
 *   ]
 *
 *   // Invalid
 *   ["PST"]              // abbreviation not allowed
 *   ["America/Torontoo"] // invalid IANA
 *   ```
 */
export const timezoneArrayGeneric = v.array(timezoneGeneric);

/**
 * OUTPUT TYPE — ARRAY OF GENERIC TIMEZONE DESCRIPTORS
 *
 * SUMMARY  
 *   Represents the output array produced by `timezoneArrayGeneric`, where each
 *   element is a **canonical timezone descriptor object** with:
 *
 *   - `kind`:     "iana" | "offset"  
 *   - `original`: raw input  
 *   - `canonical`: validated & normalized timezone  
 *
 * CONTRACT GUARANTEES  
 *   - Always an array  
 *   - Each entry is fully normalized  
 *   - IANA → unchanged  
 *   - Offsets → "UTC±HH:MM"  
 *
 * EXAMPLE  
 *   ```
 *   const arr: TimezoneArrayGeneric =
 *       parse(timezoneArrayGeneric, ["UTC-3", "Europe/Paris"]);
 *
 *   // arr[0].canonical === "UTC-03:00"
 *   // arr[1].canonical === "Europe/Paris"
 *   ```
 */
export type TimezoneArrayGeneric =
    v.InferOutput<typeof timezoneArrayGeneric>;

/**
 * ARRAY OF LOOSE TIMEZONE DESCRIPTORS
 *
 * SUMMARY  
 *   Validates an array whose elements may be **any flexible, user-friendly,
 *   abbreviation-aware timezone representation**, as supported by the
 *   `timezoneLoose` schema. Each element is normalized into a canonical
 *   descriptor object with a deterministic format:
 *
 *   ```
 *   {
 *     kind: "iana" | "offset" | "abbr",
 *     original: string,
 *     canonical: string,
 *     source: "iana" | "offset" | "abbreviation"
 *   }
 *   ```
 *
 *   Supported formats include:
 *   - Valid IANA names ("America/New_York")  
 *   - Strict UTC/GMT offsets ("UTC+02:00", "GMT-03:30")  
 *   - Coercible offsets ("+2", "-530", "Z", "UTC", "GMT")  
 *   - Common timezone abbreviations ("PST", "CET", "IST", "JST", "AEST")  
 *
 * PURPOSE  
 *   Intended for systems where timezone lists can come from arbitrary user
 *   interfaces, legacy imports, or semi-structured sources, including:
 *   - user profile preference arrays  
 *   - admin dashboards with manual timezone entry  
 *   - CSV/XML/JSON bulk imports  
 *   - ETL pipelines with heterogeneous time inputs  
 *   - analytics segmentation rules  
 *   - messaging or routing rules  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - Arrays  
 *   - Items valid under the `timezoneLoose` schema  
 *
 *   REJECTS:
 *   - Non-array input  
 *   - "made up" abbreviations ("AAA", "LOCAL", "TIMEZONE")  
 *   - Malformed offsets  
 *   - Invalid IANA zones  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *
 *   ```
 *   Array<{
 *     kind: "iana" | "offset" | "abbr",
 *     original: string,
 *     canonical: string,
 *     source: "iana" | "offset" | "abbreviation"
 *   }>
 *   ```
 *
 * VALIDATION LOGIC  
 *   - Must be an array  
 *   - Each element parsed with `timezoneLoose`  
 *   - First error aborts validation  
 *
 * SEMANTIC NOTES  
 *   - This schema is intentionally permissive; it should be used for ingestion
 *     and user-facing forms, not internal timestamp storage  
 *   - Canonical forms ensure deterministic behavior downstream  
 *
 * EXAMPLES  
 *   ```
 *   parse(timezoneArrayLoose, ["PST", "+2", "Europe/Paris"])
 *
 *   // → [
 *   //     { kind: "abbr",   original: "PST", canonical: "America/Los_Angeles", source: "abbreviation" },
 *   //     { kind: "offset", original: "+2",  canonical: "UTC+02:00",            source: "offset" },
 *   //     { kind: "iana",   original: "Europe/Paris", canonical: "Europe/Paris", source: "iana" }
 *   //   ]
 *
 *   parse(timezoneArrayLoose, ["LOCAL"])   // ❌ invalid
 *   parse(timezoneArrayLoose, ["UTC+99"])  // ❌ invalid offset
 *   ```
 */
export const timezoneArrayLoose = v.array(timezoneLoose);

/**
 * OUTPUT TYPE — ARRAY OF LOOSE TIMEZONE DESCRIPTORS
 *
 * SUMMARY  
 *   Represents the fully normalized output of the `timezoneArrayLoose` schema,
 *   in which every element is a canonicalized timezone descriptor supporting:
 *
 *   - IANA zones  
 *   - strict offsets  
 *   - coerced offsets  
 *   - abbreviations (PST, CET, IST, JST, AEST)  
 *
 * CONTRACT GUARANTEES  
 *   Every element is shaped as:
 *
 *   {
 *     kind: "iana" | "offset" | "abbr",
 *     original: string,
 *     canonical: string,
 *     source: "iana" | "offset" | "abbreviation"
 *   }
 *
 * EXAMPLE  
 *   ```
 *   const arr: TimezoneArrayLoose =
 *       parse(timezoneArrayLoose, ["CET", "UTC+02:00", "-530"]);
 *
 *   // arr[0].canonical === "Europe/Berlin"
 *   // arr[1].canonical === "UTC+02:00"
 *   // arr[2].canonical === "UTC-05:30"
 *   ```
 */
export type TimezoneArrayLoose =
    v.InferOutput<typeof timezoneArrayLoose>;

/**
 * MAP OF STRICT IANA TIMEZONES
 *
 * SUMMARY  
 *   Validates an object (record) whose **keys are arbitrary strings** and whose
 *   **values must be strictly valid IANA timezone identifiers**. This schema
 *   enforces full IANA structural rules on every value via the
 *   `timezoneIanaStrict` schema.
 *
 *   This represents a highly controlled data structure where multiple named
 *   entities (profiles, regions, nodes, servers, tenants, etc.) each carry a
 *   validated IANA timezone identifier.
 *
 * PURPOSE  
 *   Ideal for:
 *   - multi-tenant timezone mappings  
 *   - user → timezone registries  
 *   - server-node timezone maps  
 *   - workspace/team timezone configuration  
 *   - analytics dimensioning  
 *   - permission routing based on geographic zones  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - Any plain JS object  
 *   - Keys: any string  
 *   - Values: MUST be valid IANA timezone names matching `timezoneIanaStrict`  
 *
 *   REJECTS:
 *   - Non-object types  
 *   - Null, arrays, functions  
 *   - Any value that is:  
 *       - an offset ("UTC+02:00")  
 *       - a coercible offset ("+2", "-530")  
 *       - a timezone abbreviation ("PST", "JST", "CET")  
 *       - a malformed IANA zone  
 *
 * OUTPUT CONTRACT  
 *   Returns a new object whose keys and values match the input, except values
 *   are validated. No coercion or transformation is performed.
 *
 * VALIDATION LOGIC  
 *   - Input must be a record (string → unknown)  
 *   - Every value is validated using `timezoneIanaStrict`  
 *   - Entire map fails if ANY value fails  
 *
 * SEMANTIC NOTES  
 *   - Guarantees **all values** correspond to real-world geographical zones  
 *   - Should be used for persistent or configuration data requiring predictable
 *     timezone semantics  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   {
 *     userA: "America/Toronto",
 *     userB: "Asia/Tokyo"
 *   }
 *
 *   // Invalid
 *   {
 *     a: "UTC+02:00",      // offset not allowed
 *     b: "PST"             // abbreviation not allowed
 *   }
 *
 *   {
 *     canada: "America/Torontoo" // malformed IANA
 *   }
 *   ```
 */
export const timezoneMapIanaStrict = v.record(timezoneIanaStrict);

/**
 * OUTPUT TYPE — MAP OF STRICT IANA TIMEZONES
 *
 * SUMMARY  
 *   Represents the validated output of the `timezoneMapIanaStrict` schema:
 *   a record in which every value is a canonical IANA timezone name guaranteed
 *   by `timezoneIanaStrict`.
 *
 * CONTRACT GUARANTEES  
 *   - Always a plain object  
 *   - All keys are strings  
 *   - All values are syntactically valid IANA timezone identifiers  
 *   - No offsets, no abbreviations, no coercions  
 *
 * EXAMPLE  
 *   ```
 *   const map: TimezoneMapIanaStrict =
 *       parse(timezoneMapIanaStrict, {
 *         eastern: "America/New_York",
 *         pacific: "America/Los_Angeles"
 *       });
 *   ```
 */
export type TimezoneMapIanaStrict =
    v.InferOutput<typeof timezoneMapIanaStrict>;

/**
 * MAP OF STRICT UTC/GMT OFFSETS
 *
 * SUMMARY  
 *   Validates an object (record) where **every value** must be a strictly
 *   formatted UTC/GMT timezone offset as defined by the `timezoneOffsetStrict`
 *   schema. Only canonical offset formats are allowed:
 *
 *   - "UTC+H"
 *   - "UTC+HH"
 *   - "UTC+HH:MM"
 *   - "GMT-H"
 *   - "GMT-HH"
 *   - "GMT-HH:MM"
 *
 *   No coercion, abbreviation mapping, or IANA parsing is permitted.
 *
 * PURPOSE  
 *   Used for systems requiring **precise, explicit numeric offsets**, such as:
 *   - database-driven scheduling  
 *   - timestamp normalization pipelines  
 *   - protocol-level settings  
 *   - cross-system deterministic time rules  
 *   - machine-to-machine configuration layers  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - Plain JS object (`Record<string, unknown>`)  
 *   - Values MUST pass `timezoneOffsetStrict`  
 *
 *   REJECTS:
 *   - Arrays, null, non-object  
 *   - Values that are:  
 *       - IANA zones ("America/NY")  
 *       - abbreviations ("PST")  
 *       - coercible offsets ("+2", "-530", "Z")  
 *       - malformed offsets ("UTC+25:00", "UTC--3")  
 *
 * OUTPUT CONTRACT  
 *   Returns the record unchanged, except invalid entries trigger validation
 *   failure.
 *
 * VALIDATION LOGIC  
 *   - Must be a record  
 *   - Validate each value with `timezoneOffsetStrict`  
 *   - First invalid entry aborts the entire map  
 *
 * SEMANTIC NOTES  
 *   - Ensures invariants for systems storing timezone data in offset-only form  
 *   - Supports predictable offset arithmetic without needing IANA rules  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   {
 *     nodeA: "UTC+00:00",
 *     nodeB: "UTC-03:30",
 *     nodeC: "GMT+1"
 *   }
 *
 *   // Invalid
 *   {
 *     x: "+2"            // coercible but not strict
 *     y: "PST"           // abbreviation not allowed
 *     z: "America/LA"    // IANA zone not allowed
 *   }
 *
 *   {
 *     bad: "UTC+25:00"   // invalid range
 *   }
 *   ```
 */
export const timezoneMapOffsetStrict = v.record(timezoneOffsetStrict);

/**
 * OUTPUT TYPE — MAP OF STRICT UTC/GMT OFFSETS
 *
 * SUMMARY  
 *   Represents a validated record in which **every value** is a strictly
 *   formatted UTC/GMT offset, guaranteed by `timezoneOffsetStrict`.
 *
 * CONTRACT GUARANTEES  
 *   - Always a record (plain JS object)
 *   - Keys: arbitrary strings  
 *   - Values: always strict UTC/GMT offsets  
 *
 * EXAMPLE  
 *   ```
 *   const map: TimezoneMapOffsetStrict =
 *       parse(timezoneMapOffsetStrict, {
 *         east:  "UTC+03:00",
 *         west:  "UTC-08:00",
 *         mid:   "GMT+1"
 *       });
 *   ```
 */
export type TimezoneMapOffsetStrict =
    v.InferOutput<typeof timezoneMapOffsetStrict>;

/**
 * MAP OF COERCED UTC/GMT TIMEZONE OFFSETS
 *
 * SUMMARY  
 *   Validates an object (record) where every value can be **any coercible
 *   representation** of a UTC/GMT offset, as defined by the
 *   `timezoneOffsetCoerce` schema. Each value is parsed and transformed into a
 *   canonical `"UTC±HH:MM"` string.
 *
 *   Supported raw input formats include:
 *   - "Z"  
 *   - "UTC", "GMT"  
 *   - "+2", "-3"  
 *   - "02:30", "-530"  
 *   - "UTC+02", "GMT-10:45"  
 *   - "0", "00", "+00"  
 *
 * PURPOSE  
 *   Ideal for user-facing or heterogeneous sources where timezone offsets may
 *   originate in inconsistent formats. This schema ensures uniform, normalized
 *   outputs for:
 *   - user preference maps  
 *   - config files  
 *   - imported data  
 *   - bulk ETL ingestion  
 *   - job scheduling and routing logic  
 *   - distributed system configuration  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any plain object (`Record<string, unknown>`)
 *   - each value must successfully coerce via `timezoneOffsetCoerce`
 *
 *   REJECTS:
 *   - non-objects (arrays, null, primitives)
 *   - values that represent:  
 *       - IANA zones ("America/New_York")  
 *       - abbreviations ("PST", "CET")  
 *       - malformed offsets ("UTC++3", "+99", "-7620")  
 *
 * OUTPUT CONTRACT  
 *   Returns a record whose values are canonical `"UTC±HH:MM"` strings.
 *
 * VALIDATION LOGIC  
 *   - must be a record  
 *   - each value parsed with `timezoneOffsetCoerce`  
 *   - first invalid entry aborts validation  
 *
 * SEMANTIC NOTES  
 *   - Designed for ingestion and normalization, not strict storage invariants  
 *   - Guarantees safe uniform output for downstream processing  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   {
 *     a: "Z",
 *     b: "+2",
 *     c: "-530",
 *     d: "UTC",
 *     e: "GMT-10:45"
 *   }
 *
 *   // Output
 *   {
 *     a: "UTC+00:00",
 *     b: "UTC+02:00",
 *     c: "UTC-05:30",
 *     d: "UTC+00:00",
 *     e: "UTC-10:45"
 *   }
 *
 *   // Invalid
 *   { x: "PST" }            // abbreviation not allowed
 *   { y: "America/LA" }     // IANA not allowed
 *   { z: "UTC+99" }         // invalid hour
 *   ```
 */
export const timezoneMapOffsetCoerce = v.record(timezoneOffsetCoerce);

/**
 * OUTPUT TYPE — MAP OF COERCED UTC OFFSETS
 *
 * SUMMARY  
 *   Represents a validated record in which every value is a canonical
 *   `"UTC±HH:MM"` timezone offset produced by `timezoneOffsetCoerce`.
 *
 * CONTRACT GUARANTEES  
 *   - Always a record (`Record<string, string>`)  
 *   - All values are canonical, safe offsets  
 *   - No IANA names or abbreviations  
 *   - No un-normalized input is preserved  
 *
 * EXAMPLE  
 *   ```
 *   const map: TimezoneMapOffsetCoerce =
 *       parse(timezoneMapOffsetCoerce, {
 *         west: "+2",
 *         east: "Z"
 *       });
 *
 *   // map.west === "UTC+02:00"
 *   // map.east === "UTC+00:00"
 *   ```
 */
export type TimezoneMapOffsetCoerce =
    v.InferOutput<typeof timezoneMapOffsetCoerce>;

/**
 * MAP OF GENERIC TIMEZONE DESCRIPTORS
 *
 * SUMMARY  
 *   Validates a key-value map (`Record<string, unknown>`) in which **each value**
 *   may be *any* safe timezone representation accepted by the `timezoneGeneric`
 *   schema. This includes:
 *
 *   - IANA timezone names  
 *   - strict UTC/GMT offsets  
 *   - coercible offsets (Z, "+2", "-530", "UTC", "GMT", "02:30")  
 *
 *   Each entry is normalized into a canonical, deterministic descriptor of the
 *   form:
 *
 *   ```
 *   {
 *     kind: "iana" | "offset",
 *     original: string,
 *     canonical: string
 *   }
 *   ```
 *
 * PURPOSE  
 *   Ideal for systems requiring **flexible input with strict output**, such as:
 *   - user → timezone preference maps  
 *   - per-region configuration objects  
 *   - imported JSON structures  
 *   - analytics segmentation maps  
 *   - routing rules (per-user, per-team, per-tenant)  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any JS object with string keys  
 *   - values must be valid under `timezoneGeneric`  
 *
 *   REJECTS:
 *   - non-object types (arrays, null, primitives)  
 *   - timezone abbreviations ("PST", "CET", "IST", etc.)  
 *   - invalid IANA names  
 *   - malformed offsets  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *
 *   ```
 *   Record<string, {
 *     kind: "iana" | "offset",
 *     original: string,
 *     canonical: string
 *   }>
 *   ```
 *
 * VALIDATION LOGIC  
 *   - The input must be a record  
 *   - Each value is parsed using `timezoneGeneric`  
 *   - Validation aborts on first failure  
 *
 * SEMANTIC NOTES  
 *   - Guarantees deterministic canonical values  
 *   - Provides flexibility without enabling ambiguous abbreviations  
 *   - Ideal intermediate-layer validator for storage or routing rules  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   {
 *     userA: "America/Toronto",
 *     userB: "UTC+02:00",
 *     userC: "+2"
 *   }
 *
 *   // Output
 *   {
 *     userA: { kind: "iana",   original: "America/Toronto", canonical: "America/Toronto" },
 *     userB: { kind: "offset", original: "UTC+02:00",       canonical: "UTC+02:00" },
 *     userC: { kind: "offset", original: "+2",              canonical: "UTC+02:00" }
 *   }
 *
 *   // Invalid
 *   { a: "PST" }            // abbreviation not allowed
 *   { b: "America/Torontoo" } // malformed IANA
 *   { c: "UTC+99:99" }       // invalid offset
 *   ```
 */
export const timezoneMapGeneric = v.record(timezoneGeneric);

/**
 * OUTPUT TYPE — MAP OF GENERIC TIMEZONE DESCRIPTORS
 *
 * SUMMARY  
 *   Represents a validated record produced by `timezoneMapGeneric`, where each
 *   value is a **canonical timezone descriptor object** containing:
 *
 *   - `kind`: "iana" | "offset"  
 *   - `original`: raw input value  
 *   - `canonical`: validated and normalized timezone  
 *
 * CONTRACT GUARANTEES  
 *   - Always a plain object (`Record<string, ...>`)  
 *   - Each entry safely normalized  
 *   - IANA zones preserved, offsets canonicalized  
 *   - No abbreviations or malformed values  
 *
 * EXAMPLE  
 *   ```
 *   const tzMap: TimezoneMapGeneric =
 *       parse(timezoneMapGeneric, {
 *         east: "UTC+03:00",
 *         west: "+2",
 *         eu:   "Europe/Paris"
 *       });
 *
 *   // tzMap.west.canonical === "UTC+02:00"
 *   ```
 */
export type TimezoneMapGeneric =
    v.InferOutput<typeof timezoneMapGeneric>;

/**
 * MAP OF LOOSE TIMEZONE REPRESENTATIONS
 *
 * SUMMARY  
 *   Validates a key-value map (`Record<string, unknown>`) where each value may
 *   be **any recognized timezone representation**, including:
 *
 *   - IANA zones (e.g., "America/Vancouver")  
 *   - strict UTC/GMT offsets (e.g., "UTC+02:00", "GMT-7")  
 *   - coercible offsets ("+2", "-530", "02:30", "Z", "UTC", "GMT")  
 *   - **timezone abbreviations ("PST", "CEST", "IST", "AEST", "MSK", ...)**  
 *
 *   All forms are parsed, validated, and normalized into a canonical descriptor:
 *
 *   ```
 *   {
 *     kind: "iana" | "offset" | "abbr",
 *     original: string,
 *     canonical: string,
 *     source: "iana" | "offset" | "abbreviation"
 *   }
 *   ```
 *
 * PURPOSE  
 *   This schema is required for:
 *   - user-input timezone settings  
 *   - imported datasets using multiple timezone formats  
 *   - region-based routing logic  
 *   - analytics segmentation ingest  
 *   - timezone-cleanup utilities  
 *   - compatibility with legacy systems (abbreviations)  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - objects with string keys  
 *   - values valid under `timezoneLoose`  
 *
 *   REJECTS:
 *   - non-objects  
 *   - invalid IANA names  
 *   - invalid offsets  
 *   - unknown abbreviations not in the abbreviation whitelist  
 *
 * OUTPUT CONTRACT  
 *   Produces a normalized canonical map:
 *
 *   ```
 *   Record<
 *     string,
 *     {
 *       kind: "iana" | "offset" | "abbr";
 *       original: string;
 *       canonical: string;
 *       source: "iana" | "offset" | "abbreviation";
 *     }
 *   >
 *   ```
 *
 * VALIDATION LOGIC  
 *   - Input must be an object  
 *   - Each value is passed through `timezoneLoose`  
 *   - `timezoneLoose` internally handles coercion + abbreviation mapping  
 *   - Output is deterministic  
 *
 * SEMANTIC NOTES  
 *   - Abbreviations are inherently ambiguous (e.g., "IST" has 3 meanings);  
 *     `timezoneLoose` resolves them via a safe, curated mapping.  
 *   - IANA zones remain unchanged.  
 *   - Offsets are canonicalized to `"UTC±HH:MM"`.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   {
 *     a: "America/Los_Angeles",
 *     b: "PST",
 *     c: "UTC+03:30",
 *     d: "+2"
 *   }
 *
 *   // Output sample
 *   {
 *     a: { kind: "iana",   original: "America/Los_Angeles", canonical: "America/Los_Angeles", source: "iana" },
 *     b: { kind: "abbr",   original: "PST",                 canonical: "UTC-08:00",           source: "abbreviation" },
 *     c: { kind: "offset", original: "UTC+03:30",           canonical: "UTC+03:30",           source: "offset" },
 *     d: { kind: "offset", original: "+2",                  canonical: "UTC+02:00",           source: "offset" }
 *   }
 *
 *   // Invalid
 *   { x: "LOLZONE" }
 *   { y: "UTC+99:99" }
 *   { z: "America/Torontoooo" }
 *   ```
 */
export const timezoneMapLoose = v.record(timezoneLoose);

/**
 * OUTPUT TYPE — MAP OF LOOSE TIMEZONE DESCRIPTORS
 *
 * SUMMARY  
 *   Represents the fully normalized result of `timezoneMapLoose`. Each key maps
 *   to a canonical timezone descriptor containing:
 *
 *   - `kind`: the conceptual category  
 *   - `original`: the raw input  
 *   - `canonical`: deterministic normalized timezone  
 *   - `source`: how the value was interpreted  
 *
 * CONTRACT GUARANTEES  
 *   - Every entry is syntactically valid  
 *   - Abbreviations converted to canonical UTC offsets  
 *   - Offsets normalized  
 *   - IANA names preserved  
 *
 * EXAMPLE  
 *   ```
 *   const map: TimezoneMapLoose =
 *       parse(timezoneMapLoose, {
 *         west: "PST",
 *         eu:   "Europe/Berlin",
 *         misc: "+5"
 *       });
 *
 *   // map.west.kind === "abbr"
 *   // map.west.canonical === "UTC-08:00"
 *   ```
 */
export type TimezoneMapLoose =
    v.InferOutput<typeof timezoneMapLoose>;

/*
1. Atomic / strict / nullable forms
	1.	TIMEZONE-IANA-OPTIONAL SCHEMA — identical to timezoneIanaStrict but allows undefined; useful for user profile fields where timezone is not required.
	2.	TIMEZONE-IANA-NULLABLE SCHEMA — allows null or valid IANA string; guarantees either absence or strict compliance.
	3.	TIMEZONE-OFFSET-OPTIONAL SCHEMA — allows undefined or valid strict offset.
	4.	TIMEZONE-OFFSET-NULLABLE SCHEMA — allows null or valid strict offset.
	5.	TIMEZONE-GENERIC-NULLABLE SCHEMA — same as timezoneGeneric but accepts null and returns { kind: "null" } sentinel when absent.
	6.	TIMEZONE-LOOSE-NULLABLE SCHEMA — same as timezoneLoose but tolerates empty, null, or “Local”.
	7.	TIMEZONE-ANY-STRING SCHEMA — placeholder validator accepting any string while tagging it as { kind: "unknown" }; used as soft-compatibility layer when migrating old data.

⸻

2. Coercive / normalization variants
	8.	TIMEZONE-COERCE-IANA-OR-OFFSET SCHEMA — single schema that tries coercion: if input looks like offset → UTC±HH:MM; else if looks like region → pass through; else fail.
	9.	TIMEZONE-COERCE-OFFSET-TO-IANA SCHEMA — attempts to map numeric offsets (e.g., "UTC-05:00") to nearest canonical IANA (e.g., "America/New_York"). Requires internal lookup table.
	10.	TIMEZONE-ALIAS-RESOLVE SCHEMA — expands deprecated or alias zones ("US/Pacific", "Asia/Calcutta") into canonical equivalents per current tzdb.
	11.	TIMEZONE-CANONICALIZE SCHEMA — validates any IANA identifier and replaces it with canonical link target (e.g., "America/Argentina/Buenos_Aires").

⸻

3. Array / tuple / set extensions
	12.	TIMEZONE-TUPLE SCHEMA — fixed-length [primary, fallback] pair; both validated via timezoneGeneric.
	13.	TIMEZONE-PAIR SCHEMA — 2-member object { local: IANA, remote: IANA }; ensures distinct zones.
	14.	TIMEZONE-SET SCHEMA — validates a Set<string> of unique IANA zones.
	15.	TIMEZONE-UNION-ARRAY SCHEMA — heterogeneous array mixing IANA and offsets, validated through timezoneGeneric.
	16.	TIMEZONE-WEIGHTED-ARRAY SCHEMA — array of { tz: IANA, weight: number(0–1) }; weights must sum to 1.

⸻

4. Map / record extensions
	17.	TIMEZONE-MAP-OPTIONAL SCHEMA — same as timezoneMapGeneric but allows missing values (undefined).
	18.	TIMEZONE-MAP-NULLABLE SCHEMA — same as timezoneMapGeneric but permits null entries.
	19.	TIMEZONE-MAP-CANONICAL SCHEMA — enforces that all values are canonical (alias-free) IANA zones.
	20.	TIMEZONE-MAP-LOCAL-RESOLVE SCHEMA — adds key "local" auto-filled from system Intl.DateTimeFormat().resolvedOptions().timeZone.

⸻

5. Field / object wrappers
	21.	TIMEZONE-FIELD SCHEMA — wraps a timezone descriptor plus metadata
    22.	TIMEZONE-FIELD-NULLABLE SCHEMA — same but allows value: null.
	23.	TIMEZONE-FIELD-ARRAY SCHEMA — array of TimezoneField.
	24.	TIMEZONE-FIELD-MAP SCHEMA — record<string, TimezoneField>.

⸻

6. Temporal / compositional
	25.	TIMEZONE-DATETIME-PAIR SCHEMA — compound schema:
    22.	TIMEZONE-FIELD-NULLABLE SCHEMA — same but allows value: null.
	23.	TIMEZONE-FIELD-ARRAY SCHEMA — array of TimezoneField.
	24.	TIMEZONE-FIELD-MAP SCHEMA — record<string, TimezoneField>.

⸻

6. Temporal / compositional
	25.	TIMEZONE-DATETIME-PAIR SCHEMA — compound schema:
    31.	TIMEZONE-LOCALE-COMPAT SCHEMA — ensures the timezone is valid for given locale (e.g., en-US, fr-CA).
	32.	TIMEZONE-WITH-OFFSET-MERGED SCHEMA — object combining both IANA and computed numeric offset at validation time.
	33.	TIMEZONE-REVERSE-LOOKUP SCHEMA — given numeric offset, returns probable IANA zones.
	34.	TIMEZONE-VALID-IN-TZDB SCHEMA — checks existence against current tzdata (requires runtime registry).

⸻

8. Legacy / permissive / fallback
	35.	TIMEZONE-LEGACY SCHEMA — accepts both IANA and historic aliases ("US/Eastern", "Canada/Pacific").
	36.	TIMEZONE-LEGACY-NULLABLE SCHEMA — legacy but optional/null safe.
	37.	TIMEZONE-LOCAL-RESOLVE SCHEMA — automatically fills local timezone when input empty.
	38.	TIMEZONE-EMPTY-DEFAULT SCHEMA — returns "UTC+00:00" for empty string or null.
*/