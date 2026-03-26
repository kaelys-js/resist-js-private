import * as v from "valibot";

/* ========================================================================== *
 *  SHARED ERROR MESSAGES
 * -------------------------------------------------------------------------- */

const ERR = {
    number: "Expected a numeric value.",
    integer: "Expected an integer value.",
    safeInteger: "Expected a safe integer (Number.isSafeInteger).",
    positive: "Expected a positive number (> 0).",
    nonNegative: "Expected a non-negative number (>= 0).",
    negative: "Expected a negative number (< 0).",
    nonPositive: "Expected a non-positive number (<= 0).",
    min: (min: number) => `Value must be greater than or equal to ${min}.`,
    max: (max: number) => `Value must be less than or equal to ${max}.`,
    range: (min: number, max: number) =>
        `Value must be between ${min} and ${max} (inclusive).`,
    step: (step: number) =>
        `Value must be a multiple of ${step} from the minimum.`,
    invalidNumericCoerce:
        "Expected a number or a convertible value (stringified number).",
    enumNumber: "Expected one of the allowed numeric literal values.",
};


/* ========================================================================== *
 *  STRICT NUMBER SCHEMAS
 * ========================================================================== */

/**
 * Strict numeric schema.
 * - Accepts only JavaScript numbers
 * - Rejects strings, booleans, null, undefined, etc.
 */
const numberStrict = v.number(ERR.number);

/** Output type: number */
type NumberStrict = v.InferOutput<typeof numberStrict>;


/**
 * Optional numeric schema.
 * - Accepts `undefined`
 * - Defined values must be numbers
 */
const numberStrictOptional = v.optional(numberStrict);

/** Output type: number | undefined */
type NumberStrictOptional = v.InferOutput<typeof numberStrictOptional>;


/**
 * Nullable numeric schema.
 * - Accepts `null`
 * - Defined values must be numbers
 */
const numberStrictNullable = v.nullable(numberStrict);

/** Output type: number | null */
type NumberStrictNullable = v.InferOutput<typeof numberStrictNullable>;


/* ========================================================================== *
 *  INTEGER SCHEMAS
 * ========================================================================== */

/**
 * Integer-only schema.
 */
const numberInteger = v.number(ERR.number).pipe(
    v.check((n) => Number.isInteger(n), ERR.integer)
);

/** Output type: number (integer) */
type NumberInteger = v.InferOutput<typeof numberInteger>;


/**
 * Safe integer-only schema.
 * - Ensures integer & Number.isSafeInteger(n)
 */
const numberSafeInteger = v.number(ERR.number).pipe(
    v.check((n) => Number.isSafeInteger(n), ERR.safeInteger)
);

/** Output type: number (safe integer) */
type NumberSafeInteger = v.InferOutput<typeof numberSafeInteger>;


/* ========================================================================== *
 *  NUMERIC COERCION
 * ========================================================================== */

/**
 * Smart coercing number.
 * Accepts:
 *   - numbers
 *   - numeric strings ("1", "12.5", "-3", "0.001")
 * Rejects:
 *   - NaN
 *   - non-numeric strings
 */
const numberCoerce = v.coerce(
    v.number(ERR.number),
    (input: any) => {
        if (typeof input === "number" && !Number.isNaN(input)) return input;

        if (typeof input === "string") {
            const parsed = Number(input.trim());
            if (!Number.isNaN(parsed)) return parsed;
        }

        throw new Error(ERR.invalidNumericCoerce);
    }
);

/** Output type: number */
type NumberCoerce = v.InferOutput<typeof numberCoerce>;


/**
 * Optional coercing number.
 */
const numberCoerceOptional = v.optional(numberCoerce);

/** Output type: number | undefined */
type NumberCoerceOptional = v.InferOutput<typeof numberCoerceOptional>;


/**
 * Nullable coercing number.
 */
const numberCoerceNullable = v.nullable(numberCoerce);

/** Output type: number | null */
type NumberCoerceNullable = v.InferOutput<typeof numberCoerceNullable>;


/* ========================================================================== *
 *  POSITIVE / NEGATIVE / SIGNED SCHEMAS
 * ========================================================================== */

/**
 * Positive number (> 0).
 */
const numberPositive = numberCoerce.pipe(
    v.check((n) => n > 0, ERR.positive)
);

/** Output: number (> 0) */
type NumberPositive = v.InferOutput<typeof numberPositive>;


/**
 * Non-negative number (>= 0).
 */
const numberNonNegative = numberCoerce.pipe(
    v.check((n) => n >= 0, ERR.nonNegative)
);

/** Output: number (>= 0) */
type NumberNonNegative = v.InferOutput<typeof numberNonNegative>;


/**
 * Negative number (< 0).
 */
const numberNegative = numberCoerce.pipe(
    v.check((n) => n < 0, ERR.negative)
);

/** Output: number (< 0) */
type NumberNegative = v.InferOutput<typeof numberNegative>;


/**
 * Non-positive number (<= 0).
 */
const numberNonPositive = numberCoerce.pipe(
    v.check((n) => n <= 0, ERR.nonPositive)
);

/** Output: number (<= 0) */
type NumberNonPositive = v.InferOutput<typeof numberNonPositive>;


/* ========================================================================== *
 *  MIN / MAX / RANGE / STEP
 * ========================================================================== */

/**
 * Number with a minimum allowed value.
 */
const numberMin = (min: number) =>
    numberCoerce.pipe(v.check((n) => n >= min, ERR.min(min)));

/** Output: number >= min */
type NumberMin = number;

/**
 * Number with a maximum allowed value.
 */
const numberMax = (max: number) =>
    numberCoerce.pipe(v.check((n) => n <= max, ERR.max(max)));

/** Output: number <= max */
type NumberMax = number;

/**
 * Number constrained to a numeric range.
 */
const numberRange = (min: number, max: number) =>
    numberCoerce.pipe(
        v.check((n) => n >= min && n <= max, ERR.range(min, max))
    );

/** Output: number in [min, max] */
type NumberRange = number;

/**
 * Number adhering to a numeric step from a given minimum.
 */
const numberStep = (step: number, min: number = 0) =>
    numberCoerce.pipe(
        v.check(
            (n) => (n - min) % step === 0,
            ERR.step(step)
        )
    );

/** Output: number matching the step rule */
type NumberStep = number;


/* ========================================================================== *
 *  DEFAULTED NUMBERS
 * ========================================================================== */

/**
 * Number with a default value applied if omitted.
 */
const numberDefault = (defaultValue: number) =>
    v.optional(numberCoerce, () => defaultValue);

/** Output: number */
type NumberDefault = number;


/* ========================================================================== *
 *  PRESENT NUMBER
 * ========================================================================== */

/**
 * Number that MUST be present (not undefined).
 * Null is *not* allowed.
 */
const numberPresent = v.custom(
    (value) => typeof value === "number" && !Number.isNaN(value),
    ERR.number
);

/** Output: number */
type NumberPresent = v.InferOutput<typeof numberPresent>;


/* ========================================================================== *
 *  NUMERIC ARRAY / MAP / ENUM
 * ========================================================================== */

/**
 * Array of numbers (coerced).
 */
const numberArray = v.array(numberCoerce);

/** Output: number[] */
type NumberArray = v.InferOutput<typeof numberArray>;


/**
 * Record/map of string keys to numeric values.
 */
const numberMap = v.record(numberCoerce);

/** Output: Record<string, number> */
type NumberMap = v.InferOutput<typeof numberMap>;


/**
 * Enum-based numeric schema.
 * Accepts only specific numeric literal values.
 */
const numberEnum = (allowed: readonly number[]) =>
    v.union(allowed.map((n) => v.literal(n)), ERR.enumNumber);

/** Output: number literal union */
type NumberEnum<T extends readonly number[]> = T[number];


/* ========================================================================== *
 *  NUMERIC FIELD (COLLECTOR-STYLE)
 * ========================================================================== */

/**
 * Factory for standardized numeric fields with description metadata.
 */
const createNumberField = (description: string) =>
    v
        .object(
            {
                description: v.string("Description must be a string."),
                value: numberCoerce,
            },
            "Numeric field must be an object with { description, value }."
        )
        .pipe(
            v.transform((input) => ({
                description,
                value: input.value,
            }))
        );

/** Output for numeric field objects */
type NumberField<T extends string = string> = {
    description: T;
    value: number;
};


/* ========================================================================== *
 *  EXPORTS — ALWAYS AT THE END
 * ========================================================================== */

export {
    numberStrict,
    numberStrictOptional,
    numberStrictNullable,

    numberInteger,
    numberSafeInteger,

    numberCoerce,
    numberCoerceOptional,
    numberCoerceNullable,

    numberPositive,
    numberNonNegative,
    numberNegative,
    numberNonPositive,

    numberMin,
    numberMax,
    numberRange,
    numberStep,

    numberDefault,
    numberPresent,

    numberArray,
    numberMap,
    numberEnum,
    createNumberField,

    type NumberStrict,
    type NumberStrictOptional,
    type NumberStrictNullable,

    type NumberInteger,
    type NumberSafeInteger,

    type NumberCoerce,
    type NumberCoerceOptional,
    type NumberCoerceNullable,

    type NumberPositive,
    type NumberNonNegative,
    type NumberNegative,
    type NumberNonPositive,

    type NumberMin,
    type NumberMax,
    type NumberRange,
    type NumberStep,

    type NumberDefault,
    type NumberPresent,

    type NumberArray,
    type NumberMap,
    type NumberEnum,
    type NumberField,
};

/*
✅ SECTION 10 — ADDITIONAL NUMERIC SCHEMAS (MISSING FROM YOUR SET)

These represent the remaining numeric schema variants recognized in scientific, enterprise, and cross-domain schema systems (ISO 80000, SI, HL7, OpenAPI, GraphQL, JSON Schema, etc.).

⸻

Strict / atomic variants:
	1.	NUMBER-STRICT-COERCE SCHEMA — same as numberStrict but allows "123" → 123 coercion while still disallowing undefined/null.
	2.	NUMBER-STRICT-NULLABLE-OPTIONAL SCHEMA — allows either number, null, or undefined. Used in tolerant API models and form frameworks.
	3.	NUMBER-NONZERO SCHEMA — rejects 0, ensures number ≠ 0.

⸻

Mathematical / scientific extensions:
4. NUMBER-FINITE SCHEMA — rejects Infinity, -Infinity, and NaN.
5. NUMBER-NAN-SAFE SCHEMA — explicitly rejects NaN and optionally transforms it to null or throws.
6. NUMBER-INFINITY SCHEMA — allows only Infinity or -Infinity (for theoretical math/physics domains).
7. NUMBER-EPSILON SCHEMA — checks closeness within machine epsilon tolerance (≈2.22e−16).
8. NUMBER-ABSOLUTE SCHEMA — transforms number → Math.abs(number).

⸻

Range-related / constraint extensions:
9. NUMBER-CLAMP SCHEMA — clamps numeric inputs to a given [min, max] range instead of rejecting them.
10. NUMBER-EXCLUSIVE-RANGE SCHEMA — enforces (min, max) instead of [min, max] (strict inequalities).
11. NUMBER-MULTIPLE-OF SCHEMA — enforces divisibility constraint (e.g., multipleOf: 0.5).
12. NUMBER-SCALE SCHEMA — constrains number of decimal places (e.g., ≤2).

⸻

Coercion and tolerant ingestion:
13. NUMBER-BOOLEAN-COERCE SCHEMA — accepts booleans and coerces true→1, false→0.
14. NUMBER-NULLABLE-COERCE SCHEMA — accepts "", null, undefined → coerced to null, otherwise numeric.
15. NUMBER-STRING-COERCE-STRICT SCHEMA — only accepts strings that strictly match /^-?\d+(\.\d+)?$/.

⸻

Collection and composite forms:
16. NUMBER-TUPLE SCHEMA — fixed-length tuple of numeric elements (e.g., [x, y], [r, g, b], [lat, lon]).
17. NUMBER-MATRIX SCHEMA — nested array of numeric arrays (e.g., 2D matrices).
18. NUMBER-SET SCHEMA — validates a Set<number> where all elements pass numberCoerce.
19. NUMBER-MAP-STRICT SCHEMA — record with numeric keys and numeric values (for scientific mappings).
20. NUMBER-RANGE-PAIR SCHEMA — validates a tuple [min, max] with min <= max.

⸻

Meta / structural / semantic variants:
21. NUMBER-FIELD-OPTIONAL SCHEMA — variant of createNumberField that permits undefined value but still enforces description.
22. NUMBER-FIELD-NULLABLE SCHEMA — variant of createNumberField where value may be null.
23. NUMBER-FIELD-COERCE SCHEMA — same as field factory but coercively transforms strings → numbers.
24. NUMBER-ENUM-NAMED SCHEMA — enum schema mapping numbers to semantic names (e.g., { 0: "OFF", 1: "ON" }).
25. NUMBER-PERCENTAGE SCHEMA — ensures 0–100 inclusive, optionally coerces 0.75 ↔ 75%.
*/