import * as v from "valibot";

/**
 * SHARED VERSION-SCHEMA ERROR MESSAGE CONSTANTS
 * 
 * SUMMARY  
 *   Centralized collection of explicit, human-readable error messages used by
 *   all version-related schemas. This object defines the authoritative wording
 *   for every validation failure emitted by version validators, ensuring
 *   consistency, predictability, and uniform semantics across the entire
 *   version module.
 *
 * PURPOSE  
 *   Provides a single, maintainable source of truth for all version-validation
 *   error strings, enabling:
 *   - consistent error messages across multiple schemas  
 *   - simplified updates to validation wording  
 *   - a stable contract for API consumers, logging systems, and UIs  
 *   - strict decoupling of validation logic from error text  
 *
 * INPUT CONTRACT  
 *   - This object is internal; it is not user-supplied.  
 *   - Keys correspond directly to version schema identifiers:
 *       versionLoose, versionStrict, versionDate, versionBuild, versionPrefix,
 *       versionCoerce, versionAny, versionArray, versionMap, versionField.
 *   - Values must be human-readable error strings describing validation
 *     failures with clarity and precision.
 *
 * OUTPUT CONTRACT  
 *   - Error strings are emitted verbatim by version schemas.  
 *   - No transformation, formatting, or localization is performed internally.  
 *   - Downstream consumers (UIs, APIs, logs) may wrap or map messages as
 *     needed.
 *
 * VALIDATION RULES  
 *   - Each key must correspond to a real schema.  
 *   - Error messages must remain concise yet explicit.  
 *   - Messages must not mention semantic versioning (x.y.z) except
 *     where explicitly relevant (e.g., versionStrict rejects semver).  
 *   - Messages must accurately reflect the rejection criteria of each schema.  
 *
 * SEMANTIC NOTES  
 *   Because versioning in enterprise systems often follows non-SemVer patterns
 *   (date-based versions, build identifiers, prefixes, revision counters, etc.),
 *   these error messages intentionally avoid SemVer terminology and instead
 *   describe domain-specific validation expectations.
 *
 *   The error map ensures stable semantics across:
 *   - ingestion pipelines  
 *   - configuration loaders  
 *   - versioned metadata systems  
 *   - internal tooling and CI/CD validators  
 *
 * EXAMPLES  
 *   ```
 *   // versionStrict schema failure:
 *   parse(versionStrict, "1.0.0");
 *   // → "Version must be in major.minor format (e.g., 1.0). Semantic versioning is not permitted."
 *
 *   // versionPrefix schema failure:
 *   parse(versionPrefix, "ver-1");
 *   // → "Invalid prefix-style version format."
 *
 *   // versionCoerce schema failure:
 *   parse(versionCoerce, 123);
 *   // → "Unable to coerce version into canonical format."
 *
 *   // versionField schema failure:
 *   parse(createVersionField("App version"), { description: 123, value: "v1" });
 *   // → "Version field must be an object containing { description, value }."
 *   ```
 */
const ERROR_MESSAGES = {
    versionLoose: "Invalid non-semver version format.",
    versionStrict:
        "Version must be in major.minor format (e.g., 1.0). Semantic versioning is not permitted.",
    versionDate: "Invalid date-style version format.",
    versionBuild: "Invalid build-style version format.",
    versionPrefix: "Invalid prefix-style version format.",
    versionCoerce: "Unable to coerce version into canonical format.",
    versionAny: "Invalid version format.",
    versionArray: "Version array is invalid.",
    versionMap: "Version map is invalid.",
    versionField:
        "Version field must be an object containing { description, value }.",
};

/**
 * VERSION-STRICT PATTERN
 *
 * SUMMARY  
 *   A precise regular expression that validates **strict, non-semver version
 *   identifiers** in the form `major.minor`, where both segments are
 *   non-negative integers without semantic versioning’s patch component.
 *   This pattern enforces a minimal but controlled two-part versioning scheme.
 *
 * PURPOSE  
 *   Ensures that version identifiers adhere to a predictable, stable,
 *   **major.minor-only** format used in enterprise systems, controlled release
 *   trains, firmware, internal toolchains, and environments where semantic
 *   versioning (x.y.z) is intentionally prohibited.
 *
 * INPUT CONTRACT  
 *   - Accepts only strings in the format:
 *       `<integer>.<integer>`
 *     where each integer is:
 *       - "0", or  
 *       - a non-zero digit followed by zero or more digits  
 *
 *   - Rejects:
 *       - semantic versions (e.g., "1.0.0")  
 *       - prefixed versions ("v1.0")  
 *       - build metadata or prerelease tags ("1.0-beta", "1.2+build")  
 *       - negative numbers  
 *       - non-numeric characters  
 *
 * OUTPUT CONTRACT  
 *   - Performs **match-only** validation.
 *   - Does not transform or normalize the input.
 *   - Guarantees that any match is a valid `major.minor` pair.
 *
 * VALIDATION RULES  
 *   - Major segment: `0` or `[1-9][0-9]*`
 *   - Minor segment: same numeric rule as major
 *   - Must contain **exactly one** dot (`.`)
 *   - No leading zeros permitted except for the literal `"0"`
 *   - No additional segments allowed
 *
 * SEMANTIC NOTES  
 *   This pattern is ideal for:
 *   - controlled release milestones  
 *   - internal versioning for hardware/firmware  
 *   - documentation versions where patch granularity is irrelevant  
 *   - systems that want simplicity and clear ordering without semver semantics  
 *
 *   By prohibiting semantic versioning, strict versions avoid the complexity of
 *   patch-level changes, prereleases, and build metadata.
 *
 * EXAMPLES  
 *   ```
 *   // VALID
 *   "1.0"
 *   "0.1"
 *   "10.5"
 *
 *   // INVALID
 *   "1"         // missing minor
 *   "1.0.0"     // semver, third segment not allowed
 *   "01.5"      // leading zero
 *   "1.-1"      // invalid integer
 *   "v1.0"      // prefix not allowed
 *   "1.0-beta"  // prerelease not allowed
 *   ```
 */
const VERSION_STRICT_PATTERN: RegExp =
    /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;

/**
 * VERSION-DATE PATTERN
 *
 * SUMMARY  
 *   A strict regular expression that validates **date-style version identifiers**
 *   commonly used in enterprise release systems, audit pipelines, data
 *   snapshots, regulatory-versioned documents, and time-based rollouts.  
 *   Supported formats are:
 *   - `YYYY`  
 *   - `YYYY.MM`  
 *   - `YYYY.MM.DD`  
 *
 * PURPOSE  
 *   Ensures that version identifiers follow a predictable, chronological,
 *   **year-first** structure. Date-based versioning is widely used in systems
 *   that require natural ordering, compliance traceability, or alignment with
 *   calendar cycles (e.g., 2024.11.07 for a November 7, 2024 release).
 *
 * INPUT CONTRACT  
 *   - The value must match one of the following:
 *       - A four-digit year: `2024`  
 *       - A year + month:   `2024.11`  
 *       - A full date:      `2024.11.07`  
 *
 *   - All fields must be exactly two digits for month/day components.  
 *   - Rejects:
 *       - invalid month/day values (regex does not validate ranges)  
 *       - shortened or expanded forms (`2024.1`, `2024.011`)  
 *       - semantic versions (`1.0.0`)  
 *       - prefixed formats (`v2024.11`)  
 *
 * OUTPUT CONTRACT  
 *   - Performs **syntactic validation only**.  
 *   - Does not normalize, reformat, or infer missing fields.  
 *   - Accepts mixed-purpose or domain-specific date versions *as long as the
 *     structure is correct*.
 *
 * VALIDATION RULES  
 *   - Must begin with a 4-digit year: `\d{4}`  
 *   - Optional month: `\.\d{2}`  
 *   - Optional day:   `\.\d{2}`  
 *   - If day is present, month **must** be present.  
 *   - No additional segments allowed.  
 *
 * SEMANTIC NOTES  
 *   This versioning style is ideal for:
 *   - release trains tied to calendar cycles  
 *   - nightly builds or snapshot artifacts  
 *   - compliance datasets requiring date stamping  
 *   - documentation revisions aligned with publishing dates  
 *   - machine-learning pipeline versions with daily iteration cadence  
 *
 *   It is intentionally **not** semantic versioning, and its chronological
 *   ordering may be lexicographically sorted with no semantic interpretation.
 *
 * EXAMPLES  
 *   ```
 *   // VALID
 *   "2024"
 *   "2024.11"
 *   "2024.11.07"
 *
 *   // INVALID
 *   "24.11.07"     // year must be four digits
 *   "2024.1"       // month must be two digits
 *   "2024.011"     // invalid segment length
 *   "2024.11.7"    // day must be two digits
 *   "2024.11.07.01"// extra segment not allowed
 *   ```
 */
const VERSION_DATE_PATTERN: RegExp =
    /^(?:\d{4})(?:\.\d{2})?(?:\.\d{2})?$/;

/**
 * VERSION-BUILD PATTERN
 *
 * SUMMARY  
 *   A strict regular expression that validates **build-style version
 *   identifiers**, commonly used in CI/CD pipelines, nightly build systems,
 *   firmware incrementing, and internal engineering workflows. Supported
 *   identifiers include:
 *
 *   - `build123`, `build-123`, `build.123`
 *   - `b7`, `b108`
 *   - `r12`, `r2048`
 *
 * PURPOSE  
 *   Enables precise validation of incrementing, system-generated version numbers
 *   used in:
 *   - automated build systems  
 *   - revision counters  
 *   - internal release pipeline stages  
 *   - engineering tools that increment versions per build artifact  
 *
 *   This pattern ensures that build identifiers maintain predictable structure
 *   and remain free of semantic versioning or date-version interference.
 *
 * INPUT CONTRACT  
 *   - Accepts only the following forms:
 *       - `"build"`, optionally followed by `-` or `.`, followed by digits  
 *       - `"b"` followed by digits  
 *       - `"r"` followed by digits  
 *
 *   - Case-insensitive (`/i` flag).  
 *
 *   - Rejects:
 *       - prefixed semantic versions (`v1.0.0`)  
 *       - prefixed date versions (`rev-2024.11`)  
 *       - multi-segment build IDs (`build-1.2`)  
 *       - identifiers without numeric components (`build-`)  
 *
 * OUTPUT CONTRACT  
 *   - Performs **pure syntactic validation**.  
 *   - Does not normalize, lowercase, or transform the value.  
 *   - Any matching string is guaranteed to be a valid build-style version ID.  
 *
 * VALIDATION RULES  
 *   - `build[-.]?\d+` matches long-form build identifiers.  
 *   - `b\d+` matches short-form build identifiers.  
 *   - `r\d+` matches revision-style identifiers.  
 *   - Only digits are permitted after the prefix.  
 *   - No additional segments or modifiers are allowed.  
 *
 * SEMANTIC NOTES  
 *   Build-style identifiers are ideal for:
 *   - non-semver environments with continuous deployment  
 *   - firmware or embedded releases using revision counters  
 *   - nightly CI artifact versioning  
 *   - internal deployment workflows where human-readable versions are
 *     unnecessary  
 *
 *   They provide a monotonic sequence without semver’s complexity or
 *   chronological associations found in date versions.
 *
 * EXAMPLES  
 *   ```
 *   // VALID
 *   "build108"
 *   "build-108"
 *   "build.108"
 *   "b7"
 *   "r12"
 *
 *   // INVALID
 *   "build-"       // missing number
 *   "build-1.2"    // multiple numeric segments
 *   "rev-3"        // prefix not part of build-only patterns
 *   "build123beta" // trailing text not allowed
 *   ```
 */
const VERSION_BUILD_PATTERN: RegExp =
    /^(?:build[-.]?\d+|b\d+|r\d+)$/i;

/**
 * VERSION-PREFIX PATTERN
 *
 * SUMMARY  
 *   A strict, case-insensitive regular expression that validates **prefix-style
 *   version identifiers**, which are commonly used in domain-specific,
 *   hardware-oriented, or legacy enterprise software systems. Supported
 *   patterns include:
 *
 *   - `v<digits>`          → version-line identifiers (e.g., `v2`, `v10`)  
 *   - `rev<sep><digits>`   → revision counters (e.g., `rev3`, `rev-3`, `rev.3`)  
 *   - `release<sep><digits>` → release counters (e.g., `release-10`)  
 *
 * PURPOSE  
 *   Prefix-based versioning is often used to clearly indicate the *type* of
 *   version being referenced—such as “revision”, “release line”, or
 *   “major version identifier.” This pattern ensures that all prefix variants
 *   follow a predictable, controlled structure free of semantic versioning
 *   semantics or extraneous formatting.
 *
 * INPUT CONTRACT  
 *   - Accepts strings matching one of the following forms:
 *       - `"v"` followed directly by digits  
 *       - `"rev"`, optionally followed by `-` or `.`, followed by digits  
 *       - `"release"`, optionally followed by `-` or `.`, followed by digits  
 *
 *   - Case-insensitive (`/i` flag).  
 *
 *   - Rejects:
 *       - prefixed semantic versions (`v1.0.0`)  
 *       - prefixed date versions (`v2024.11.07`)  
 *       - prefix forms without digits (`v`, `rev-`, `release.`)  
 *       - multi-segment identifiers (`rev-1.2`)  
 *
 * OUTPUT CONTRACT  
 *   - Performs **match-only** syntactic validation.  
 *   - Does not transform, lowercase, normalize, or apply coercion.  
 *   - Any match is guaranteed to be a syntactically correct prefix-based
 *     version identifier.
 *
 * VALIDATION RULES  
 *   - `v\d+` matches version-line identifiers.  
 *   - `rev[-.]?\d+` matches revision identifiers with optional separators.  
 *   - `release[-.]?\d+` matches release identifiers with optional separators.  
 *   - Digits must be contiguous, with no fractional or dot-segment extensions.  
 *
 * SEMANTIC NOTES  
 *   Prefix-style versions are commonly used for:
 *   - product major version lines (`v2`, `v3`)  
 *   - hardware or firmware revision levels (`rev-10`)  
 *   - release train counters (`release-5`)  
 *
 *   These identifiers are often meaningful to humans and easily distinguishable
 *   from date or build-style versions. They provide concept-level semantics
 *   rather than chronological or incremental ones.
 *
 * EXAMPLES  
 *   ```
 *   // VALID
 *   "v1"
 *   "v20"
 *   "rev-3"
 *   "rev3"
 *   "rev.12"
 *   "release-10"
 *   "RELEASE.7"      // case-insensitive
 *
 *   // INVALID
 *   "v1.0"           // semantic-like, extra segment
 *   "rev-1.2"        // multiple numeric segments not allowed
 *   "release"        // missing digits
 *   "ver-1"          // unsupported prefix
 *   "v"              // incomplete version
 *   "release-10-beta"// trailing text not allowed
 *   ```
 */
const VERSION_PREFIX_PATTERN: RegExp =
    /^(?:v\d+|rev[-.]?\d+|release[-.]?\d+)$/i;

/**
 * VERSION-LOOSE PATTERN
 *
 * SUMMARY  
 *   A comprehensive, case-insensitive regular expression that validates a broad
 *   spectrum of **non-semver version identifiers**, supporting multiple
 *   real-world versioning styles used across enterprise systems, legacy
 *   applications, CI pipelines, hardware/firmware workflows, and date-like
 *   versioning conventions.  
 *
 *   This pattern recognizes all of the following formats:
 *   - Numeric versions:          `1`, `42`, `2024`, `2024.11`, `2024.11.07`  
 *   - Major-minor numeric:       `1.0`, `2.5`, `10.3`  
 *   - Short numeric expansions:  `123.4.56` (two-digit day-style)  
 *   - Prefix versions:           `v2`, `rev-3`, `release.10`  
 *   - Build/revision versions:   `r12`, `b7`, `build-108`  
 *
 * PURPOSE  
 *   Enables validation of version identifiers originating from heterogeneous
 *   or legacy systems where semantic versioning (`x.y.z`) is **not** used.  
 *   This includes:
 *   - government or compliance datasets  
 *   - data warehouse snapshot identifiers  
 *   - CI build revision identifiers  
 *   - embedded/hardware revisioning  
 *   - prefix-based product version lines  
 *   - year-based or date-based release systems  
 *
 *   The intent is to permit a wide but controlled set of patterns while
 *   explicitly **excluding semantic versioning** and malformed multi-part
 *   versions.
 *
 * INPUT CONTRACT  
 *   - Accepts values that match one of the following categories:
 *       1. Numeric:  
 *          `\d{1,4}` — year-like or integer versions  
 *       2. Numeric with month:  
 *          `\d{1,4}\.\d{1,2}`  
 *       3. Numeric with month + day (two-digit day):  
 *          `\d{1,4}\.\d{1,2}\.\d{2}`  
 *       4. Prefix versions:  
 *          `v\d+`, `rev[-.]?\d+`, `release[-.]?\d+`  
 *       5. Build/revision versions:  
 *          `r\d+`, `b\d+`, `build[-.]?\d+`  
 *
 *   - Rejects:
 *       - semantic versions (`1.0.0`, `2.3.1`)  
 *       - more than three numeric segments  
 *       - trailing metadata (`1.0-beta`, `2024.11.07+exp`)  
 *       - malformed or non-digit segments  
 *
 * OUTPUT CONTRACT  
 *   - Performs **syntactic validation only**.  
 *   - Does not coerce, trim, lowercase, or normalize values.  
 *   - Any matched value is guaranteed to be a valid loose-style version.
 *
 * VALIDATION RULES  
 *   - Numeric root must be 1–4 digits.  
 *   - Middle segment (if present) is 1–2 digits.  
 *   - Final segment (if present) is 2 digits for consistency with date-like day
 *     formats.  
 *   - Prefix variants must have at least one digit.  
 *   - Build identifiers must not include multi-part segments.  
 *
 * SEMANTIC NOTES  
 *   Loose versions are appropriate when:
 *   - semantic precision is unnecessary or undesirable  
 *   - systems inherit legacy version naming  
 *   - date-like versions must be permitted  
 *   - cross-team version conventions vary widely  
 *
 *   This pattern intentionally **does not decode semantics**—it validates
 *   structure only, leaving interpretation to higher-level logic.
 *
 * EXAMPLES  
 *   ```
 *   // VALID
 *   "1"
 *   "2024"
 *   "2024.11"
 *   "2024.11.07"
 *   "1.5"
 *   "123.4.56"
 *   "v3"
 *   "rev-2"
 *   "release.10"
 *   "r12"
 *   "b7"
 *   "build-108"
 *
 *   // INVALID
 *   "1.0.0"         // semantic versioning not allowed
 *   "2024.11.7"     // day must be two digits
 *   "rev"           // missing numeric component
 *   "build-"        // incomplete build identifier
 *   "v1.2"          // semver-like prefix not allowed
 *   "2024.11.07.10" // too many segments
 *   "abc"           // not numeric or prefixed
 *   ```
 */
const VERSION_LOOSE_PATTERN: RegExp =
    /^(?:\d{1,4}(?:\.\d{1,2}(?:\.\d{2})?)?|v\d+|rev[-.]?\d+|release[-.]?\d+|r\d+|b\d+|build[-.]?\d+)$/i;

/**
 * VERSION-LOOSE SCHEMA
 *
 * SUMMARY  
 *   Validates a broad range of non-semver version formats including:
 *   - integer versions ("1", "42")
 *   - major.minor versions ("1.0", "2.3")
 *   - date-like versions ("2024", "2024.11", "2024.11.07")
 *   - prefixed versions ("v2", "rev-3", "release-10")
 *   - build identifiers ("build-108", "r12")
 *
 * PURPOSE  
 *   Ensures compatibility with legacy, enterprise, CI/CD, and domain-specific
 *   versioning systems that intentionally do not follow semantic versioning.
 *
 * INPUT CONTRACT  
 *   - Accepts strings matching recognized non-SemVer patterns.
 *   - Rejects semantic versions (x.y.z), alphanumeric hybrids, invalid dates,
 *     or malformed tokens.
 *
 * OUTPUT CONTRACT  
 *   - Returns the input string unchanged.
 *   - Guarantees the output conforms to known non-SemVer structures.
 *
 * VALIDATION RULES  
 *   - Must match `VERSION_LOOSE_PATTERN`.
 *   - No trimming, coercion, or lowercase normalization is applied here.
 *
 * SEMANTIC NOTES  
 *   Useful for:
 *   - enterprise systems that use date-driven release cycles
 *   - revision counters
 *   - prefixed domain-specific version identifiers
 *
 * EXAMPLES  
 *   ```
 *   "1"          // valid
 *   "1.5"        // valid
 *   "2024.11"    // valid
 *   "v2"         // valid
 *   "build-108"  // valid
 *
 *   "1.0.0"      // invalid (semantic versioning)
 *   "v1.2.3"     // invalid (semantic-version-like)
 *   "abc"        // invalid
 *   ```
 */
const versionLoose = v.regex(
    VERSION_LOOSE_PATTERN,
    ERROR_MESSAGES.versionLoose
);

/**
 * VERSION-STRICT SCHEMA
 *
 * SUMMARY  
 *   Validates version identifiers strictly in major.minor format
 *   such as:
 *   - "1.0"
 *   - "2.5"
 *   - "10.3"
 *
 * PURPOSE  
 *   Represents a simple and controlled version format commonly used in
 *   enterprise systems, internal software, and release trains where full
 *   semantic versioning is unnecessary or undesirable.
 *
 * INPUT CONTRACT  
 *   - Must be a string.
 *   - Must match the pattern: `^[0-9]+.[0-9]+$`
 *   - Must *not* contain patch segments or semantic information.
 *
 * OUTPUT CONTRACT  
 *   - Returns the input string unchanged.
 *   - Ensures output is always major.minor and never semver.
 *
 * VALIDATION RULES  
 *   - Must match `VERSION_STRICT_PATTERN`.
 *
 * SEMANTIC NOTES  
 *   Suitable for:
 *   - controlled release milestones
 *   - milestones in hardware, firmware, and LoB software
 *   - environments where patch versioning is irrelevant
 *
 * EXAMPLES  
 *   ```
 *   "1.0"   // valid
 *   "2.3"   // valid
 *
 *   "1"       // invalid
 *   "1.0.0"   // invalid (semantic versioning)
 *   "v1.0"    // invalid (prefixed)
 *   ```
 */
const versionStrict = v.regex(
    VERSION_STRICT_PATTERN,
    ERROR_MESSAGES.versionStrict
);

/**
 * VERSION-DATE SCHEMA
 *
 * SUMMARY  
 *   Validates date-style versions including:
 *   - "2024"
 *   - "2024.11"
 *   - "2024.11.07"
 *
 * PURPOSE  
 *   Supports release formats based on date sequences, common in enterprise
 *   reporting, archival pipelines, and versioned dataset snapshots.
 *
 * INPUT CONTRACT  
 *   - Must be a 4-digit year optionally followed by `.MM` or `.MM.DD`.
 *
 * OUTPUT CONTRACT  
 *   - Returns the input unchanged.
 *
 * VALIDATION RULES  
 *   - Must match `VERSION_DATE_PATTERN`.
 *
 * SEMANTIC NOTES  
 *   - Useful for timestamp-derived release identifiers
 *
 * EXAMPLES  
 *   ```
 *   "2024"          // valid
 *   "2024.11"       // valid
 *   "2024.11.07"    // valid
 *
 *   "24.11.07"      // invalid
 *   "2024.13"       // invalid
 *   ```
 */
const versionDate = v.regex(
    VERSION_DATE_PATTERN,
    ERROR_MESSAGES.versionDate
);

/**
 * VERSION-BUILD SCHEMA
 *
 * SUMMARY  
 *   Validates build-style version identifiers including:
 *   - "build-108"
 *   - "b7"
 *   - "r12"
 *
 * PURPOSE  
 *   Represents CI-driven or revision-based identifiers commonly used in
 *   development pipelines and automated build systems.
 *
 * INPUT CONTRACT  
 *   - Must match recognized build or revision prefixes.
 *
 * OUTPUT CONTRACT  
 *   - Returns the input unchanged.
 *
 * VALIDATION RULES  
 *   - Must match `VERSION_BUILD_PATTERN`.
 *
 * SEMANTIC NOTES  
 *   - Frequently paired with automated build systems, CI services, or firmware.
 *
 * EXAMPLES  
 *   ```
 *   "build-108"   // valid
 *   "b7"          // valid
 *   "r12"         // valid
 *
 *   "build-abc"   // invalid
 *   "b"           // invalid
 *   ```
 */
const versionBuild = v.regex(
    VERSION_BUILD_PATTERN,
    ERROR_MESSAGES.versionBuild
);

/**
 * VERSION-PREFIX SCHEMA
 *
 * SUMMARY  
 *   Validates prefixed version identifiers such as:
 *   - "v2"
 *   - "rev-3"
 *   - "release-10"
 *
 * PURPOSE  
 *   Used in domain models or systems where the prefix communicates the context
 *   of the version (e.g., "rev" for hardware revisions).
 *
 * INPUT CONTRACT  
 *   - Must match recognized prefix patterns.
 *
 * OUTPUT CONTRACT  
 *   - Returns the input unchanged.
 *
 * VALIDATION RULES  
 *   - Must match `VERSION_PREFIX_PATTERN`.
 *
 * SEMANTIC NOTES  
 *   Good for expressing meaning directly in version identifiers.
 *
 * EXAMPLES  
 *   ```
 *   "v1"          // valid
 *   "rev-3"       // valid
 *   "release-10"  // valid
 *
 *   "ver1"        // invalid
 *   "rev-"        // invalid
 *   ```
 */
const versionPrefix = v.regex(
    VERSION_PREFIX_PATTERN,
    ERROR_MESSAGES.versionPrefix
);

/**
 * VERSION-COERCE SCHEMA
 *
 * SUMMARY  
 *   Trims and lowercases version identifiers before validating them through
 *   `versionLoose`. Converts inconsistent user input into normalized, canonical
 *   representations.
 *
 * PURPOSE  
 *   Ensures consistent formatting of version identifiers across the system,
 *   especially when received from external or unreliable sources.
 *
 * INPUT CONTRACT  
 *   - Must be a string.
 *   - May contain surrounding whitespace or uppercase characters.
 *
 * OUTPUT CONTRACT  
 *   - Returns a lowercase, trimmed version string.
 *   - Ensures the returned value is valid under `versionLoose`.
 *
 * VALIDATION RULES  
 *   - Trims input
 *   - Converts to lowercase
 *   - Must match `VERSION_LOOSE_PATTERN`
 *
 * SEMANTIC NOTES  
 *   Useful for:
 *   - ingestion pipelines  
 *   - user-entered configurations  
 *   - external API inputs  
 *
 * EXAMPLES  
 *   ```
 *   "  V2  "       → "v2"
 *   " BUILD-108 "  → "build-108"
 *
 *   "1.0.0"        // invalid
 *   "   ???   "    // invalid
 *   ```
 */
const versionCoerce = v.coerce(
    v.string(ERROR_MESSAGES.versionCoerce),
    (input: any) => {
        if (typeof input !== "string") {
            throw new Error(ERROR_MESSAGES.versionCoerce);
        }
        const s = input.trim().toLowerCase();

        if (VERSION_LOOSE_PATTERN.test(s)) return s;

        throw new Error(ERROR_MESSAGES.versionLoose);
    }
);

/**
 * VERSION-ANY SCHEMA
 *
 * SUMMARY  
 *   Validates any recognized non-SemVer version format while explicitly
 *   rejecting semantic versioning patterns (major.minor.patch).
 *
 * PURPOSE  
 *   Offers a single unified validator for all acceptable non-SemVer formats.
 *
 * INPUT CONTRACT  
 *   - Must be a string.
 *   - Must *not* match semantic versioning patterns.
 *   - Must match `VERSION_LOOSE_PATTERN`.
 *
 * OUTPUT CONTRACT  
 *   - Returns the input string unchanged.
 *
 * VALIDATION RULES  
 *   - Reject semantic versioning via negative lookahead.
 *   - Validate using `versionLoose` rule set.
 *
 * SEMANTIC NOTES  
 *   Preferred for systems where semver usage is prohibited.
 *
 * EXAMPLES  
 *   ```
 *   "1"         // valid
 *   "1.0"       // valid
 *   "v2"        // valid
 *
 *   "1.0.0"     // invalid (semantic version)
 *   "2.3.1"     // invalid
 *   ```
 */
const versionAny = v.string(ERROR_MESSAGES.versionAny).pipe(
    v.regex(/^(?!\d+\.\d+\.\d+)/, ERROR_MESSAGES.versionAny),
    v.regex(VERSION_LOOSE_PATTERN, ERROR_MESSAGES.versionLoose)
);

/**
 * VERSION-ARRAY SCHEMA
 *
 * SUMMARY  
 *   Validates arrays of version identifiers, ensuring each element is coerced
 *   and normalized through `versionCoerce`.
 *
 * PURPOSE  
 *   Ensures batch version inputs remain canonical and valid.
 *
 * INPUT CONTRACT  
 *   - Must be an array.
 *   - Each element must be a valid non-SemVer version string.
 *
 * OUTPUT CONTRACT  
 *   - Returns an array of canonical, lowercased version strings.
 *
 * VALIDATION RULES  
 *   - Applies `versionCoerce` to each element.
 *
 * SEMANTIC NOTES  
 *   Useful for:
 *   - configuration lists
 *   - version registries
 *   - bulk-ingested metadata
 *
 * EXAMPLES  
 *   ```
 *   ["  V1  ", "build-108"] →
 *   ["v1", "build-108"]
 *   ```
 */
const versionArray = v.array(versionCoerce);

/**
 * VERSION-MAP SCHEMA
 *
 * SUMMARY  
 *   Validates objects whose values are canonical, normalized version strings.
 *
 * PURPOSE  
 *   Ensures map-based metadata structures store valid version identifiers.
 *
 * INPUT CONTRACT  
 *   - Must be a plain object.
 *   - Each value must pass `versionCoerce`.
 *
 * OUTPUT CONTRACT  
 *   - Returns a map of canonical version strings.
 *
 * VALIDATION RULES  
 *   - Applies `versionCoerce` to each value.
 *
 * SEMANTIC NOTES  
 *   Useful for keyed configuration systems, lookup tables, or registries.
 *
 * EXAMPLES  
 *   ```
 *   { stable: "V2", dev: "build-108" } →
 *   { stable: "v2", dev: "build-108" }
 *   ```
 */
const versionMap = v.record(versionCoerce);

/**
 * VERSION-FIELD SCHEMA FACTORY
 *
 * SUMMARY  
 *   Generates a schema for structured version fields with:
 *   - a constant description
 *   - a normalized version value
 *
 * PURPOSE  
 *   Used for metadata-rich version descriptors in documentation systems,
 *   validation layers, UI forms, or dataset schemas.
 *
 * INPUT CONTRACT  
 *   - Must be an object containing:
 *       { description: string, value: string }
 *   - `description` is ignored and replaced with the static factory value.
 *
 * OUTPUT CONTRACT  
 *   - Returns:
 *       { description: <constant>, value: <canonical version> }
 *
 * VALIDATION RULES  
 *   - `description` must be a string but is overwritten.
 *   - `value` must pass `versionCoerce`.
 *
 * SEMANTIC NOTES  
 *   Ensures stable and non-user-overridable metadata.
 *
 * EXAMPLES  
 *   ```
 *   const Field = createVersionField("App config version");
 *   parse(Field, { description: "ignored", value: "V1" }) →
 *
 *   {
 *     description: "App config version",
 *     value: "v1"
 *   }
 *   ```
 */
const createVersionField = (description: string) =>
    v
        .object(
            {
                description: v.string(ERROR_MESSAGES.versionField),
                value: versionCoerce,
            },
            ERROR_MESSAGES.versionField
        )
        .pipe(
            v.transform((i) => ({
                description,
                value: i.value,
            }))
        );

/**
 * OUTPUT TYPE — VERSION-LOOSE
 *
 * SUMMARY  
 *   Represents the validated output of `versionLoose`: a string guaranteed to
 *   conform to accepted non-SemVer versioning formats.
 *
 * PURPOSE  
 *   Used where broad compatibility with diverse non-SemVer formats is required.
 *
 * CONTRACT GUARANTEES  
 *   - Always a valid non-SemVer version string.
 *
 * SEMANTIC NOTES  
 *   Frequently used in systems integrating mixed or legacy versioning.
 *
 * EXAMPLE  
 *   ```
 *   const v: VersionLoose = parse(versionLoose, "v2");
 *   ```
 */
type VersionLoose = v.InferOutput<typeof versionLoose>;

/**
 * OUTPUT TYPE — VERSION-STRICT
 *
 * SUMMARY  
 *   Represents a validated major.minor version string.
 *
 * PURPOSE  
 *   Ensures tightly controlled version sequences.
 *
 * CONTRACT GUARANTEES  
 *   - Always major.minor only.
 *
 * SEMANTIC NOTES  
 *   Eliminates semantic version patch noise.
 *
 * EXAMPLE  
 *   ```
 *   const v: VersionStrict = parse(versionStrict, "2.3");
 *   ```
 */
type VersionStrict = v.InferOutput<typeof versionStrict>;

/**
 * OUTPUT TYPE — VERSION-DATE
 *
 * SUMMARY  
 *   Represents validated date-style version strings (YYYY, YYYY.MM, YYYY.MM.DD).
 *
 * PURPOSE  
 *   Ideal for time-based releases or archival metadata.
 *
 * CONTRACT GUARANTEES  
 *   - Always matches date-style format.
 *
 * SEMANTIC NOTES  
 *   Common in regulated or compliance-heavy industries.
 *
 * EXAMPLE  
 *   ```
 *   const v: VersionDate = parse(versionDate, "2024.11");
 *   ```
 */
type VersionDate = v.InferOutput<typeof versionDate>;

/**
 * OUTPUT TYPE — VERSION-BUILD
 *
 * SUMMARY  
 *   Represents build-style version identifiers.
 *
 * PURPOSE  
 *   Tied to CI/CD pipeline outputs.
 *
 * CONTRACT GUARANTEES  
 *   - Always a recognized build or revision identifier.
 *
 * SEMANTIC NOTES  
 *   Works well with auto-incrementing build processes.
 *
 * EXAMPLE  
 *   ```
 *   const v: VersionBuild = parse(versionBuild, "build-108");
 *   ```
 */
type VersionBuild = v.InferOutput<typeof versionBuild>;

/**
 * OUTPUT TYPE — VERSION-PREFIX
 *
 * SUMMARY  
 *   Represents prefix-based version identifiers.
 *
 * PURPOSE  
 *   Communicates domain semantics directly in the version string.
 *
 * CONTRACT GUARANTEES  
 *   - Always matches recognized prefix-style formats.
 *
 * SEMANTIC NOTES  
 *   Great for distinguishing major version lines.
 *
 * EXAMPLE  
 *   ```
 *   const v: VersionPrefix = parse(versionPrefix, "rev-3");
 *   ```
 */
type VersionPrefix = v.InferOutput<typeof versionPrefix>;

/**
 * OUTPUT TYPE — VERSION-COERCE
 *
 * SUMMARY  
 *   Represents canonical, normalized, non-SemVer version strings.
 *
 * PURPOSE  
 *   Ensures consistency for storage, hashing, and comparison.
 *
 * CONTRACT GUARANTEES  
 *   - Always lowercase.
 *   - Always trimmed.
 *
 * SEMANTIC NOTES  
 *   Designed for ingestion of inconsistent external inputs.
 *
 * EXAMPLE  
 *   ```
 *   const v: VersionCoerce = parse(versionCoerce, "  V2 ");
 *   // "v2"
 *   ```
 */
type VersionCoerce = v.InferOutput<typeof versionCoerce>;

/**
 * OUTPUT TYPE — VERSION-ANY
 *
 * SUMMARY  
 *   Represents validated non-SemVer version identifiers, ensuring semantic
 *   versions are explicitly disallowed.
 *
 * PURPOSE  
 *   A catch-all validator for environments forbidding semantic versioning.
 *
 * CONTRACT GUARANTEES  
 *   - Always non-SemVer.
 *
 * SEMANTIC NOTES  
 *   Good for strict anti-semver policies.
 *
 * EXAMPLE  
 *   ```
 *   const v: VersionAny = parse(versionAny, "1.5");
 *   ```
 */
type VersionAny = v.InferOutput<typeof versionAny>;

/**
 * OUTPUT TYPE — VERSION-ARRAY
 *
 * SUMMARY  
 *   Represents arrays of canonical version strings.
 *
 * PURPOSE  
 *   Standardizes bulk version metadata.
 *
 * CONTRACT GUARANTEES  
 *   - Always an array of valid canonical versions.
 *
 * SEMANTIC NOTES  
 *   Useful for registries or release bundles.
 *
 * EXAMPLE  
 *   ```
 *   const arr: VersionArray = parse(versionArray, ["  V1 ", "build-108"]);
 *   ```
 */
type VersionArray = v.InferOutput<typeof versionArray>;

/**
 * OUTPUT TYPE — VERSION-MAP
 *
 * SUMMARY  
 *   Represents key/value maps of canonical version strings.
 *
 * PURPOSE  
 *   Provides structured version metadata.
 *
 * CONTRACT GUARANTEES  
 *   - All map values are canonical versions.
 *
 * SEMANTIC NOTES  
 *   Useful for configuration layers.
 *
 * EXAMPLE  
 *   ```
 *   const map: VersionMap = parse(versionMap, { stable: "V1" });
 *   ```
 */
type VersionMap = v.InferOutput<typeof versionMap>;

/**
 * OUTPUT TYPE — VERSION-FIELD
 *
 * SUMMARY  
 *   Represents descriptive version fields generated by `createVersionField`.
 *
 * PURPOSE  
 *   Combines human-readable metadata with canonical version identifiers.
 *
 * CONTRACT GUARANTEES  
 *   - Description is constant.
 *   - Value is canonical.
 *
 * SEMANTIC NOTES  
 *   Ideal for documentation-rich APIs, UI schemas, and config layers.
 *
 * EXAMPLE  
 *   ```
 *   const f: VersionField<"App version"> = {
 *     description: "App version",
 *     value: "v1"
 *   };
 *   ```
 */
type VersionField<T extends string = string> = {
    description: T;
    value: string;
};

/**
 * VERSION-OPTIONAL SCHEMA
 *
 * SUMMARY  
 *   Validates a version value that may be **absent**, but if present must be a
 *   syntactically valid version string according to the `versionAny` schema.
 *   This mirrors the exact semantics of optional version properties in strong
 *   type systems.
 *
 * PURPOSE  
 *   Useful for:
 *   - partial update payloads  
 *   - optional configuration fields  
 *   - metadata structures where versioning is non-mandatory  
 *   - API request models  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absent value  
 *   - value present and valid according to `versionAny`
 *
 *   REJECTS:
 *   - invalid version formats  
 *   - non-string values  
 *   - malformed structures  
 *
 * OUTPUT CONTRACT  
 *   - Output is always either `undefined` or a validated version string  
 *
 * EXAMPLES  
 *   ```
 *   parse(versionOptional, undefined);  // OK
 *   parse(versionOptional, "3.1");      // OK
 *   parse(versionOptional, "v2beta");   // OK (build/prefix allowed)
 *   parse(versionOptional, 42);         // ❌
 *   ```
 */
export const versionOptional = v.optional(
    versionAny,
    undefined
);

/**
 * OUTPUT TYPE — VERSION OPTIONAL
 *
 * SUMMARY  
 *   Represents a version value that may be absent or a validated version string.
 */
export type VersionOptional = v.InferOutput<typeof versionOptional>;

/**
 * VERSION-NULLABLE SCHEMA
 *
 * SUMMARY  
 *   Accepts either `null` or a valid version string. This mirrors nullable
 *   version fields in configurations, migrations, metadata, and typed APIs.
 *
 * PURPOSE  
 *   Used when:
 *   - null is a meaningful state (e.g., “no version yet”)  
 *   - version is optional but nullable values must be preserved  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - null  
 *   - valid version string  
 *
 *   REJECTS:
 *   - undefined  
 *   - malformed version strings  
 *
 * OUTPUT CONTRACT  
 *   - Returns null or the validated version string  
 *
 * EXAMPLE  
 *   ```
 *   parse(versionNullable, null);     // OK
 *   parse(versionNullable, "1.2");    // OK
 *   parse(versionNullable, undefined);// ❌
 *   ```
 */
export const versionNullable = v.union([
    v.null(),
    versionAny
]);

/**
 * OUTPUT TYPE — VERSION NULLABLE
 */
export type VersionNullable = v.InferOutput<typeof versionNullable>;

/**
 * VERSION-DEFAULT SCHEMA
 *
 * SUMMARY  
 *   Provides a canonical default version when the field is absent or explicitly
 *   undefined. Ensures that downstream systems always receive a valid,
 *   normalized version string.
 *
 * PURPOSE  
 *   Used for:
 *   - configuration defaults  
 *   - fallback versioning  
 *   - schema migrations  
 *   - metadata normalization  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - undefined → coerced to default  
 *   - missing field → coerced to default  
 *   - valid version string  
 *
 *   REJECTS:
 *   - null  
 *   - malformed version strings  
 *
 * OUTPUT CONTRACT  
 *   - Always a valid version string  
 *
 * EXAMPLE  
 *   ```
 *   parse(versionDefault, undefined);  // => "1.0"
 *   parse(versionDefault, "5.7");      // => "5.7"
 *   ```
 */
export const versionDefault = v.optional(
    versionAny,
    "1.0"
);

/**
* OUTPUT TYPE — VERSION DEFAULT
*/
export type VersionDefault = v.InferOutput<typeof versionDefault>;

export {
    ERROR_MESSAGES,

    versionLoose,
    versionStrict,
    versionDate,
    versionBuild,
    versionPrefix,
    versionCoerce,
    versionAny,
    versionArray,
    versionMap,

    createVersionField,

    type VersionLoose,
    type VersionStrict,
    type VersionDate,
    type VersionBuild,
    type VersionPrefix,
    type VersionCoerce,
    type VersionAny,
    type VersionArray,
    type VersionMap,
    type VersionField,
};

/*
✅ SECTION 1 — CORE SEMVER SCHEMAS (SEMANTIC VERSIONING 2.0.0)
	1.	VERSION-STRICT SCHEMA (exactly MAJOR.MINOR.PATCH)
	2.	VERSION-COERCE SCHEMA (normalizes loose formats to SemVer)
	3.	VERSION-NULLABLE SCHEMA (accepts null or valid version)
	4.	VERSION-OPTIONAL SCHEMA (accepts undefined or valid version)
	5.	VERSION-SEMVER SCHEMA (full RFC 9110-style semver validation)
	6.	VERSION-CANONICAL SCHEMA (normalized canonical semver output)
	7.	VERSION-LOOSE SCHEMA (accepts shorthand like “1”, “1.0”)
	8.	VERSION-STRICT-NORMALIZED SCHEMA (forces canonical x.y.z)
	9.	VERSION-BUILD-METADATA SCHEMA (accepts +build suffix)
	10.	VERSION-PRERELEASE SCHEMA (accepts -alpha, -beta, etc.)
	11.	VERSION-FULL SCHEMA (strict full SemVer with prerelease & build)
	12.	VERSION-VALIDATE SCHEMA (regex-based validator only)
	13.	VERSION-PARSE SCHEMA (splits into components { major, minor, patch })
	14.	VERSION-COMPARE SCHEMA (ensures A ≥ B comparison validity)
	15.	VERSION-COERCE-STRING SCHEMA (trims, normalizes, parses)

⸻

✅ SECTION 2 — COMPONENT SCHEMAS (MAJOR/MINOR/PATCH)
16. VERSION-MAJOR SCHEMA (non-negative integer)
17. VERSION-MINOR SCHEMA (non-negative integer)
18. VERSION-PATCH SCHEMA (non-negative integer)
19. VERSION-COMPONENT-ARRAY SCHEMA ([major, minor, patch])
20. VERSION-COMPONENT-OBJECT SCHEMA ({ major, minor, patch })
21. VERSION-COMPONENT-COERCE SCHEMA (coerces strings → numbers)
22. VERSION-COMPONENT-STRICT SCHEMA (disallows missing fields)
23. VERSION-COMPONENT-DEFAULT SCHEMA (defaults missing → 0)
24. VERSION-COMPONENT-NORMALIZED SCHEMA (canonical integer outputs)
25. VERSION-COMPONENT-VALIDATE SCHEMA (ensures ≥ 0 and integer)

⸻

✅ SECTION 3 — EXTENDED SEMVER / RANGE SCHEMAS
26. VERSION-RANGE SCHEMA (^1.2.0, ~2.3.4, >=3.0.0 <4.0.0)
27. VERSION-RANGE-LOOSE SCHEMA (accepts shorthand like “1.x”)
28. VERSION-RANGE-STRICT SCHEMA (fully parses NPM-style range)
29. VERSION-RANGE-LIST SCHEMA (array of valid ranges)
30. VERSION-RANGE-COERCE SCHEMA (normalizes spaces and operators)
31. VERSION-RANGE-VALIDATE SCHEMA (regex-based range check)
32. VERSION-RANGE-CANONICAL SCHEMA (canonicalized string output)
33. VERSION-RANGE-MINMAX SCHEMA (extracts min/max from range)
34. VERSION-RANGE-RESOLVE SCHEMA (resolves range to concrete version)
35. VERSION-RANGE-SATISFIES SCHEMA (validates target satisfies range)

⸻

✅ SECTION 4 — DISTRIBUTION / PACKAGE SCHEMAS
36. VERSION-PACKAGE.JSON SCHEMA (validates package.json version)
37. VERSION-NPM-DIST-TAG SCHEMA (latest, next, beta, etc.)
38. VERSION-PACKAGE-LOCK SCHEMA (coerces from npm/yarn lock entry)
39. VERSION-DEPENDENCY-RANGE SCHEMA (semver range in dependency)
40. VERSION-PEER-DEPENDENCY SCHEMA (peer range validation)
41. VERSION-MONOREPO-PACKAGE SCHEMA (internal workspace version)
42. VERSION-INTERNAL-MODULE SCHEMA (private module version)
43. VERSION-EXTERNAL-MODULE SCHEMA (public npm release version)
44. VERSION-REGISTRY-SCHEMA (validates npm registry format)
45. VERSION-BUMP-TYPE SCHEMA (enum: major/minor/patch/prerelease)

⸻

✅ SECTION 5 — BUILD / RELEASE / CI SCHEMAS
46. VERSION-CI-BUILD SCHEMA (auto-increment build version)
47. VERSION-CI-TAG SCHEMA (tag format v1.2.3)
48. VERSION-CI-RELEASE SCHEMA (release candidate tag validation)
49. VERSION-CI-PREVIEW SCHEMA (preview/build-specific identifiers)
50. VERSION-CI-HASH SCHEMA (git SHA appended to semver)
51. VERSION-CI-COMMIT SCHEMA (combines semver + commit id)
52. VERSION-CI-AUTO SCHEMA (auto-detects from env vars)
53. VERSION-CI-CHANNEL SCHEMA (maps branch → prerelease channel)
54. VERSION-CI-METADATA SCHEMA (includes build timestamp info)
55. VERSION-CI-CANONICAL SCHEMA (normalized output for pipelines)

⸻

✅ SECTION 6 — SYSTEM / API / SPEC SCHEMAS
56. VERSION-API SCHEMA (REST/GraphQL API version string)
57. VERSION-API-PATH SCHEMA (e.g. /v1, /v2)
58. VERSION-API-HEADER SCHEMA (X-API-Version header)
59. VERSION-API-NEGOTIATION SCHEMA (content negotiation rules)
60. VERSION-PROTOCOL SCHEMA (HTTP/1.1, HTTP/2, etc.)
61. VERSION-OPENAPI SCHEMA (openapi: 3.1.0)
62. VERSION-GRAPHQL SCHEMA (schema version tag)
63. VERSION-DATABASE SCHEMA (migration version id)
64. VERSION-MIGRATION SCHEMA (timestamp-based migration tag)
65. VERSION-CONFIG-SCHEMA (config schema version field)
66. VERSION-MODEL-SCHEMA (data model version indicator)
67. VERSION-SCHEMA-VERSION SCHEMA (validates internal schema versions)
68. VERSION-CONTRACT SCHEMA (API contract version compatibility)
69. VERSION-FILE-FORMAT SCHEMA (file version header)
70. VERSION-BINARY-FORMAT SCHEMA (binary serialization version id)

⸻

✅ SECTION 7 — COERCION / NORMALIZATION SCHEMAS
71. VERSION-COERCE-NUMERIC SCHEMA (accepts numeric input → x.0.0)
72. VERSION-COERCE-TAG SCHEMA (trims leading v)
73. VERSION-COERCE-WHITESPACE SCHEMA (trims spaces)
74. VERSION-COERCE-INTEGER SCHEMA (accepts int major version)
75. VERSION-COERCE-PREFIX SCHEMA (adds leading v if missing)
76. VERSION-COERCE-OBJECT SCHEMA (merges object {major,minor,patch})
77. VERSION-COERCE-JSON SCHEMA (parses from JSON string)
78. VERSION-COERCE-FILENAME SCHEMA (extracts from file names)
79. VERSION-COERCE-GIT-TAG SCHEMA (refs/tags/v1.2.3)
80. VERSION-COERCE-GIT-BRANCH SCHEMA (release/1.2.3)

⸻

✅ SECTION 8 — RANGE / CONSTRAINT RELATIONSHIP SCHEMAS
81. VERSION-GREATER-THAN SCHEMA
82. VERSION-GREATER-OR-EQUAL SCHEMA
83. VERSION-LESS-THAN SCHEMA
84. VERSION-LESS-OR-EQUAL SCHEMA
85. VERSION-EQUAL SCHEMA
86. VERSION-NOT-EQUAL SCHEMA
87. VERSION-COMPATIBLE SCHEMA (^ ranges)
88. VERSION-INCOMPATIBLE SCHEMA
89. VERSION-WITHIN-RANGE SCHEMA
90. VERSION-OUT-OF-RANGE SCHEMA
91. VERSION-CONFLICTING SCHEMA (detects incompatible deps)
92. VERSION-RESOLVED SCHEMA (concrete version selected)
93. VERSION-RESOLVABLE SCHEMA (range can be satisfied)
94. VERSION-STABLE SCHEMA (no prerelease suffix)
95. VERSION-PRERELEASE-ONLY SCHEMA (alpha/beta/rc allowed)
96. VERSION-STABILITY-LEVEL SCHEMA (enum: experimental → stable)

⸻

✅ SECTION 9 — FIELD / METADATA SCHEMAS
97. VERSION-FIELD SCHEMA ({ description, value: semver })
98. VERSION-FIELD-STRICT SCHEMA (locked description, strict semver)
99. VERSION-FIELD-NULLABLE SCHEMA
100. VERSION-FIELD-OPTIONAL SCHEMA
101. VERSION-FIELD-COERCE SCHEMA
102. VERSION-FIELD-CANONICAL SCHEMA
103. VERSION-FIELD-AUTO SCHEMA (auto version bump on change)
104. VERSION-FIELD-WITH-DESCRIPTION SCHEMA (collector pattern)
105. VERSION-FIELD-WITH-METADATA SCHEMA (author, commit, timestamp)
106. VERSION-FIELD-WITH-HISTORY SCHEMA (array of prior versions)

⸻

✅ SECTION 10 — DOMAIN-SPECIFIC SCHEMAS
107. VERSION-APP SCHEMA (application version)
108. VERSION-FIRMWARE SCHEMA (embedded firmware revision)
109. VERSION-HARDWARE SCHEMA (device hardware revision)
110. VERSION-OS SCHEMA (operating system version)
111. VERSION-KERNEL SCHEMA (Linux kernel-style semver)
112. VERSION-BROWSER SCHEMA (user agent version parsing)
113. VERSION-DRIVER SCHEMA (GPU/CPU driver version)
114. VERSION-DATABASE-ENGINE SCHEMA (Postgres/MySQL version)
115. VERSION-API-CLIENT SCHEMA (client SDK version)
116. VERSION-LIBRARY SCHEMA (dependency version tracking)
117. VERSION-PROTOCOL-REVISION SCHEMA (wire protocol id)
118. VERSION-FILE-FORMAT-VERSION SCHEMA (serialization version)
119. VERSION-CONFIGURATION-FILE SCHEMA (config spec version)
120. VERSION-PLATFORM-COMPATIBILITY SCHEMA (platform support range)

⸻

✅ SECTION 11 — VISUAL / RELEASE CHANNEL SCHEMAS
121. VERSION-CHANNEL SCHEMA (enum: alpha, beta, rc, stable)
122. VERSION-RELEASE-CYCLE SCHEMA (maps to release train)
123. VERSION-PHASE SCHEMA (dev → staging → prod)
124. VERSION-LIFECYCLE SCHEMA (active, deprecated, EOL)
125. VERSION-LABEL SCHEMA (human-friendly release label)
126. VERSION-NAME SCHEMA (release codename, e.g. “Orion”)
127. VERSION-COLOR-SCHEME SCHEMA (badge color association)
128. VERSION-STATUS SCHEMA (enum: draft, published, archived)
129. VERSION-CHANGELOG-ENTRY SCHEMA (links to changelog text)
130. VERSION-DOCUMENTATION-LINK SCHEMA (URL for this version)

⸻

✅ SECTION 12 — ADVANCED / EXPERIMENTAL SCHEMAS
131. VERSION-HASHED SCHEMA (commit-hash suffixed semver)
132. VERSION-DATE-TAG SCHEMA (YYYYMMDD-based)
133. VERSION-TIMESTAMP SCHEMA (epoch ms → semver tag)
134. VERSION-AUTO-INCREMENT SCHEMA (auto bumps based on type)
135. VERSION-LOCKFILE-REFERENCE SCHEMA (hash-anchored lock entry)
136. VERSION-DEPENDENCY-GRAPH SCHEMA (dependency tree version mapping)
137. VERSION-PROJECTION SCHEMA (range projection into specific release)
138. VERSION-CONSTRAINT-SET SCHEMA (union of compatible ranges)
139. VERSION-CROSS-REPO SCHEMA (multi-repo coordinated version)
140. VERSION-SNAPSHOT SCHEMA (temporary in-progress version)
141. VERSION-LEGACY SCHEMA (legacy version string mapping)
142. VERSION-EXPERIMENTAL SCHEMA (unstable prerelease)
143. VERSION-FUTURE SCHEMA (reserved upcoming version)
144. VERSION-RETIRED SCHEMA (intentionally discontinued)
145. VERSION-DEPRECATED SCHEMA (soft invalid, still parsable)
146. VERSION-BROKEN SCHEMA (known-invalid but preserved for logs)
147. VERSION-MIGRATED SCHEMA (old version migrated to new form)
148. VERSION-CANONICALIZED SCHEMA (normalized equivalence form)
149. VERSION-ALIAS SCHEMA (maps alias name → actual version)
150. VERSION-HYBRID SCHEMA (SemVer + timestamp or hash hybrid)
*/