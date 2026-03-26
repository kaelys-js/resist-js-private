/**
 * STRICT PERCENTAGE SCHEMA (0–100, NUMBER ONLY)
 *
 * SUMMARY  
 *   Validates that a value is a **number representing a percentage between 0
 *   and 100 inclusive**. This is the canonical strict percentage validator for
 *   systems that store percentages in human-facing units rather than fractional
 *   ratios. No coercion is performed: the input must already be a number.
 *
 * PURPOSE  
 *   Used for:
 *   - analytics dashboards  
 *   - scoring systems  
 *   - completion percentages  
 *   - configuration thresholds  
 *   - UI components  
 *   - business rules and KPI calculations  
 *
 *   Guarantees:
 *   - value is numeric  
 *   - value is between 0 and 100  
 *   - no coercion from strings  
 *   - no rounding or normalization  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - numbers in the inclusive range [0, 100]
 *
 *   REJECTS:
 *   - negative numbers  
 *   - values above 100  
 *   - strings (“50%”, “0.5”, “80”)  
 *   - non-numeric types  
 *   - NaN / Infinity  
 *
 * OUTPUT CONTRACT  
 *   - Returns the validated number unchanged  
 *
 * VALIDATION LOGIC  
 *   - Must be a number  
 *   - Must be finite  
 *   - Must satisfy 0 ≤ x ≤ 100  
 *
 * SEMANTIC NOTES  
 *   - Ideal when percentages must be displayed or configured in whole/human
 *     form  
 *   - Does not enforce integer precision; fractional percentages like 32.7 are
 *     allowed  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   0
 *   25.5
 *   100
 *
 *   // Invalid
 *   -1
 *   101
 *   "50%"
 *   NaN
 *   ```
 */
export const percentageStrict = v.number("Percentage must be a number.")
    .pipe(v.minValue(0, "Percentage cannot be below 0."))
    .pipe(v.maxValue(100, "Percentage cannot exceed 100."));

/**
* OUTPUT TYPE — STRICT NUMERIC PERCENTAGE
*
* SUMMARY  
*   Represents a validated percentage as a number between 0 and 100. Suitable
*   for analytics, UI components, configuration thresholds, and business rules
*   that require concrete human-readable percentage units.
*
* CONTRACT GUARANTEES  
*   - Always a number  
*   - Always between 0 and 100 inclusive  
*   - Never a string, ratio, or coerced value  
*
* EXAMPLE  
*   ```
*   const pct: PercentageStrict = parse(percentageStrict, 42.3);
*   ```
*/
export type PercentageStrict = v.InferOutput<typeof percentageStrict>;

/**
 * FLOATING-POINT PERCENTAGE SCHEMA (0–1 RATIO)
 *
 * SUMMARY  
 *   Validates that a value is a **floating-point ratio representing a
 *   percentage**, constrained to the inclusive range `[0, 1]`. This schema is
 *   designed for machine-oriented numerical systems where percentages are stored
 *   as fractional units rather than human-readable 0–100 values.
 *
 *   Unlike coercive schemas, this validator requires the input to be already
 *   numeric. No conversion from strings (e.g., "0.5" or "50%") is performed.
 *
 * PURPOSE  
 *   Ideal for:
 *   - machine learning feature vectors  
 *   - scoring models & confidence values  
 *   - analytics normalization  
 *   - weighted blending & interpolation  
 *   - statistical computations  
 *   - progress ratios for engines/UI frameworks  
 *
 *   Guarantees:
 *   - value is numeric  
 *   - value is finite  
 *   - value is within the safe ratio range  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - numbers where `0 ≤ x ≤ 1`
 *
 *   REJECTS:
 *   - numbers < 0 or > 1  
 *   - strings ("0.3", "30%")  
 *   - percentages in 0–100 units  
 *   - NaN / Infinity  
 *   - non-numeric types  
 *
 * OUTPUT CONTRACT  
 *   - Returns the validated ratio unchanged  
 *
 * VALIDATION LOGIC  
 *   - Input must be a number  
 *   - Must be finite  
 *   - Must satisfy `0 ≤ value ≤ 1`  
 *
 * SEMANTIC NOTES  
 *   - Ratios are the preferred representation in engines, analytics pipelines,
 *     and ML layers, because they avoid human-unit confusion  
 *   - Permits arbitrary precision; not restricted to integers  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   0
 *   0.23
 *   1
 *
 *   // Invalid
 *   -0.1
 *   1.5
 *   "0.5"
 *   "50%"
 *   NaN
 *   ```
 */
export const percentageFloat = v.number("Percentage ratio must be a number.")
    .pipe(v.minValue(0, "Percentage ratio cannot be below 0."))
    .pipe(v.maxValue(1, "Percentage ratio cannot exceed 1."));

/**
* OUTPUT TYPE — FLOATING-POINT PERCENTAGE RATIO
*
* SUMMARY  
*   Represents a validated numeric ratio between 0 and 1 inclusive. This is the
*   canonical type for **machine-friendly percentages**, commonly used in
*   statistical models, scoring engines, real-time renderers, animation
*   systems, and analytics pipelines.
*
* CONTRACT GUARANTEES  
*   - Always a number  
*   - Always in the range [0, 1]  
*   - Never a string, integer percentage, or coerced input  
*
* EXAMPLE  
*   ```
*   const ratio: PercentageFloat =
*       parse(percentageFloat, 0.42);
*   ```
*/
export type PercentageFloat = v.InferOutput<typeof percentageFloat>;

/**
 * STRING PERCENTAGE SCHEMA ("0%"–"100%")
 *
 * SUMMARY  
 *   Validates a **strict human-readable percentage string**, constrained to the
 *   inclusive range `"0%"` through `"100%"`. This schema enforces:
 *
 *   - required trailing "%" unit  
 *   - no whitespace  
 *   - no sign symbols  
 *   - numeric portion must be a valid integer or decimal  
 *   - value must fall within 0–100  
 *
 *   Unlike coercive schemas, no normalization is applied. The input must be
 *   exactly a syntactically valid percentage string.
 *
 * PURPOSE  
 *   Suitable for:
 *   - UI form parsing  
 *   - config files using readable percentage units  
 *   - spreadsheets & operator-facing dashboards  
 *   - templating systems  
 *   - user-editable settings  
 *   - analytics export/import formats  
 *
 *   Ensures percentages are expressed in standard human-readable “unit form”
 *   rather than floating-point ratios.
 *
 * INPUT CONTRACT  
 *   ACCEPTS (examples):
 *   - `"0%"`
 *   - `"42%"`
 *   - `"12.5%"`
 *   - `"100%"`
 *
 *   REJECTS:
 *   - `"101%"`
 *   - `"-1%"`
 *   - `"50"` (missing `%`)  
 *   - `"50 %"` (whitespace)  
 *   - `" 50%"`  
 *   - `"50.%"`  
 *   - `"%"`  
 *   - numbers (`50`)  
 *   - anything non-string  
 *
 * OUTPUT CONTRACT  
 *   - Returns the **original string unchanged**  
 *   - Guarantees strict formatting compliance  
 *
 * VALIDATION LOGIC  
 *   - Input must be a string  
 *   - Must match strict pattern: `^\d{1,3}(\.\d+)?%$`  
 *   - Numeric value extracted must satisfy: `0 ≤ value ≤ 100`  
 *
 * SEMANTIC NOTES  
 *   - A percentage like `"12.5%"` corresponds to `0.125` ratio form
 *     (handled by percentageCoerce in the next schema family)  
 *   - Ideal for UI-facing and operator-facing layers  
 *   - Provides deterministic formatting for serialization  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "0%"
 *   "75%"
 *   "12.5%"
 *   "100%"
 *
 *   // Invalid
 *   "100.1%"
 *   "-1%"
 *   "50"
 *   "50 %"
 *   50
 *   null
 *   ```
 */
export const percentageString = v
    .string("Percentage must be a string.")
    .pipe(
        v.regex(/^\d{1,3}(\.\d+)?%$/, "Invalid percentage string format.")
    )
    .pipe(
        v.custom((str) => {
            const num = parseFloat(str.replace("%", ""));
            return num >= 0 && num <= 100;
        }, "Percentage must be between 0% and 100%.")
    );

/**
* OUTPUT TYPE — STRING PERCENTAGE ("0%"–"100%")
*
* SUMMARY  
*   Represents a validated human-readable percentage string, constrained to the
*   range `"0%"` through `"100%"`. Ideal for UI layers, configuration files,
*   and systems where percentages must retain visible units.
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always ends with "%"  
*   - Numeric portion always in [0, 100]  
*   - Never coerced or reformatted  
*
* EXAMPLE  
*   ```
*   const p: PercentageString =
*       parse(percentageString, "12.5%");
*   ```
*/
export type PercentageString = v.InferOutput<typeof percentageString>;

/**
 * UNIVERSAL PERCENTAGE COERCION SCHEMA
 *
 * SUMMARY  
 *   Accepts multiple real-world percentage formats and normalizes them into a
 *   single canonical representation: a **number between 0 and 100 inclusive**.
 *
 *   Supported input formats include:
 *   - integer percentages (`50`)  
 *   - fractional ratios (`0.5` → 50)  
 *   - percentage strings (`"50%"` → 50)  
 *   - numeric strings (`"0.25"` → 25, `"50"` → 50)  
 *
 *   This schema performs:
 *   - trimming  
 *   - unit detection (`%`)  
 *   - normalization of ratios  
 *   - validation of bounds  
 *
 * PURPOSE  
 *   Designed for any system ingesting user input, configuration values, or
 *   cross-environment payloads where percentage formats are inconsistent:
 *   - UI inputs and form fields  
 *   - operator dashboards  
 *   - analytics pipelines  
 *   - CSV/JSON imports  
 *   - config files  
 *   - API payloads  
 *
 *   Ensures **canonical numeric output** for all downstream consumers.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - numbers in `[0, 100]`  
 *   - numbers in `[0, 1]` interpreted as ratios  
 *   - strings ending in `%` (e.g., `"12.5%"`, `"100%"`)  
 *   - numeric strings (`"50"`, `"0.33"`)  
 *
 *   REJECTS:
 *   - negative values  
 *   - values > 100 after normalization  
 *   - empty strings  
 *   - whitespace-only strings  
 *   - malformed formats (`"%"`, `"50%%"`, `"0.%")`)  
 *   - objects, arrays, booleans, null, undefined  
 *
 * OUTPUT CONTRACT  
 *   Produces a **number in the inclusive range `[0, 100]`**, never coerced to
 *   integer — fractional outputs such as `12.5`, `33.3333…` are permitted.
 *
 * VALIDATION LOGIC  
 *   1. Trim input if string  
 *   2. Detect `"X%"` → extract X  
 *   3. Detect ratios (`0–1`) → multiply by 100  
 *   4. Parse numeric strings  
 *   5. Validate:
 *      - not NaN  
 *      - finite  
 *      - 0 ≤ value ≤ 100  
 *
 * SEMANTIC NOTES  
 *   - Converts `"0.123"` into `12.3`  
 *   - Converts `"12.3%"` into `12.3`  
 *   - Converts `0.123` into `12.3`  
 *   - Leaves `12.3` unchanged  
 *   - Final output is consistent for machine & UI layers  
 *
 * EXAMPLES  
 *   ```
 *   // Input                       → Output
 *   50                             → 50
 *   0.5                            → 50
 *   "50"                           → 50
 *   "50%"                          → 50
 *   "0.125"                        → 12.5
 *   "12.5%"                        → 12.5
 *   "1"                            → 1   // valid
 *
 *   // Invalid
 *   "", " ", null, undefined
 *   "garbage"
 *   "150%"
 *   900
 *   -1
 *   ```
 */
export const percentageCoerce = v.coerce(
    v.number("Percentage must be coercible to a number."),
    (input: any): number => {
        if (input === null || input === undefined) {
            throw new Error("Percentage cannot be null or undefined.");
        }

        // Strings → trim first
        if (typeof input === "string") {
            const raw = input.trim();
            if (raw.length === 0) {
                throw new Error("Percentage cannot be an empty string.");
            }

            // Case 1: ends with "%"
            if (raw.endsWith("%")) {
                const num = parseFloat(raw.slice(0, -1));
                if (isNaN(num)) throw new Error("Invalid percentage format.");
                if (num < 0 || num > 100) {
                    throw new Error("Percentage out of range (0–100).");
                }
                return num;
            }

            // Case 2: numeric string
            const num = Number(raw);
            if (isNaN(num)) throw new Error("Invalid numeric percentage string.");

            // Detect ratio form (0–1)
            const normalized =
                num >= 0 && num <= 1
                    ? num * 100 // ratio → %
                    : num;       // already percentage

            if (normalized < 0 || normalized > 100) {
                throw new Error("Percentage out of range (0–100).");
            }

            return normalized;
        }

        // Numbers
        if (typeof input === "number") {
            if (!Number.isFinite(input)) {
                throw new Error("Percentage must be a finite number.");
            }

            const normalized =
                input >= 0 && input <= 1
                    ? input * 100 // ratio form
                    : input;       // percentage form

            if (normalized < 0 || normalized > 100) {
                throw new Error("Percentage out of range (0–100).");
            }

            return normalized;
        }

        throw new Error("Invalid percentage input format.");
    }
);

/**
* OUTPUT TYPE — COERCED CANONICAL PERCENTAGE (0–100)
*
* SUMMARY  
*   Represents a normalized numeric percentage in the inclusive range
*   `[0, 100]`. All valid input formats supported by `percentageCoerce` are
*   collapsed into this single canonical representation.
*
* CONTRACT GUARANTEES  
*   - Always a number  
*   - Always between 0 and 100  
*   - May contain fractional precision (e.g., 33.3333)  
*   - Never retains unit symbols or raw input  
*
* EXAMPLE  
*   ```
*   const pct: PercentageCoerce =
*       parse(percentageCoerce, "12.5%");
*   // pct = 12.5
*   ```
*/
export type PercentageCoerce = v.InferOutput<typeof percentageCoerce>;

/**
 * PERCENTAGE ARRAY SCHEMA
 *
 * SUMMARY  
 *   Validates an array whose **every element** must be a valid percentage value,
 *   normalized using the `percentageCoerce` schema. This means each entry may
 *   arrive in any real-world percentage representation:
 *
 *   - numbers in the range 0–100  
 *   - fractional ratios (0–1)  
 *   - percentage strings (e.g., "12.5%")  
 *   - numeric strings ("12.5", "0.5")  
 *
 *   All entries are normalized into the canonical **0–100 number** format.
 *
 * PURPOSE  
 *   Ideal for:
 *   - timeseries percentage metrics  
 *   - confidence arrays  
 *   - analytics pipelines  
 *   - A/B test result vectors  
 *   - scoring system distributions  
 *   - ML feature sets  
 *
 *   Guarantees output consistency across highly variable percentage sources.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - arrays of any values that `percentageCoerce` can normalize  
 *
 *   REJECTS:
 *   - non-arrays  
 *   - any element failing coercion  
 *   - null or undefined arrays  
 *
 * OUTPUT CONTRACT  
 *   Produces an array of numbers, each in the range `[0, 100]`.
 *
 * VALIDATION LOGIC  
 *   - Input must be an array  
 *   - For each element:
 *       - parse via percentageCoerce  
 *       - enforce bounds (0–100)  
 *
 * SEMANTIC NOTES  
 *   - Fractional ratios (0–1) convert into percentages for consistency  
 *   - Output always numeric, never string-based  
 *   - Order is preserved  
 *
 * EXAMPLES  
 *   ```
 *   // Input                      → Output
 *   [50, "0.5", "50%", 0.25]       → [50, 50, 50, 25]
 *
 *   // Invalid
 *   ["", null, "200%", -5]
 *   ```
 */
export const percentageArray = v.array(
    percentageCoerce,
    "Each element must be a valid percentage."
);

/**
* OUTPUT TYPE — ARRAY OF NORMALIZED PERCENTAGES
*
* SUMMARY  
*   Represents the validated output of `percentageArray`: a list of canonical,
*   normalized percentages (numbers from 0 to 100). This type guarantees that
*   all elements are already suitable for analytics, UI, ML, and reporting
*   systems demanding consistent numeric representation.
*
* CONTRACT GUARANTEES  
*   - Always an array  
*   - Every element is a number in `[0, 100]`  
*   - No string or ratio outputs  
*   - No invalid or partial entries  
*
* EXAMPLE  
*   ```
*   const list: PercentageArray =
*       parse(percentageArray, ["50%", 0.5, "25"]);
*   // list = [50, 50, 25]
*   ```
*/
export type PercentageArray = v.InferOutput<typeof percentageArray>;

/**
 * PERCENTAGE RECORD SCHEMA
 *
 * SUMMARY  
 *   Validates a **string-keyed record** in which each value is a percentage
 *   normalized by the `percentageCoerce` schema. This allows every field value
 *   to arrive in any supported input form:
 *
 *   - raw numbers (0–100)  
 *   - ratio numbers (0–1 → converted to 0–100)  
 *   - percentage strings ("12.5%", "100%")  
 *   - numeric strings ("12.5", "0.33")  
 *
 *   All values are normalized into a **canonical numeric percentage** in the
 *   inclusive range `[0, 100]`.
 *
 * PURPOSE  
 *   This schema is ideal for:
 *   - analytics dimensional maps  
 *   - weighted config tables  
 *   - scoring dictionaries  
 *   - A/B experiment performance maps  
 *   - machine-learning feature maps  
 *   - environment- or tenant-specific weight sets  
 *
 *   Ensures **full value normalization** across arbitrarily diverse inputs.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - plain objects  
 *   - string keys  
 *   - values accepted by `percentageCoerce`  
 *
 *   REJECTS:
 *   - arrays  
 *   - null  
 *   - non-object values  
 *   - any field value failing coercion  
 *
 * OUTPUT CONTRACT  
 *   Produces:
 *   ```
 *   Record<string, number>  // every number is 0–100
 *   ```
 *
 * VALIDATION LOGIC  
 *   - Input must be a plain object  
 *   - Each value must successfully parse via `percentageCoerce`  
 *   - Resulting number must stay within bounds (0–100)  
 *
 * SEMANTIC NOTES  
 *   - Perfect for schema-driven weight tables  
 *   - Converts ratios into human-unit percentages  
 *   - Guarantees deterministic output for downstream systems  
 *
 * EXAMPLES  
 *   ```
 *   // Input                            → Output
 *   { a: "50%", b: 0.25 }                → { a: 50, b: 25 }
 *
 *   // Invalid
 *   { a: "150%" }
 *   { a: -5 }
 *   null
 *   []
 *   ```
 */
export const percentageRecord = v.record(
    percentageCoerce,
    "Each record value must be a valid percentage."
);

/**
* OUTPUT TYPE — RECORD OF NORMALIZED PERCENTAGES
*
* SUMMARY  
*   Represents the output of `percentageRecord`: a mapping of string keys to
*   canonical percentages. All values are **numbers between 0 and 100**, already
*   normalized and validated.
*
* CONTRACT GUARANTEES  
*   - Always a plain object  
*   - Keys are always strings  
*   - Values are always canonical percentages  
*   - No raw input formats are preserved  
*
* EXAMPLE  
*   ```
*   const weights: PercentageRecord =
*       parse(percentageRecord, {
*         impressions: "12.5%",
*         clicks: 0.9,
*         conversions: "30"
*       });
*   // weights = { impressions: 12.5, clicks: 90, conversions: 30 }
*   ```
*/
export type PercentageRecord = v.InferOutput<typeof percentageRecord>;

/**
 * PERCENTAGE FIELD SCHEMA FACTORY
 *
 * SUMMARY  
 *   Produces a **strict, normalized, well-documented field descriptor** whose
 *   `value` is a canonical **numeric percentage (0–100)**. The schema enforces:
 *
 *   - a required `description` field  
 *   - a `value` field validated through `percentageCoerce`  
 *   - strict object shape via `strictObject`  
 *   - canonicalization of input percentages  
 *
 *   This pattern is central in configuration systems, analytics pipelines,
 *   experiment frameworks, metadata models, and enterprise data contracts.
 *
 * PURPOSE  
 *   Designed for systems where every field must:
 *   - carry a mandatory human-readable description  
 *   - produce a consistently normalized 0–100 percentage  
 *   - reject malformed or partial structures  
 *   - ensure invariants during versioned schema evolution  
 *
 *   Typical usage:
 *   - analytics metric descriptors  
 *   - weight/ratio configuration fields  
 *   - dashboard display mapping  
 *   - experiment metadata (e.g., bucket allocation)  
 *   - export/import schema definitions  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - objects with:
 *       - `description`: string  
 *       - `value`: any input accepted by `percentageCoerce`
 *
 *   REJECTS:
 *   - any missing field  
 *   - any non-string description  
 *   - any invalid percentage format  
 *   - extra/unknown keys (strict schema)  
 *   - null/undefined objects  
 *
 * OUTPUT CONTRACT  
 *   Normalizes and returns:
 *   ```
 *   {
 *     description: string;      // the provided description arg
 *     value: number;            // canonical percentage (0–100)
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   1. Validate object shape strictly  
 *   2. Validate/normalize percentage via `percentageCoerce`  
 *   3. Transform output to enforce canonical description  
 *
 * SEMANTIC NOTES  
 *   - Ensures documentation metadata stays consistent across an entire schema  
 *   - Prevents stale or user-supplied descriptions from leaking into output  
 *   - Guarantees canonical numeric percentage form for all downstream consumers  
 *
 * EXAMPLES  
 *   ```
 *   const Field = createPercentageField("Completion proportion");
 *
 *   const result = parse(Field, {
 *     description: "ignored",
 *     value: "12.5%"
 *   });
 *
 *   // Output:
 *   {
 *     description: "Completion proportion",
 *     value: 12.5
 *   }
 *   ```
 */
export const createPercentageField = (description: string) =>
    v
        .strictObject(
            {
                description: v.string("Description must be a string."),
                value: percentageCoerce
            },
            "Percentage field must be an object with { description, value }."
        )
        .pipe(
            v.transform((input) => ({
                description,
                value: input.value
            }))
        );

/**
* OUTPUT TYPE — PERCENTAGE FIELD DESCRIPTOR
*
* SUMMARY  
*   Represents the validated, normalized output of a percentage field generated
*   by `createPercentageField()`. Ensures:
*
*   - canonical description (literal type `T`)  
*   - normalized numeric percentage (0–100)  
*   - strict, predictable structure for typed configuration layers  
*
* CONTRACT GUARANTEES  
*   - `description` is always the literal type `T` provided at creation time  
*   - `value` is always a number between 0 and 100  
*   - no additional keys are ever present  
*
* SEMANTIC NOTES  
*   - Ideal for enterprise schema systems requiring metadata-rich percentage
*     fields  
*   - Used for UI displays, analytics processors, API contracts, and more  
*
* EXAMPLE  
*   ```
*   const AllocationField: PercentageField<"Bucket weight"> = {
*     description: "Bucket weight",
*     value: 33.3
*   };
*   ```
*/
export type PercentageField<T extends string = string> = {
    description: T;
    value: number; // guaranteed 0–100
};

/*
✅ SECTION 11 — ADDITIONAL PERCENTAGE SCHEMAS (MISSING FROM YOUR SET)

These complete the full spectrum of real-world percentage representations used across analytics, ML, config, UI, and data-exchange standards (JSON Schema v2020-12, OpenAPI 3.2, HL7 FHIR, ISO 80000).

⸻

1. Atomic / strict extensions
	1.	PERCENTAGE-STRICT-INTEGER SCHEMA — identical to percentageStrict but enforces integer precision (e.g., 0–100 whole numbers only).
	2.	PERCENTAGE-STRICT-OPTIONAL SCHEMA — allows undefined but when present must satisfy percentageStrict.
	3.	PERCENTAGE-STRICT-NULLABLE SCHEMA — allows null or a valid 0–100 number; used in tolerant form fields.
	4.	PERCENTAGE-STRICT-NULLABLE-OPTIONAL SCHEMA — combination of null | undefined | strict percentage.

⸻

2. Ratio / coercion variants
	5.	PERCENTAGE-FLOAT-COERCE SCHEMA — accepts "0.25", "25%", or 0.25 and normalizes to 0–1 ratio numbers.
	6.	PERCENTAGE-RATIO-TO-PERCENT SCHEMA — transforms 0–1 ratios → 0–100 percentages (used for analytics export).
	7.	PERCENTAGE-PERCENT-TO-RATIO SCHEMA — transforms 0–100 inputs → 0–1 ratios (used for ML import).
	8.	PERCENTAGE-BOOLEAN-COERCE SCHEMA — true → 100, false → 0; ideal for binary flags rendered as percentages.
	9.	PERCENTAGE-NULLABLE-COERCE SCHEMA — accepts null, undefined, "", coercing all to null → consistent empty-state normalization.

⸻

3. Pattern / format schemas
	10.	PERCENTAGE-REGEX-FLEX SCHEMA — tolerant regex allowing optional space, plus/minus signs, and percent symbols (^\s*[+-]?\d+(\.\d+)?\s*%?\s*$).
	11.	PERCENTAGE-UNIT-SUFFIX SCHEMA — specialized for alternate unit suffixes (e.g., pct, percent).
	12.	PERCENTAGE-STRING-NULLABLE SCHEMA — allows null or "%" blank to represent missing input.
	13.	PERCENTAGE-STRING-OPTIONAL SCHEMA — optional wrapper around percentageString.

⸻

4. Collection and structure forms
	14.	PERCENTAGE-TUPLE SCHEMA — fixed-length tuple of two or three percentages (e.g., [A,B] = weights).
	15.	PERCENTAGE-MATRIX SCHEMA — nested 2-D array of canonical percentages for heatmaps or confusion matrices.
	16.	PERCENTAGE-SET SCHEMA — validates Set<number> where each entry is 0–100.
	17.	PERCENTAGE-MAP SCHEMA — Map<string, number> normalized via percentageCoerce.
	18.	PERCENTAGE-PAIR SCHEMA — tuple [min,max] ensuring 0 ≤ min ≤ max ≤ 100.

⸻

5. Semantic / business-logic constraints
	19.	PERCENTAGE-TOTAL-100 SCHEMA — array or record whose values sum exactly 100 (± tolerance ε); used for weights and distributions.
	20.	PERCENTAGE-TOTAL-≤100 SCHEMA — cumulative percentages not exceeding 100 (sum ≤ 100).
	21.	PERCENTAGE-NONZERO SCHEMA — prohibits 0 to ensure non-empty allocation weights.
	22.	PERCENTAGE-CAPPED-FLOAT SCHEMA — ratio 0–1 but caps internally (>1 → 1).
	23.	PERCENTAGE-ROUND-SCHEMA — rounds output to given precision (e.g., 2 decimals).
	24.	PERCENTAGE-TOLERANCE-SCHEMA — validates within ±ε of expected target (e.g., abs(actual – expected) ≤ ε).

⸻

6. Field / metadata extensions
	25.	PERCENTAGE-FIELD-OPTIONAL SCHEMA — same as createPercentageField but value may be undefined.
	26.	PERCENTAGE-FIELD-NULLABLE SCHEMA — permits null for absent values but retains description.
	27.	PERCENTAGE-FIELD-RATIO SCHEMA — emits ratio form (0–1) instead of 0–100 number.
	28.	PERCENTAGE-FIELD-ARRAY SCHEMA — array of PercentageField objects (for metric sets).
	29.	PERCENTAGE-FIELD-MAP SCHEMA — record of PercentageField values keyed by metric name.
	30.	PERCENTAGE-FIELD-WEIGHTED-SCHEMA — enforces that sum of all field values = 100.

⸻

*/