import * as v from "valibot";

/* ========================================================================== *
 *  SHARED ERROR MESSAGES
 * -------------------------------------------------------------------------- */
 
const ERR = {
    string: "Expected a string value.",
    minLength: (min: number) =>
        `Must be at least ${min} characters long.`,
    maxLength: (max: number) =>
        `Must be at most ${max} characters long.`,
    lengthRange: (min: number, max: number) =>
        `Must be between ${min} and ${max} characters.`,
    pattern: "String does not match the required pattern.",
    email: "Invalid email address format.",
    url: "Invalid URL format.",
    uuid: "Invalid UUID format.",
    hostname: "Invalid hostname.",
    trim: "Expected a string after trimming.",
    invalidCoerce:
        "Expected a string or a convertible input (number, boolean).",
    enumString: "Expected one of the allowed string literal values.",
};


/* ========================================================================== *
 *  STRICT STRING SCHEMAS
 * ========================================================================== */

/**
 * Strict string schema.
 *
 * - Accepts only actual string values
 * - Rejects numbers, booleans, null, undefined, etc.
 */
const stringStrict = v.string(ERR.string);

/** Output: string */
type StringStrict = v.InferOutput<typeof stringStrict>;


/**
 * Optional strict string.
 * - Accepts undefined
 */
const stringStrictOptional = v.optional(stringStrict);

/** Output: string | undefined */
type StringStrictOptional = v.InferOutput<typeof stringStrictOptional>;


/**
 * Nullable strict string.
 * - Accepts null
 */
const stringStrictNullable = v.nullable(stringStrict);

/** Output: string | null */
type StringStrictNullable = v.InferOutput<typeof stringStrictNullable>;


/* ========================================================================== *
 *  STRING COERCION
 * -------------------------------------------------------------------------- *
 * Common use cases:
 *   - Sanitize incoming Worker/Express/Hono request data
 *   - Convert numbers/booleans safely into strings
 *   - Always get trimmed, normalized text
 * ========================================================================== */

/**
 * Coercing string schema.
 *
 * Accepts:
 *   - string
 *   - number
 *   - boolean
 * Returns:
 *   - normalized string representation
 */
const stringCoerce = v.coerce(
    v.string(ERR.string),
    (input: any) => {
        if (typeof input === "string") return input;
        if (typeof input === "number" || typeof input === "boolean") {
            return String(input);
        }
        throw new Error(ERR.invalidCoerce);
    }
);

/** Output: string */
type StringCoerce = v.InferOutput<typeof stringCoerce>;


/**
 * Optional coercing string.
 */
const stringCoerceOptional = v.optional(stringCoerce);

/** Output: string | undefined */
type StringCoerceOptional = v.InferOutput<typeof stringCoerceOptional>;


/**
 * Nullable coercing string.
 */
const stringCoerceNullable = v.nullable(stringCoerce);

/** Output: string | null */
type StringCoerceNullable = v.InferOutput<typeof stringCoerceNullable>;


/* ========================================================================== *
 *  TRIMMED STRING
 * -------------------------------------------------------------------------- *
 * Ensures whitespace is trimmed and optionally collapsed.
 * ========================================================================== */

/**
 * Trimmed string (common use case for user input).
 */
const stringTrimmed = stringCoerce.pipe(
    v.transform((s) => s.trim())
);

/** Output: string */
type StringTrimmed = v.InferOutput<typeof stringTrimmed>;


/**
 * Trim + collapse internal whitespace (multiple → single space).
 */
const stringNormalized = stringTrimmed.pipe(
    v.transform((s) => s.replace(/\s+/g, " "))
);

/** Output: string */
type StringNormalized = v.InferOutput<typeof stringNormalized>;


/* ========================================================================== *
 *  LENGTH-CONSTRAINED STRING SCHEMAS
 * ========================================================================== */

/**
 * Minimum-length string.
 */
const stringMin = (min: number) =>
    stringTrimmed.pipe(v.minLength(min, ERR.minLength(min)));

/** Output: string (min length applied) */
type StringMin = string;


/**
 * Maximum-length string.
 */
const stringMax = (max: number) =>
    stringTrimmed.pipe(v.maxLength(max, ERR.maxLength(max)));

/** Output: string (max length applied) */
type StringMax = string;


/**
 * String length range.
 */
const stringLengthRange = (min: number, max: number) =>
    stringTrimmed.pipe(
        v.minLength(min, ERR.lengthRange(min, max)),
        v.maxLength(max, ERR.lengthRange(min, max))
    );

/** Output: string (range applied) */
type StringLengthRange = string;


/* ========================================================================== *
 *  PATTERN-BASED STRINGS
 * ========================================================================== */

/**
 * Regex-based pattern schema.
 */
const stringPattern = (pattern: RegExp) =>
    stringTrimmed.pipe(v.regex(pattern, ERR.pattern));

/** Output: string */
type StringPattern = string;


/**
 * Email string schema.
 */
const stringEmail = stringTrimmed.pipe(
    v.email(ERR.email)
);

/** Output: string (valid email) */
type StringEmail = v.InferOutput<typeof stringEmail>;


/**
 * URL string schema.
 */
const stringUrl = stringTrimmed.pipe(v.url(ERR.url));

/** Output: string (valid URL) */
type StringUrl = v.InferOutput<typeof stringUrl>;


/**
 * UUID schema.
 */
const stringUuid = stringTrimmed.pipe(v.uuid(ERR.uuid));

/** Output: string (valid UUID) */
type StringUuid = v.InferOutput<typeof stringUuid>;


/**
 * Hostname validator (HTTP-safe, RFC 1123 compatible).
 */
const stringHostname = stringTrimmed.pipe(
    v.regex(
        /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/,
        ERR.hostname
    )
);

/** Output: string (valid hostname label) */
type StringHostname = v.InferOutput<typeof stringHostname>;


/* ========================================================================== *
 *  CASE TRANSFORMERS
 * ========================================================================== */

/** Convert to lowercase. */
const stringLowercase = stringTrimmed.pipe(
    v.transform((s) => s.toLowerCase())
);

/** Output: string */
type StringLowercase = v.InferOutput<typeof stringLowercase>;


/** Convert to UPPERCASE. */
const stringUppercase = stringTrimmed.pipe(
    v.transform((s) => s.toUpperCase())
);

/** Output: string */
type StringUppercase = v.InferOutput<typeof stringUppercase>;


/** Capitalize first letter. */
const stringCapitalized = stringTrimmed.pipe(
    v.transform((s) => s.charAt(0).toUpperCase() + s.slice(1))
);

/** Output: string */
type StringCapitalized = v.InferOutput<typeof stringCapitalized>;


/* ========================================================================== *
 *  ENUM STRINGS
 * ========================================================================== */

/**
 * Enum-based string schema.
 * Accepts only specific literal strings.
 */
const stringEnum = <T extends readonly string[]>(allowed: T) =>
    v.union(allowed.map((s) => v.literal(s)), ERR.enumString);

/** Output: union of allowed literal strings */
type StringEnum<T extends readonly string[]> = T[number];


/* ========================================================================== *
 *  DEFAULTED STRING
 * ========================================================================== */

/**
 * String that defaults to a specified value.
 */
const stringDefault = (value: string) =>
    v.optional(stringCoerce, () => value);

/** Output: string */
type StringDefault = string;


/* ========================================================================== *
 *  STRING PRESENT (KEY MUST BE PRESENT)
 * ========================================================================== */

/**
 * Present string (not undefined, not null).
 * Useful for PATCH or required object keys.
 */
const stringPresent = v.custom(
    (value) => typeof value === "string",
    ERR.string
);

/** Output: string */
type StringPresent = v.InferOutput<typeof stringPresent>;


/* ========================================================================== *
 *  STRING ARRAY / MAP
 * ========================================================================== */

/**
 * Array of strings.
 */
const stringArray = v.array(stringTrimmed);

/** Output: string[] */
type StringArray = v.InferOutput<typeof stringArray>;


/**
 * Map of string keys to string values.
 */
const stringMap = v.record(stringTrimmed);

/** Output: Record<string, string> */
type StringMap = v.InferOutput<typeof stringMap>;


/* ========================================================================== *
 *  COLLECTOR-STYLE STRING FIELD
 * ========================================================================== */

/**
 * Standardized collector string field.
 *
 * Output:
 *   { description: string; value: string }
 */
const createStringField = (description: string) =>
    v
        .object(
            {
                description: v.string("Description must be a string."),
                value: stringTrimmed,
            },
            "String field must be an object with { description, value }."
        )
        .pipe(
            v.transform((i) => ({
                description,
                value: i.value,
            }))
        );

/** Output: typed collector field */
type StringField<T extends string = string> = {
    description: T;
    value: string;
};


/* ========================================================================== *
 *  EXPORTS — ALWAYS AT THE END
 * ========================================================================== */

export {
    stringStrict,
    stringStrictOptional,
    stringStrictNullable,

    stringCoerce,
    stringCoerceOptional,
    stringCoerceNullable,

    stringTrimmed,
    stringNormalized,

    stringMin,
    stringMax,
    stringLengthRange,

    stringPattern,
    stringEmail,
    stringUrl,
    stringUuid,
    stringHostname,

    stringLowercase,
    stringUppercase,
    stringCapitalized,

    stringEnum,
    stringDefault,
    stringPresent,

    stringArray,
    stringMap,
    createStringField,

    type StringStrict,
    type StringStrictOptional,
    type StringStrictNullable,

    type StringCoerce,
    type StringCoerceOptional,
    type StringCoerceNullable,

    type StringTrimmed,
    type StringNormalized,

    type StringMin,
    type StringMax,
    type StringLengthRange,

    type StringPattern,
    type StringEmail,
    type StringUrl,
    type StringUuid,
    type StringHostname,

    type StringLowercase,
    type StringUppercase,
    type StringCapitalized,

    type StringEnum,
    type StringDefault,
    type StringPresent,

    type StringArray,
    type StringMap,
    type StringField,
};

import * as v from "valibot";

/* ========================================================================== *
 *  CASE TRANSFORMATION HELPERS (PURE FUNCTIONS)
 * -------------------------------------------------------------------------- */

function toCamelCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}

function toPascalCase(input: string): string {
  const camel = toCamelCase(input);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function toSnakeCase(input: string): string {
  return input
    .trim()
    .replace(/[\s\-\.\/]+/g, "_")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

function toScreamingSnakeCase(input: string): string {
  return toSnakeCase(input).toUpperCase();
}

function toKebabCase(input: string): string {
  return input
    .trim()
    .replace(/[\s_\.\/]+/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

function toTrainCase(input: string): string {
  return toKebabCase(input)
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("-");
}

function toDotCase(input: string): string {
  return input
    .trim()
    .replace(/[\s_\-\/]+/g, ".")
    .replace(/([a-z0-9])([A-Z])/g, "$1.$2")
    .toLowerCase();
}

function toSwapCase(input: string): string {
  return input.replace(/[a-zA-Z]/g, (c) =>
    c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()
  );
}

function toPathCase(input: string): string {
  return input
    .trim()
    .replace(/[\s_\-\.]+/g, "/")
    .replace(/([a-z0-9])([A-Z])/g, "$1/$2")
    .toLowerCase();
}

function toSlugCase(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toCleanCase(input: string): string {
  return input.replace(/[^a-zA-Z0-9]+/g, "");
}

function toSentenceCase(input: string): string {
  const out = input.trim();
  if (!out) return out;
  return out.charAt(0).toUpperCase() + out.slice(1).toLowerCase();
}

function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}


/* ========================================================================== *
 *  BASE STRING SCHEMA (TRIMMED, NORMALIZED)
 * -------------------------------------------------------------------------- */

const baseString = v.string("Expected a string.").pipe(
  v.transform((s) => s.trim())
);


/* ========================================================================== *
 *  CASE TRANSFORMATION SCHEMAS (Valibot 1.2.0)
 * ========================================================================== */

/**
 * Lowercase transformer.
 */
const stringLowercase = baseString.pipe(
  v.transform((s) => s.toLowerCase())
);

/** Output: string (lowercase) */
type StringLowercase = v.InferOutput<typeof stringLowercase>;


/**
 * Uppercase transformer.
 */
const stringUppercase = baseString.pipe(
  v.transform((s) => s.toUpperCase())
);

/** Output: string (uppercase) */
type StringUppercase = v.InferOutput<typeof stringUppercase>;


/**
 * First-letter capitalization.
 */
const stringCapitalized = baseString.pipe(
  v.transform((s) => s.charAt(0).toUpperCase() + s.slice(1))
);

/** Output: string (Capitalized) */
type StringCapitalized = v.InferOutput<typeof stringCapitalized>;


/**
 * Title-case (every word capitalized).
 */
const stringTitleCase = baseString.pipe(
  v.transform(toTitleCase)
);

/** Output: string (Title Case) */
type StringTitleCase = v.InferOutput<typeof stringTitleCase>;


/**
 * Sentence-case (first letter capitalized, rest lowercased).
 */
const stringSentenceCase = baseString.pipe(
  v.transform(toSentenceCase)
);

/** Output: string (Sentence case) */
type StringSentenceCase = v.InferOutput<typeof stringSentenceCase>;


/**
 * camelCase
 */
const stringCamelCase = baseString.pipe(
  v.transform(toCamelCase)
);

/** Output: string (camelCase) */
type StringCamelCase = v.InferOutput<typeof stringCamelCase>;


/**
 * PascalCase
 */
const stringPascalCase = baseString.pipe(
  v.transform(toPascalCase)
);

/** Output: string (PascalCase) */
type StringPascalCase = v.InferOutput<typeof stringPascalCase>;


/**
 * snake_case
 */
const stringSnakeCase = baseString.pipe(
  v.transform(toSnakeCase)
);

/** Output: string (snake_case) */
type StringSnakeCase = v.InferOutput<typeof stringSnakeCase>;


/**
 * SCREAMING_SNAKE_CASE
 */
const stringScreamingSnakeCase = baseString.pipe(
  v.transform(toScreamingSnakeCase)
);

/** Output: string (SCREAMING_SNAKE_CASE) */
type StringScreamingSnakeCase = v.InferOutput<typeof stringScreamingSnakeCase>;


/**
 * kebab-case
 */
const stringKebabCase = baseString.pipe(
  v.transform(toKebabCase)
);

/** Output: string (kebab-case) */
type StringKebabCase = v.InferOutput<typeof stringKebabCase>;


/**
 * Train-Case (Capitalized-Kebab-Case)
 */
const stringTrainCase = baseString.pipe(
  v.transform(toTrainCase)
);

/** Output: string (Train-Case) */
type StringTrainCase = v.InferOutput<typeof stringTrainCase>;


/**
 * dot.case
 */
const stringDotCase = baseString.pipe(
  v.transform(toDotCase)
);

/** Output: string (dot.case) */
type StringDotCase = v.InferOutput<typeof stringDotCase>;


/**
 * swapCASE (invert case of each letter)
 */
const stringSwapCase = baseString.pipe(
  v.transform(toSwapCase)
);

/** Output: string (sWAPcASE) */
type StringSwapCase = v.InferOutput<typeof stringSwapCase>;


/**
 * path/case
 */
const stringPathCase = baseString.pipe(
  v.transform(toPathCase)
);

/** Output: string (path/case) */
type StringPathCase = v.InferOutput<typeof stringPathCase>;


/**
 * Slugified case (a-z0-9- only)
 * Ideal for URL slugs.
 */
const stringSlugCase = baseString.pipe(
  v.transform(toSlugCase)
);

/** Output: string (slug-format) */
type StringSlugCase = v.InferOutput<typeof stringSlugCase>;


/**
 * CleanCase (remove all non-alphanumeric)
 */
const stringCleanCase = baseString.pipe(
  v.transform(toCleanCase)
);

/** Output: string (alphanumeric-only) */
type StringCleanCase = v.InferOutput<typeof stringCleanCase>;


/* ========================================================================== *
 *  EXPORTS — ALWAYS AT THE END
 * ========================================================================== */

export {
  stringLowercase,
  stringUppercase,
  stringCapitalized,
  stringTitleCase,
  stringSentenceCase,

  stringCamelCase,
  stringPascalCase,
  stringSnakeCase,
  stringScreamingSnakeCase,
  stringKebabCase,
  stringTrainCase,
  stringDotCase,
  stringSwapCase,
  stringPathCase,
  stringSlugCase,
  stringCleanCase,

  type StringLowercase,
  type StringUppercase,
  type StringCapitalized,
  type StringTitleCase,
  type StringSentenceCase,

  type StringCamelCase,
  type StringPascalCase,
  type StringSnakeCase,
  type StringScreamingSnakeCase,
  type StringKebabCase,
  type StringTrainCase,
  type StringDotCase,
  type StringSwapCase,
  type StringPathCase,
  type StringSlugCase,
  type StringCleanCase,
};

/*
✅ SECTION 1 — CORE STRING TYPES
	1.	STRING-BASIC SCHEMA
	2.	STRING-STRICT SCHEMA (no coercion)
	3.	STRING-COERCE SCHEMA (any→string)
	4.	STRING-NULLABLE SCHEMA
	5.	STRING-OPTIONAL SCHEMA
	6.	STRING-DEFAULT SCHEMA (fallback value)
	7.	STRING-NONEMPTY SCHEMA (length > 0)
	8.	STRING-EMPTY-ALLOW SCHEMA
	9.	STRING-TRIMMED SCHEMA
	10.	STRING-SAFE-TRIMMED SCHEMA (no whitespace edges)
	11.	STRING-WHITESPACE-ONLY SCHEMA
	12.	STRING-ALPHANUMERIC SCHEMA
	13.	STRING-ALPHA SCHEMA
	14.	STRING-NUMERIC SCHEMA
	15.	STRING-DECIMAL SCHEMA
	16.	STRING-INTEGER-LIKE SCHEMA
	17.	STRING-BOOLEAN-LIKE SCHEMA (“true”/“false”)
	18.	STRING-UUID-LIKE SCHEMA
	19.	STRING-ULID-LIKE SCHEMA
	20.	STRING-DATE-LIKE SCHEMA (ISO 8601)

⸻

✅ SECTION 2 — LENGTH & CHARACTER RESTRICTIONS
	21.	STRING-MIN-LENGTH SCHEMA
	22.	STRING-MAX-LENGTH SCHEMA
	23.	STRING-LENGTH-RANGE SCHEMA
	24.	STRING-FIXED-LENGTH SCHEMA
	25.	STRING-BYTE-LENGTH-SCHEMA (UTF-8 bytes)
	26.	STRING-CODEPOINT-COUNT SCHEMA
	27.	STRING-NO-ZERO-WIDTH CHARACTERS SCHEMA
	28.	STRING-NO-CONTROL-CHARS SCHEMA
	29.	STRING-PRINTABLE-ONLY SCHEMA
	30.	STRING-VISIBLE-ONLY SCHEMA
	31.	STRING-LOWERCASE-ONLY SCHEMA
	32.	STRING-UPPERCASE-ONLY SCHEMA
	33.	STRING-TITLECASE SCHEMA
	34.	STRING-CAMELCASE SCHEMA
	35.	STRING-KEBABCASE SCHEMA
	36.	STRING-SNAKECASE SCHEMA
	37.	STRING-PASCALCASE SCHEMA
	38.	STRING-CONSTANTCASE SCHEMA
	39.	STRING-TRIM-AND-NORMALIZE SCHEMA
	40.	STRING-ASCII-ONLY SCHEMA

⸻

✅ SECTION 3 — REGEX / PATTERN VALIDATION
	41.	STRING-REGEX SCHEMA (custom pattern)
	42.	STRING-EMAIL SCHEMA
	43.	STRING-URL SCHEMA (HTTP/HTTPS)
	44.	STRING-URI SCHEMA (general)
	45.	STRING-IPV4 SCHEMA
	46.	STRING-IPV6 SCHEMA
	47.	STRING-DOMAIN NAME SCHEMA
	48.	STRING-HOSTNAME SCHEMA
	49.	STRING-SLUG SCHEMA (URL-safe)
	50.	STRING-PATH SCHEMA (filesystem safe)
	51.	STRING-FILENAME SCHEMA
	52.	STRING-EXTENSION SCHEMA (file ext)
	53.	STRING-MIMETYPE SCHEMA
	54.	STRING-HEX SCHEMA
	55.	STRING-BASE64 SCHEMA
	56.	STRING-JWT SCHEMA
	57.	STRING-HTML-TAG-SCHEMA
	58.	STRING-MARKDOWN-INLINE SCHEMA
	59.	STRING-CSS-COLOR SCHEMA
	60.	STRING-CSS-LENGTH SCHEMA (px|em|rem|%)

⸻

✅ SECTION 4 — LOCALIZATION & UNICODE
	61.	STRING-UNICODE-SCHEMA
	62.	STRING-UTF8-VALIDATION SCHEMA
	63.	STRING-UTF16-VALIDATION SCHEMA
	64.	STRING-NORMALIZED-NFC SCHEMA
	65.	STRING-NORMALIZED-NFD SCHEMA
	66.	STRING-NORMALIZED-NFKC SCHEMA
	67.	STRING-NORMALIZED-NFKD SCHEMA
	68.	STRING-NO-EMOJI SCHEMA
	69.	STRING-ALLOW-EMOJI SCHEMA
	70.	STRING-RTL-TEXT-SCHEMA
	71.	STRING-LTR-TEXT-SCHEMA
	72.	STRING-LOCALE-AWARE-COMPARE SCHEMA
	73.	STRING-COLLATOR-SORT-SCHEMA
	74.	STRING-LOCALE-CODE SCHEMA (“en-CA”)
	75.	STRING-LANGUAGE-TAG SCHEMA (BCP 47)
	76.	STRING-SCRIPT-CODE SCHEMA (“Latn”)
	77.	STRING-COUNTRY-CODE SCHEMA (ISO 3166-1 α2)
	78.	STRING-CURRENCY-CODE SCHEMA (ISO 4217)
	79.	STRING-TIMEZONE-ID SCHEMA (IANA)
	80.	STRING-UNIT-SYMBOL SCHEMA (SI symbols)

⸻

✅ SECTION 5 — SECURITY & SAFETY
	81.	STRING-SAFE-HTML SCHEMA (escaped)
	82.	STRING-SAFE-SQL SCHEMA
	83.	STRING-SAFE-REGEX-ESCAPED SCHEMA
	84.	STRING-SAFE-PATH-SCHEMA (no traversal)
	85.	STRING-SAFE-SHELL-ARG SCHEMA
	86.	STRING-NO-XSS-PAYLOAD SCHEMA
	87.	STRING-NO-INJECTION SCHEMA
	88.	STRING-SAFE-HEADER-VALUE SCHEMA
	89.	STRING-SAFE-COOKIE-VALUE SCHEMA
	90.	STRING-SAFE-QUERY-VALUE SCHEMA
	91.	STRING-NO-NULL-BYTE SCHEMA
	92.	STRING-NO-ZERO-BYTE SCHEMA
	93.	STRING-NO-ESCAPE-SEQUENCES SCHEMA
	94.	STRING-SAFE-ENCODED-URI SCHEMA
	95.	STRING-SAFE-TOKEN-SCHEMA (api keys)
	96.	STRING-OBFUSCATABLE SCHEMA
	97.	STRING-MASKED-SCHEMA (****1234)
	98.	STRING-HASHED-SCHEMA (SHA-256 hex)
	99.	STRING-ENCRYPTED-SCHEMA
	100.	STRING-CHECKSUM-SCHEMA (MD5/SHA)

⸻

✅ SECTION 6 — DOMAIN / BUSINESS SEMANTICS
	101.	STRING-USERNAME SCHEMA
	102.	STRING-PASSWORD SCHEMA
	103.	STRING-EMAIL-ADDRESS-STRICT SCHEMA
	104.	STRING-PHONE-NUMBER-E164 SCHEMA
	105.	STRING-PHONE-INTERNATIONAL SCHEMA
	106.	STRING-POSTAL-CODE SCHEMA
	107.	STRING-ADDRESS-LINE SCHEMA
	108.	STRING-CITY-NAME SCHEMA
	109.	STRING-REGION-NAME SCHEMA
	110.	STRING-COUNTRY-NAME SCHEMA
	111.	STRING-CREDIT-CARD-NUMBER SCHEMA
	112.	STRING-CVV-SCHEMA
	113.	STRING-IBAN SCHEMA
	114.	STRING-SWIFT-CODE SCHEMA
	115.	STRING-LICENSE-PLATE SCHEMA
	116.	STRING-VIN SCHEMA
	117.	STRING-PRODUCT-SKU SCHEMA
	118.	STRING-ORDER-ID SCHEMA
	119.	STRING-INVOICE-NUMBER SCHEMA
	120.	STRING-CUSTOMER-ID SCHEMA
	121.	STRING-ORG-ID SCHEMA
	122.	STRING-PROJECT-ID SCHEMA
	123.	STRING-TRANSACTION-ID SCHEMA
	124.	STRING-SESSION-TOKEN SCHEMA
	125.	STRING-API-KEY SCHEMA
	126.	STRING-GIT-HASH SCHEMA
	127.	STRING-GIT-BRANCH-SCHEMA
	128.	STRING-GIT-TAG-SCHEMA
	129.	STRING-PACKAGE-NAME SCHEMA
	130.	STRING-NPM-SCOPE SCHEMA
	131.	STRING-SEMVER-STRING SCHEMA
	132.	STRING-DOCKER-TAG SCHEMA
	133.	STRING-K8S-RESOURCE-NAME SCHEMA
	134.	STRING-DOMAIN-SLUG-SCHEMA
	135.	STRING-TENANT-SLUG-SCHEMA
	136.	STRING-ENV-VAR-NAME SCHEMA
	137.	STRING-CONFIG-KEY SCHEMA
	138.	STRING-PATH-PARAM SCHEMA
	139.	STRING-QUERY-PARAM SCHEMA
	140.	STRING-FRIENDLY-DISPLAY-NAME SCHEMA

⸻

✅ SECTION 7 — COERCION / TRANSFORMATION
	141.	STRING-TRIM-COERCE SCHEMA
	142.	STRING-LOWERCASE-COERCE SCHEMA
	143.	STRING-UPPERCASE-COERCE SCHEMA
	144.	STRING-TITLECASE-COERCE SCHEMA
	145.	STRING-CAMELCASE-COERCE SCHEMA
	146.	STRING-SNAKECASE-COERCE SCHEMA
	147.	STRING-KEBABCASE-COERCE SCHEMA
	148.	STRING-PASCALCASE-COERCE SCHEMA
	149.	STRING-NORMALIZE-UNICODE COERCE SCHEMA
	150.	STRING-REMOVE-DIACRITICS SCHEMA
	151.	STRING-STRIP-HTML TAGS SCHEMA
	152.	STRING-ESCAPE-HTML SCHEMA
	153.	STRING-UNESCAPE-HTML SCHEMA
	154.	STRING-ESCAPE-REGEX SCHEMA
	155.	STRING-UNESCAPE-REGEX SCHEMA
	156.	STRING-TRUNCATE-SCHEMA (max len)
	157.	STRING-PAD-LEFT-SCHEMA
	158.	STRING-PAD-RIGHT-SCHEMA
	159.	STRING-REPLACE-PATTERN SCHEMA
	160.	STRING-SPLIT-BY-DELIMITER SCHEMA
	161.	STRING-JOIN-ARRAY SCHEMA
	162.	STRING-INTERPOLATE-TEMPLATE SCHEMA
	163.	STRING-SLICE-RANGE SCHEMA
	164.	STRING-REMOVE-PREFIX-SCHEMA
	165.	STRING-REMOVE-SUFFIX-SCHEMA
	166.	STRING-ENSURE-PREFIX-SCHEMA
	167.	STRING-ENSURE-SUFFIX-SCHEMA
	168.	STRING-STRIP-PREFIX-SCHEMA
	169.	STRING-STRIP-SUFFIX-SCHEMA
	170.	STRING-COMPRESS-WHITESPACE-SCHEMA
	171.	STRING-NORMALIZE-NEWLINES-SCHEMA
	172.	STRING-NORMALIZE-SPACES-SCHEMA
	173.	STRING-COLLAPSE-MULTISPACES-SCHEMA
	174.	STRING-SAFE-JSONIFY-SCHEMA
	175.	STRING-ENSURE-ENCODING-UTF8 SCHEMA
	176.	STRING-ENSURE-ENCODING-ASCII SCHEMA
	177.	STRING-ENCODE-URI-SCHEMA
	178.	STRING-DECODE-URI-SCHEMA
	179.	STRING-ENCODE-BASE64-SCHEMA
	180.	STRING-DECODE-BASE64-SCHEMA

⸻

✅ SECTION 8 — ADVANCED UTILITIES & MAPPERS
	181.	STRING-TEMPLATE-VARIABLES SCHEMA ({user})
	182.	STRING-INTERNATIONAL-PHONE NORMALIZE SCHEMA
	183.	STRING-DETECT-LANGUAGE SCHEMA
	184.	STRING-TRANSLITERATE-SCHEMA
	185.	STRING-DETECT-ENCODING SCHEMA
	186.	STRING-VALIDATE-ENCODING SCHEMA
	187.	STRING-SENTENCE-CASE SCHEMA
	188.	STRING-WORD-COUNT SCHEMA
	189.	STRING-CHAR-COUNT SCHEMA
	190.	STRING-IS-JSON SCHEMA
	191.	STRING-IS-YAML SCHEMA
	192.	STRING-IS-CSV SCHEMA
	193.	STRING-IS-HTML SCHEMA
	194.	STRING-IS-MARKDOWN SCHEMA
	195.	STRING-IS-XML SCHEMA
	196.	STRING-IS-CODE-FRAGMENT SCHEMA
	197.	STRING-IS-SAFE-IDENTIFIER SCHEMA
	198.	STRING-IS-RESERVED-WORD SCHEMA
	199.	STRING-SAFE-IDENTIFIER-SCHEMA
	200.	STRING-VALID-ENV-NAME-SCHEMA
*/