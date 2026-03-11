import { z } from "zod";

import {
    any,
    array,
    check,
    InferOutput,
    instance,
    integer,
    literal,
    maxValue,
    minValue,
    number,
    optional,
    parse,
    picklist,
    pipe,
    regex,
    strictObject,
    string,
    transform,
    union,
    unknown,
    uuid,
    void_,
} from "valibot";

// TODO: Alias Imports
import { CACHE_TTL_LIMITS, COMMENT_TOKENS, ENVIRONMENT, GLOBAL_ERROR_CONTEXT_SCHEMA_VERSION, HEADER_CACHE_CONTROL_FAILURE_VALUES, HEADER_CACHE_CONTROL_SUCCESS_VALUE, HEADER_EXPIRES_VALUES, HEADER_PRAGMA_VALUES, HEADER_REFERRER_POLICY_VALUES, HEADER_VARY_VALUES, HEADER_X_CONTENT_TYPE_OPTIONS_VALUES, HEADER_X_FRAME_OPTIONS_VALUES, HEADER_X_ROBOTS_TAG_VALUES, HTTP_MIME_TYPES, HTTP_MIME_TYPES_CHARSETS, ISSUE_TYPES, OWNERS, RESPONSE_TYPE, RUNTIME, SEVERITY } from "../common/constants";

export const requestIdSchema = uuid()

export type RequestId = InferOutput<typeof requestIdSchema>

export const ERROR_MESSAGE_KEYS = {
    NON_NEGATIVE_INTEGER_TYPE_INVALID: "The value was expected to be a whole integer with no decimal component, but a non-integer or fractional value was provided, which violates the schema’s strict numeric type contract.",
    NON_NEGATIVE_INTEGER_MIN_VALUE_INVALID: "The value was expected to be a whole integer greater than or equal to zero, but a negative number was received, which violates the minimum value constraint required by the schema.",
    REGEXP_INVALID_TYPE: "The value was expected to be a valid JavaScript RegExp object representing a compiled regular expression pattern, but a non-RegExp value was received, which violates the required runtime type and semantic contract for pattern validation.",

    EXPECTS_STRING: "The value was expected to be a string representing a URL, but a non-string value was provided, which violates the schema’s structural requirement for textual URL validation.",
    EXPECTS_HTTPS_URL: "The value was expected to be a non-empty HTTPS URL using the https:// scheme with no whitespace, but the provided value did not meet this requirement, violating the schema’s contractual constraint for secure URL structure.",

    UNICODE_STRING_NOT_STRING:
        "The value was expected to be a string capable of containing Unicode characters, but a non-string value was received, which violates the schema’s contractual requirement for textual data.",
    UNICODE_STRING_INVALID:
        "The value was expected to be a valid Unicode string, but the provided content contains characters or structures that cannot be represented under Unicode semantics, breaking the schema’s structural and semantic guarantees.",

    SCHEMA_URL_JSON_STRING: 'A string value was expected for the schema URL, but a non-string value was received, which violates the schema contract because URL validation can only be applied to textual inputs.',
    SCHEMA_URL_JSON_FORMAT: 'An HTTP or HTTPS URL ending in a .json resource was expected, but a value not conforming to this structure was received, which violates the schema’s structural and semantic requirements for a valid JSON schema reference.',

    IOS_BUNDLE_ID_INVALID:
        'The iOS bundle identifier was expected to be a dot-separated reverse-DNS string composed only of letters and digits with each segment starting with a letter, but a value was provided that does not meet these structural and semantic requirements and therefore cannot be accepted as a valid Apple-compliant bundle identifier.',

    ANDROID_PACKAGE_NAME_TYPE:
        'The Android application package name was expected to be a non-empty lowercase string value, but a value of a different type or structure was provided, which violates the required schema contract for Android package identifiers.',
    ANDROID_PACKAGE_NAME_FORMAT:
        'The Android application package name was expected to be lowercase, dot-separated, start with a letter, and contain only lowercase letters, digits, or underscores per segment, but the provided value does not conform to this structural format and therefore breaks Android package naming requirements.',
    VERSION_EXPECTED_STRING:
        'A semantic version string was expected, but a non-string value was received, which violates the schema requirement that version identifiers must be provided as textual data conforming to Semantic Versioning 2.0.0.',
    VERSION_INVALID_SEMVER:
        'A semantic version compliant with Semantic Versioning 2.0.0 was expected in the form MAJOR.MINOR.PATCH with optional prerelease and build metadata, but the provided string does not match the required structure or numeric constraints, breaking the contractual versioning guarantees.',

    UPTIME_SECONDS_NUMBER: "The uptime value must be provided as a numeric value, but a non-numeric value was received, which violates the schema requirement that uptime be represented as a number of seconds.",
    UPTIME_SECONDS_INTEGER: "The uptime value must be a whole number without any fractional component, but a non-integer number was received, which breaks the schema’s requirement for discrete second precision.",
    UPTIME_SECONDS_MIN_VALUE: "The uptime value must be zero or greater to represent a non-negative duration in seconds, but a negative number was received, which violates the schema’s semantic contract for uptime.",

    TIMESTAMP_EXPECTED_STRING:
        "The timestamp value was expected to be a string representing a strict RFC 3339 / ISO 8601 UTC timestamp, but a non-string value was received, which violates the schema’s contractual requirement for a textual temporal representation.",
    TIMESTAMP_INVALID_UTC_FORMAT:
        "The timestamp value was expected to strictly match the UTC-only RFC 3339 / ISO 8601 format YYYY-MM-DDTHH:mm:ssZ without fractional seconds, but the provided string did not conform to this structure, breaking the schema’s structural and semantic guarantees.",

    INVALID_TIMESTAMP_AS_DATE:
        "The provided timestamp was expected to represent a valid calendar date but instead resolved to an invalid or non-existent point in time, which violates the schema’s requirement for a semantically valid and constructible Date instance.",

    COMMIT_SHORT_STRING_EXPECTED:
        'A short git commit hash was expected to be provided as a string value, but a non-string value was received, which violates the schema contract requiring textual hexadecimal input.',
    COMMIT_SHORT_FORMAT_INVALID:
        'A short git commit hash was expected to consist of exactly seven hexadecimal characters using only uppercase or lowercase digits 0–9 and letters A–F, but the provided value did not meet this structural requirement and therefore breaks the schema’s validation contract.',

    CACHE_TTL_NOT_A_NUMBER:
        "The cache TTL value must be a number expressed in seconds, but a non-numeric value was provided, which violates the requirement for a numeric cache duration.",

    CACHE_TTL_NOT_AN_INTEGER:
        "The cache TTL value must be an integer number of seconds, but a fractional or non-integer value was provided, which is invalid for HTTP cache-control semantics.",

    CACHE_TTL_BELOW_MIN:
        "The cache TTL value is below the minimum allowed number of seconds, which violates the lower bound required to ensure valid and predictable caching behavior.",

    CACHE_TTL_ABOVE_MAX:
        "The cache TTL value exceeds the maximum allowed number of seconds, which violates the upper bound imposed to prevent excessively long or unsafe caching durations.",

    PATHNAME_NOT_A_STRING:
        "The request pathname must be provided as a string, but a non-string value was received, which violates the requirement for a valid URL pathname.",

    PATHNAME_INVALID_FORMAT:
        "The request pathname does not match the required pathname format, which violates the structural constraints defined for valid static asset routes.",

    RUNTIME_INVALID:
        "The runtime value must be one of the supported execution environments, but an unsupported or missing runtime was provided, violating the global error context contract.",

    ENVIRONMENT_INVALID:
        "The environment value must be one of the allowed deployment environments, but an invalid or unsupported environment was received.",

    SERVICE_NAME_INVALID:
        "The serviceName field must be a non-empty string identifying the service emitting the error, but an invalid value was provided.",

    SERVICE_NAME_REGEX_INVALID:
        "The service name is invalid because it does not match the required naming pattern, which violates the contract for consistent, machine-identifiable service naming across environments.",

    SERVICE_VERSION_INVALID:
        "The serviceVersion field must be a valid string representing the deployed service version, but an invalid value was received.",

    DEPLOYMENT_ID_INVALID:
        "The deploymentId field must be a valid string uniquely identifying the deployment instance, but an invalid value was provided.",

    DEPLOYMENT_ID_FORMAT_INVALID:
        "The deployment identifier value is invalid because it does not match the required format defined by the deployment ID regular expression, which violates the contract for uniquely and reliably identifying a deployment.",

    SEVERITY_INVALID:
        "The severity field must be one of the allowed severity levels, but an invalid severity value was received.",

    TIMESTAMP_INVALID:
        "The timestamp field must be a valid ISO-8601 formatted string representing when the error occurred, but an invalid value was provided.",

    ERROR_CODE_INVALID:
        "The errorCode field must be a non-empty string identifying the error condition, but an invalid value was received.",

    SCHEMA_VERSION_INVALID:
        "The schemaVersion field must be a valid version string identifying the error context schema, but an invalid value was provided.",

    CORRELATION_ID_INVALID:
        "The correlationId field must be a valid string used to correlate logs and requests across systems, but an invalid value was received.",

    OWNER_INVALID:
        "The owner field must be a valid string identifying the responsible team or system owner, but an invalid value was provided.",

    ROUTE_INVALID:
        "The request route must be a valid string representing the resolved request path, but an invalid value was provided.",

    CACHE_TTL_INVALID:
        "The cache TTL must be a valid number of seconds indicating cache duration, but an invalid value was received.",

    RESPONSE_TYPE_INVALID:
        "The response type must be one of the supported response formats, but an invalid response type was received.",

    BASE_ERROR_CONTEXT_INVALID:
        "The base error context object does not conform to the required global error context schema, which violates the structural and semantic contract expected for consistent error reporting across all runtimes.",

    SPAN_TIMER_INVALID:
        "The spanTimer object does not conform to the required timing interface, which violates the contract for capturing and reporting execution timing information.",

    SPAN_TIMER_MARK_START_INVALID:
        "The markStart function must be a callable function that accepts a valid phase identifier and returns a span start timestamp, but an invalid implementation was provided.",

    SPAN_TIMER_MARK_END_INVALID:
        "The markEnd function must be a callable function that accepts a valid phase identifier and a corresponding span start value and completes the span, but an invalid implementation was provided.",

    SPAN_TIMER_TO_SERVER_TIMING_INVALID:
        "The toServerTimingHeader function must be a callable function that returns a valid Server-Timing header string, but an invalid implementation was provided.",

    SPAN_TIMER_PHASE_INVALID:
        "The span phase identifier must be a valid numeric value representing a registered execution phase, but an invalid value was provided.",

    SPAN_START_INVALID:
        "The span start value must be a valid numeric timestamp representing the start of a timing span, but an invalid value was provided.",

    SPAN_TIMER_HEADER_INVALID:
        "The Server-Timing header value must be a valid string formatted according to the Server-Timing specification, but an invalid value was returned.",

    EXECUTION_CONTEXT_INVALID:
        "The execution context must be a strictly defined object containing a valid Request instance and a conforming spanTimer implementation, but the provided value violated the required execution context contract.",

    SERVER_TIMING_NOT_A_STRING:
        "The Server-Timing header must be provided as a string, but a non-string value was received, which violates the HTTP Server-Timing specification.",

    SERVER_TIMING_INVALID_FORMAT:
        "The Server-Timing header does not conform to the required Server-Timing syntax as defined by the specification, which requires one or more valid metric entries with optional duration and description parameters.",

    SPAN_TIMER_PHASE_NOT_A_STRING:
        "The span timer phase must be provided as a string, but a non-string value was received, which violates the requirement for a valid phase identifier.",

    SPAN_TIMER_PHASE_INVALID_FORMAT:
        "The span timer phase must consist only of lowercase alphabetic characters separated by single hyphens, but an invalid format was provided that violates the phase naming contract.",

    ERROR_METADATA_INVALID:
        "The error metadata object must contain a valid error phase and may optionally include validation issues, but the provided value violated the required error metadata structure.",

    NORMALIZED_ISSUE_INVALID:
        "The normalized issue object does not conform to the required diagnostic issue structure, which violates the contract for structured error diagnostics.",

    NORMALIZED_ISSUE_KIND_INVALID:
        "The issue kind must be one of the supported values identifying the class of failure, but an invalid or unsupported kind was provided.",

    NORMALIZED_ISSUE_MESSAGE_INVALID:
        "The issue message must be a non-empty string describing the diagnostic condition, but an invalid value was provided.",

    NORMALIZED_ISSUE_PATH_INVALID:
        "The issue path must be an array representing the location of the failure within the validated structure, but an invalid path value was provided.",

    NORMALIZED_ISSUE_PATH_ELEMENT_INVALID:
        "Each issue path element must be a string or number identifying a property key or array index, but an invalid element was provided.",

    NORMALIZED_ISSUE_CODE_INVALID:
        "The issue code must be a string identifier describing the specific error condition, but an invalid value was provided.",

    APP_ERROR_INPUT_INVALID:
        "The application error input object does not conform to the required structure for constructing an application error, which violates the contract for normalized error handling.",

    APP_ERROR_MESSAGE_INVALID:
        "The error message must be a valid string describing the application error, but an invalid value was provided.",

    SECURITY_HEADERS_INVALID:
        "The security headers object does not match the required schema, which violates the contract that enforces mandatory HTTP security headers and request correlation identifiers.",

    FAILURE_HEADERS_INVALID:
        "The failure response headers object does not match the required schema, which violates the contract that enforces a fully non-cacheable, non-indexable, and security-hardened HTTP response for failure conditions.",

    FAILURE_HEADER_PRAGMA_INVALID:
        "The Pragma header is invalid because failure responses must explicitly disable caching using the no-cache directive.",

    FAILURE_HEADER_CONTENT_TYPE_INVALID:
        "The Content-Type header is invalid because failure responses must be served strictly as UTF-8 encoded plain text.",

    FAILURE_HEADER_CACHE_CONTROL_INVALID:
        "The Cache-Control header is invalid because failure responses must explicitly prevent all forms of caching and revalidation.",

    FAILURE_HEADER_EXPIRES_INVALID:
        "The Expires header is invalid because failure responses must indicate immediate expiration to prevent intermediary caching.",

    FAILURE_HEADER_X_ROBOTS_TAG_INVALID:
        "The X-Robots-Tag header is invalid because failure responses must not be indexed or followed by search engines.",

    RESPONSE_HEADERS_INVALID:
        "The response headers object does not match the required schema, which violates the contract that enforces correct HTTP response metadata such as content type, caching directives, and variance.",

    RESPONSE_HEADERS_INPUT_INVALID:
        "The response headers input object does not match the required schema, which violates the contract for deriving valid HTTP response headers from response parameters.",

    X_CONTENT_TYPE_OPTIONS_INVALID:
        "The X-Content-Type-Options header is invalid because it must be set to 'nosniff' to prevent MIME type sniffing vulnerabilities.",

    X_FRAME_OPTIONS_INVALID:
        "The X-Frame-Options header is invalid because it must be set to 'DENY' to prevent clickjacking attacks.",

    REFERRER_POLICY_INVALID:
        "The Referrer-Policy header is invalid because it must be set to 'no-referrer' to avoid leaking referrer information.",

    X_REQUEST_ID_INVALID:
        "The X-Request-Id header is invalid because it must be a valid request identifier string that uniquely identifies the request.",

    X_CORRELATION_ID_INVALID:
        "The X-Correlation-Id header is invalid because it must be a valid correlation identifier used to trace a request across system boundaries.",

    RESPONSE_HEADERS_VARY_INVALID:
        "The Vary response header value is invalid because it must be set to the exact literal 'accept-encoding' to ensure correct cache key variation and content negotiation behavior.",

    SPAN_TIMER_PHASE_ALREADY_STARTED: 'SpanTimer violation: phase "{{phase}}" was started more than once without being ended.',
    SPAN_TIMER_PHASE_NOT_STARTED: 'SpanTimer violation: phase "{{phase}}" was ended without being started.',
    SPAN_TIMER_PHASES_INCOMPLETE: 'SpanTimer violation: cannot emit Server-Timing header with unfinished spans: {{unfinished}}.'
} as const;

export const NON_NEGATIVE_INTEGER_MIN_VALUE: number = 0 as const;

export const NonNegativeIntegerSchema = pipe(
    number(ERROR_MESSAGE_KEYS.NON_NEGATIVE_INTEGER_TYPE_INVALID),
    minValue(
        NON_NEGATIVE_INTEGER_MIN_VALUE,
        ERROR_MESSAGE_KEYS.NON_NEGATIVE_INTEGER_MIN_VALUE_INVALID
    )
);

export type NonNegativeInteger = InferOutput<typeof NonNegativeIntegerSchema>;

export const RegExpSchema = pipe(
    any(),
    check(
        (value: unknown): value is RegExp => {
            return value instanceof RegExp;
        },
        ERROR_MESSAGE_KEYS.REGEXP_INVALID_TYPE
    ),
    transform(
        (value: unknown): RegExp => {
            return value as RegExp;
        }
    )
);

export const REGEX_SCHEMA_URL_JSON: RegExp = /^https?:\/\/\S+\.json(?:[?#]\S*)?$/;
parse(RegExpSchema, REGEX_SCHEMA_URL_JSON)

export const SchemaUrlJsonSchema = pipe(
    string(ERROR_MESSAGE_KEYS.SCHEMA_URL_JSON_STRING),
    regex(
        REGEX_SCHEMA_URL_JSON,
        ERROR_MESSAGE_KEYS.SCHEMA_URL_JSON_FORMAT
    )
);

export type SchemaUrlJson = InferOutput<typeof SchemaUrlJsonSchema>;

export const IOS_BUNDLE_ID_REGEX: RegExp = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)+$/;
parse(RegExpSchema, IOS_BUNDLE_ID_REGEX)

export const IOSBundleIdSchema = pipe(
    string(ERROR_MESSAGE_KEYS.IOS_BUNDLE_ID_INVALID),
    regex(IOS_BUNDLE_ID_REGEX, ERROR_MESSAGE_KEYS.IOS_BUNDLE_ID_INVALID),
);

export type IOSBundleId = InferOutput<typeof IOSBundleIdSchema>;

export const ANDROID_PACKAGE_NAME_REGEX: RegExp =
    /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
parse(RegExpSchema, ANDROID_PACKAGE_NAME_REGEX)

export const AndroidPackageNameSchema = pipe(
    string(ERROR_MESSAGE_KEYS.ANDROID_PACKAGE_NAME_TYPE),
    regex(
        ANDROID_PACKAGE_NAME_REGEX,
        ERROR_MESSAGE_KEYS.ANDROID_PACKAGE_NAME_FORMAT
    )
);

export type AndroidPackageName = InferOutput<
    typeof AndroidPackageNameSchema
>;

export const SEMVER_REGEX: RegExp = new RegExp(/^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?(?:\\+([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?$/);
parse(RegExpSchema, SEMVER_REGEX)

export const VersionSchema = pipe(
    string(ERROR_MESSAGE_KEYS.VERSION_EXPECTED_STRING),
    regex(SEMVER_REGEX, ERROR_MESSAGE_KEYS.VERSION_INVALID_SEMVER)
);

export type Version = InferOutput<typeof VersionSchema>;

export const MIN_UPTIME_SECONDS: NonNegativeInteger = 0;
parse(NonNegativeIntegerSchema, MIN_UPTIME_SECONDS)

export const UptimeSecondsSchema = pipe(
    number(ERROR_MESSAGE_KEYS.UPTIME_SECONDS_NUMBER),
    integer(ERROR_MESSAGE_KEYS.UPTIME_SECONDS_INTEGER),
    minValue(MIN_UPTIME_SECONDS, ERROR_MESSAGE_KEYS.UPTIME_SECONDS_MIN_VALUE)
);

export type UptimeSeconds = InferOutput<typeof UptimeSecondsSchema>;

export const TIMESTAMP_REGEX: RegExp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
parse(RegExpSchema, TIMESTAMP_REGEX)

export const TimestampSchema = pipe(
    string(ERROR_MESSAGE_KEYS.TIMESTAMP_EXPECTED_STRING),
    regex(
        TIMESTAMP_REGEX,
        ERROR_MESSAGE_KEYS.TIMESTAMP_INVALID_UTC_FORMAT
    )
);

export type Timestamp = InferOutput<typeof TimestampSchema>;

export const TimestampAsDateSchema = pipe(
    TimestampSchema,
    transform((value) => {
        const date: Date = new Date(value);

        if (Number.isNaN(date.getTime()) === true) {
            throw new Error(ERROR_MESSAGE_KEYS.INVALID_TIMESTAMP_AS_DATE);
        }

        return date;
    })
);

export type TimestampAsDate = InferOutput<typeof TimestampAsDateSchema>;

export const COMMIT_SHORT_LENGTH: NonNegativeInteger = 7;
parse(NonNegativeIntegerSchema, COMMIT_SHORT_LENGTH)

export const COMMIT_SHORT_REGEX: RegExp = new RegExp(`^[0-9a-fA-F]{${COMMIT_SHORT_LENGTH}}$`);
parse(RegExpSchema, COMMIT_SHORT_REGEX)

export const CommitShortSchema = pipe(
    string(ERROR_MESSAGE_KEYS.COMMIT_SHORT_STRING_EXPECTED),
    regex(
        COMMIT_SHORT_REGEX,
        ERROR_MESSAGE_KEYS.COMMIT_SHORT_FORMAT_INVALID
    )
);

export const HTTPS_REGEX: RegExp = /^https:\/\/\S+$/
parse(RegExpSchema, HTTPS_REGEX)

export const HttpsUrlSchema = pipe(
    string(ERROR_MESSAGE_KEYS.EXPECTS_STRING),
    regex(
        HTTPS_REGEX,
        ERROR_MESSAGE_KEYS.EXPECTS_HTTPS_URL
    )
);

export type HttpsUrl = InferOutput<typeof HttpsUrlSchema>;

export const STRING_UNICODE_REGEX: RegExp = /^[\s\S]*$/u
parse(RegExpSchema, STRING_UNICODE_REGEX)

export const UnicodeStringSchema = pipe(
    string(ERROR_MESSAGE_KEYS.UNICODE_STRING_NOT_STRING),
    regex(
        STRING_UNICODE_REGEX,
        ERROR_MESSAGE_KEYS.UNICODE_STRING_INVALID
    )
);

export type UnicodeString = InferOutput<typeof UnicodeStringSchema>;

/**
 * Nominal type representing validated, publication-ready plain text content
 * intended for direct emission as a `.txt` resource.
 *
 * This type exists solely to distinguish serialized, contract-validated text
 * artifacts from arbitrary strings at module and boundary interfaces.
 */
export type TextFileOutput = UnicodeString & {
    readonly __brand: "TextFileOutput";
};

export const cacheTtlSecondsSchema = pipe(
    number(ERROR_MESSAGE_KEYS.CACHE_TTL_NOT_A_NUMBER),
    integer(ERROR_MESSAGE_KEYS.CACHE_TTL_NOT_AN_INTEGER),
    minValue(CACHE_TTL_LIMITS.MIN_SECONDS, ERROR_MESSAGE_KEYS.CACHE_TTL_BELOW_MIN),
    maxValue(CACHE_TTL_LIMITS.MAX_SECONDS, ERROR_MESSAGE_KEYS.CACHE_TTL_ABOVE_MAX)
);

export type CacheTtlSeconds =
    InferOutput<typeof cacheTtlSecondsSchema>;

export const PATHNAME_REGEX: RegExp = /^\/[^?#]*$/
parse(RegExpSchema, PATHNAME_REGEX)

export const pathnameSchema = pipe(
    string(ERROR_MESSAGE_KEYS.PATHNAME_NOT_A_STRING),
    regex(PATHNAME_REGEX, ERROR_MESSAGE_KEYS.PATHNAME_INVALID_FORMAT)
);

export type Pathname =
    InferOutput<typeof pathnameSchema>;

export const runtimeSchema = picklist(Object.values(RUNTIME), ERROR_MESSAGE_KEYS.RUNTIME_INVALID);

export type Runtime = InferOutput<typeof runtimeSchema>;

export const environmentSchema = union([
    literal(ENVIRONMENT.PROD),
    literal(ENVIRONMENT.STAGING),
    literal(ENVIRONMENT.PREVIEW)
], ERROR_MESSAGE_KEYS.ENVIRONMENT_INVALID);

export type Environment = InferOutput<typeof environmentSchema>;

export const severitySchema = union([
    literal(SEVERITY.FATAL),
    literal(SEVERITY.ERROR),
    literal(SEVERITY.WARN)
], ERROR_MESSAGE_KEYS.SEVERITY_INVALID);

export type Severity = InferOutput<typeof severitySchema>;

export const responseTypeSchema = picklist(Object.values(RESPONSE_TYPE), ERROR_MESSAGE_KEYS.RESPONSE_TYPE_INVALID);

export type ResponseType = InferOutput<typeof responseTypeSchema>;

export const SERVICE_NAME_REGEX: RegExp = /^[a-z]+(-[a-z]+)*$/;
parse(RegExpSchema, SERVICE_NAME_REGEX)

export const serviceNameSchema =
    pipe(string(ERROR_MESSAGE_KEYS.SERVICE_NAME_INVALID), regex(SERVICE_NAME_REGEX, ERROR_MESSAGE_KEYS.SERVICE_NAME_REGEX_INVALID));

export type ServiceName = InferOutput<typeof serviceNameSchema>;

export const serviceVersionSchema = pipe(
    string(ERROR_MESSAGE_KEYS.SERVICE_VERSION_INVALID),
    regex(SEMVER_REGEX, ERROR_MESSAGE_KEYS.SERVICE_VERSION_INVALID)
);

export type ServiceVersion = InferOutput<typeof serviceVersionSchema>;

export const DEPLOYMENT_ID_REGEX: RegExp = /^[a-z]+(-[a-z]+)*$/;
parse(RegExpSchema, DEPLOYMENT_ID_REGEX)

export const deploymentIdSchema =
    pipe(string(ERROR_MESSAGE_KEYS.DEPLOYMENT_ID_INVALID), regex(DEPLOYMENT_ID_REGEX, ERROR_MESSAGE_KEYS.DEPLOYMENT_ID_FORMAT_INVALID))

export type DeploymentId = InferOutput<typeof deploymentIdSchema>;

export const schemaVersionSchema =
    literal(GLOBAL_ERROR_CONTEXT_SCHEMA_VERSION.CURRENT, ERROR_MESSAGE_KEYS.SCHEMA_VERSION_INVALID);

export type SchemaVersion = InferOutput<typeof schemaVersionSchema>;

export const correlationIdSchema = pipe(
    string(ERROR_MESSAGE_KEYS.CORRELATION_ID_INVALID),
    uuid(ERROR_MESSAGE_KEYS.CORRELATION_ID_INVALID)
);

export type CorrelationId = InferOutput<typeof correlationIdSchema>;

export const ownerSchema = picklist(Object.values(OWNERS), ERROR_MESSAGE_KEYS.OWNER_INVALID);

export type Owner = InferOutput<typeof ownerSchema>;

export const baseErrorContextSchema = strictObject(
    {
        runtime: runtimeSchema,
        environment: environmentSchema,

        serviceName: serviceNameSchema,
        serviceVersion: serviceVersionSchema,
        deploymentId: deploymentIdSchema,

        severity: severitySchema,
        timestamp: TimestampSchema,

        schemaVersion: schemaVersionSchema,
        correlationId: correlationIdSchema,
        owner: ownerSchema,
    },
    ERROR_MESSAGE_KEYS.BASE_ERROR_CONTEXT_INVALID
);

export type GlobalErrorContext = InferOutput<typeof baseErrorContextSchema>;

export const anythingSchema = any()

export type Anything = InferOutput<typeof anythingSchema>

export const voidSchema = void_()

export type Void = InferOutput<typeof voidSchema>

export const resposneOrPassthroughScema = union([instance(Response), voidSchema])

export const spanStartSchema = z.number({ error: ERROR_MESSAGE_KEYS.SPAN_START_INVALID });

export const spanTimerSchema = z.strictObject({
    markStart: z.function({
        input: z.tuple([z.string()]),
        output: spanStartSchema
    }),

    markEnd: z.function({
        input: z.tuple([z.string()]),
        output: z.void()
    }),

    toServerTimingHeader: z.function({
        input: z.tuple([]),
        output: z.string()
    })
});

export type SpanTimer = z.infer<typeof spanTimerSchema>;

export const executionContextSchema = z.strictObject({
    request: z.instanceof(Request),
    spanTimer: spanTimerSchema
}, { error: ERROR_MESSAGE_KEYS.EXECUTION_CONTEXT_INVALID })

export type ExecutionContext = z.infer<typeof executionContextSchema>

export const requestHandlerSchema = z.function({
    input: z.tuple([executionContextSchema]),
    output: z.promise(z.instanceof(Response).or(z.void()))
})

export type RequestHandler = z.infer<typeof requestHandlerSchema>

export const SPAN_TIMER_PHASE_REGEX: RegExp = /^[a-z]+(-[a-z]+)*$/;
parse(RegExpSchema, SPAN_TIMER_PHASE_REGEX)

export const spanTimerPhaseSchema = pipe(
    string(ERROR_MESSAGE_KEYS.SPAN_TIMER_PHASE_NOT_A_STRING),
    regex(
        SPAN_TIMER_PHASE_REGEX,
        ERROR_MESSAGE_KEYS.SPAN_TIMER_PHASE_INVALID_FORMAT
    )
);

export type SpanTimerPhase = InferOutput<typeof spanTimerPhaseSchema>

export const spanTimerDurationSchema = NonNegativeIntegerSchema

export type SpanTimerDuration = InferOutput<typeof spanTimerDurationSchema>

export const SERVER_TIMING_REGEX: RegExp =
    /^([a-zA-Z0-9._-]+(;desc="[^"]*")?(;dur=\d+(\.\d+)?)?)(,\s*[a-zA-Z0-9._-]+(;desc="[^"]*")?(;dur=\d+(\.\d+)?)?)*$/;
parse(RegExpSchema, SERVER_TIMING_REGEX)

export const serverTimingHeaderSchema = pipe(
    string(ERROR_MESSAGE_KEYS.SERVER_TIMING_NOT_A_STRING),
    regex(
        SERVER_TIMING_REGEX,
        ERROR_MESSAGE_KEYS.SERVER_TIMING_INVALID_FORMAT
    )
);

export type ServerTimingHeader = InferOutput<typeof serverTimingHeaderSchema>

export const ERROR_PHASE_REGEX: RegExp = /^[a-z]+(-[a-z]+)*$/;
parse(RegExpSchema, ERROR_PHASE_REGEX)

export const errorPhaseSchema = pipe(
    string(ERROR_MESSAGE_KEYS.SPAN_TIMER_PHASE_NOT_A_STRING),
    regex(
        ERROR_PHASE_REGEX,
        ERROR_MESSAGE_KEYS.SPAN_TIMER_PHASE_INVALID_FORMAT
    )
);

export type ErrorPhase = InferOutput<typeof spanTimerPhaseSchema>

export type ValibotIssueLike = {
    message: string;
    path: readonly (string | number)[];
};

export const normalizedIssueTypeSchema = picklist(Object.values(ISSUE_TYPES),
    ERROR_MESSAGE_KEYS.NORMALIZED_ISSUE_KIND_INVALID
)

export const normalizedIssueSchema = strictObject(
    {
        kind: normalizedIssueTypeSchema,

        message: string(
            ERROR_MESSAGE_KEYS.NORMALIZED_ISSUE_MESSAGE_INVALID
        ),

        path: optional(
            array(
                union(
                    [
                        string(ERROR_MESSAGE_KEYS.NORMALIZED_ISSUE_PATH_ELEMENT_INVALID),
                        number(ERROR_MESSAGE_KEYS.NORMALIZED_ISSUE_PATH_ELEMENT_INVALID)
                    ]
                ),
                ERROR_MESSAGE_KEYS.NORMALIZED_ISSUE_PATH_INVALID
            )
        ),

        code: optional(
            string(ERROR_MESSAGE_KEYS.NORMALIZED_ISSUE_CODE_INVALID)
        )
    },
    ERROR_MESSAGE_KEYS.NORMALIZED_ISSUE_INVALID
);

export type NormalizedIssue = InferOutput<typeof normalizedIssueSchema>

export const appErrorInputSchema = strictObject(
    {
        phase: errorPhaseSchema,

        issues: optional(unknown()),

        cause: optional(unknown()),

        message: optional(string(ERROR_MESSAGE_KEYS.APP_ERROR_MESSAGE_INVALID))
    },
    ERROR_MESSAGE_KEYS.APP_ERROR_INPUT_INVALID
);

export type AppErrorInput =
    Readonly<InferOutput<typeof appErrorInputSchema>>;

export const securityHeadersSchema = strictObject(
    {
        X_CONTENT_TYPE_OPTIONS: literal(
            HEADER_X_CONTENT_TYPE_OPTIONS_VALUES.NOSNIFF,
            ERROR_MESSAGE_KEYS.X_CONTENT_TYPE_OPTIONS_INVALID
        ),

        X_FRAME_OPTIONS: literal(
            HEADER_X_FRAME_OPTIONS_VALUES.DENY,
            ERROR_MESSAGE_KEYS.X_FRAME_OPTIONS_INVALID
        ),

        REFERRER_POLICY: literal(
            HEADER_REFERRER_POLICY_VALUES.NO_REFERRER,
            ERROR_MESSAGE_KEYS.REFERRER_POLICY_INVALID
        ),

        X_REQUEST_ID: pipe(
            string(ERROR_MESSAGE_KEYS.X_REQUEST_ID_INVALID),
            requestIdSchema
        ),

        X_CORRELATION_ID: pipe(
            string(ERROR_MESSAGE_KEYS.X_CORRELATION_ID_INVALID),
            correlationIdSchema
        )
    },
    ERROR_MESSAGE_KEYS.SECURITY_HEADERS_INVALID
);

export type SecurityHeaders = InferOutput<typeof securityHeadersSchema>

export const failureHeadersSchema = strictObject({
    PRAGMA: literal(HEADER_PRAGMA_VALUES.NO_CACHE, ERROR_MESSAGE_KEYS.FAILURE_HEADER_PRAGMA_INVALID),
    CONTENT_TYPE: literal(`${HTTP_MIME_TYPES.TEXT_PLAIN}${HTTP_MIME_TYPES_CHARSETS.UTF_8}`, ERROR_MESSAGE_KEYS.FAILURE_HEADER_CONTENT_TYPE_INVALID),
    CACHE_CONTROL: literal(HEADER_CACHE_CONTROL_FAILURE_VALUES.DEFAULT, ERROR_MESSAGE_KEYS.FAILURE_HEADER_CACHE_CONTROL_INVALID),
    EXPIRES: literal(HEADER_EXPIRES_VALUES.ZERO, ERROR_MESSAGE_KEYS.FAILURE_HEADER_EXPIRES_INVALID),
    X_ROBOTS_TAG: literal(`${HEADER_X_ROBOTS_TAG_VALUES.NO_INDEX}${COMMENT_TOKENS.COMMA}${HEADER_X_ROBOTS_TAG_VALUES.NO_FOLLOW}`, ERROR_MESSAGE_KEYS.FAILURE_HEADER_X_ROBOTS_TAG_INVALID),
}, ERROR_MESSAGE_KEYS.FAILURE_HEADERS_INVALID)

export type FailureHeaders = InferOutput<typeof failureHeadersSchema>

export const responseHeadersSchema = strictObject(
    {
        CONTENT_TYPE: pipe(
            picklist(Object.values(RESPONSE_TYPE), ERROR_MESSAGE_KEYS.RESPONSE_TYPE_INVALID),
            transform((type) => {
                switch (type) {
                    case RESPONSE_TYPE.JSON:
                        return `${HTTP_MIME_TYPES.APPLICATION_JSON}${HTTP_MIME_TYPES_CHARSETS.UTF_8}`;

                    case RESPONSE_TYPE.WEB_MANIFEST:
                        return `${HTTP_MIME_TYPES.APPLICATION_MANIFEST_JSON}${HTTP_MIME_TYPES_CHARSETS.UTF_8}`;

                    case RESPONSE_TYPE.XML:
                        return `${HTTP_MIME_TYPES.APPLICATION_XML}${HTTP_MIME_TYPES_CHARSETS.UTF_8}`;

                    case RESPONSE_TYPE.TEXT:
                        return `${HTTP_MIME_TYPES.TEXT_PLAIN}${HTTP_MIME_TYPES_CHARSETS.UTF_8}`;

                    default:
                        return `${HTTP_MIME_TYPES.TEXT_PLAIN}${HTTP_MIME_TYPES_CHARSETS.UTF_8}`;
                }
            })
        ),

        CACHE_CONTROL: pipe(
            cacheTtlSecondsSchema,
            transform((seconds) => `${HEADER_CACHE_CONTROL_SUCCESS_VALUE.DEFAULT}${seconds}`)
        ),

        CONTENT_LENGTH: pipe(
            NonNegativeIntegerSchema,
            transform((length) => String(length))
        ),

        VARY: literal(HEADER_VARY_VALUES.ACCEPT_ENCODING, ERROR_MESSAGE_KEYS.RESPONSE_HEADERS_VARY_INVALID)
    },
    ERROR_MESSAGE_KEYS.RESPONSE_HEADERS_INVALID
);

export type ResponseHeaders = InferOutput<typeof responseHeadersSchema>

export const responseHeadersInSchema = strictObject(
    {
        CONTENT_TYPE: pipe(
            picklist(Object.values(RESPONSE_TYPE), ERROR_MESSAGE_KEYS.RESPONSE_TYPE_INVALID),
        ),

        CACHE_CONTROL: pipe(
            cacheTtlSecondsSchema,
        ),

        CONTENT_LENGTH: pipe(
            NonNegativeIntegerSchema,
        ),

        VARY: literal(HEADER_VARY_VALUES.ACCEPT_ENCODING, ERROR_MESSAGE_KEYS.RESPONSE_HEADERS_VARY_INVALID)
    },
    ERROR_MESSAGE_KEYS.RESPONSE_HEADERS_INVALID
);

export type ResponseHeadersIn = InferOutput<typeof responseHeadersInSchema>

export const responseHeadersInputSchema = strictObject({
    type: picklist(Object.values(RESPONSE_TYPE), ERROR_MESSAGE_KEYS.RESPONSE_TYPE_INVALID),
    cacheTtl: cacheTtlSecondsSchema,
    contentLength: NonNegativeIntegerSchema
}, ERROR_MESSAGE_KEYS.RESPONSE_HEADERS_INPUT_INVALID)

export type ResponseHeadersInput = InferOutput<typeof responseHeadersInputSchema>