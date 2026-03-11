export const GLOBAL_ERROR_CONTEXT_SCHEMA_VERSION = Object.freeze({
    CURRENT: "1.0.0"
} as const)

export const CACHE_TTL_VALUES = Object.freeze({
    FIVE_MINUTES: 300,
    ONE_HOUR: 3_600,
    ONE_DAY: 86_400,
    ONE_WEEK: 604_800
} as const);

export const CACHE_TTL_LIMITS = Object.freeze({
    MIN_SECONDS: 0,
    MAX_SECONDS: 31_536_000
} as const);

export const ENVIRONMENT = Object.freeze({
    PROD: "prod",
    STAGING: "staging",
    PREVIEW: "preview",
} as const);

export const SEVERITY = Object.freeze({
    FATAL: "fatal",
    ERROR: "error",
    WARN: "warn"
} as const);

export const ISSUE_TYPES = Object.freeze({
    VALIDATION: "validation",
    EXCEPTION: "exception",
    RUNTIME: "runtime",
    DOMAIN: "domain"
} as const)

export const OWNERS = Object.freeze({
    EDGE_PLATFORM: "edge-platform",
    BACKEND_PLATFORM: "backend-platform",
    FRONTEND_PLATFORM: "frontend-platform",
    INFRA: "infra",
    SECURITY: "security"
} as const)

export const RUNTIME = Object.freeze({
    EDGE: "edge",
    WORKER: "worker",
    BACKEND: "backend",
    FRONTEND: "frontend",
    JOB: "job"
} as const);

export const CONTROL_CHARACTERS = Object.freeze({
    NULL: "\0",
    HORIZONTAL_TAB: "\t",
    NEWLINE: "\n",
    CARRIAGE_RETURN: "\r",
    SPACE: " ",
    CRLF: "\r\n"
} as const);

export const EMPTY_STRING = "" as const;

export const COMMENT_TOKENS = Object.freeze({
    COMMA: ", ",

    LINE_HASH: "#",
    LINE_DOUBLE_SLASH: "//",

    BLOCK_START: "/*",
    BLOCK_END: "*/",

    DOC_BLOCK_START: "/**",
    DOC_BLOCK_END: "*/",

    HTML_COMMENT_START: "<!--",
    HTML_COMMENT_END: "-->",

    SHELL_HASH: "#",
    SHELL_SHEBANG: "#!",

    MARKDOWN_CODE_FENCE_BACKTICK: "```",
    MARKDOWN_CODE_FENCE_TILDE: "~~~",

    TEXT_SEMICOLON: ";",
} as const);

export const HTTP_VERSIONS = Object.freeze({
    HTTP_0_9: "HTTP/0.9",
    HTTP_1_0: "HTTP/1.0",
    HTTP_1_1: "HTTP/1.1",
    HTTP_2: "HTTP/2",
    HTTP_3: "HTTP/3"
} as const);

export const HTTP_METHODS = Object.freeze({
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    PATCH: "PATCH",
    DELETE: "DELETE",
    OPTIONS: "OPTIONS",
    HEAD: "HEAD",
    CONNECT: "CONNECT",
    TRACE: "TRACE"
} as const);

export const HTTP_HEADERS = Object.freeze({
    CF_RAY: "cf-ray",

    CONTENT_SECURITY_POLICY: "Content-Security-Policy",

    ACCEPT: "Accept",
    ACCEPT_CHARSET: "Accept-Charset",
    ACCEPT_ENCODING: "Accept-Encoding",
    ACCEPT_LANGUAGE: "Accept-Language",

    AUTHORIZATION: "Authorization",

    CACHE_CONTROL: "Cache-Control",
    CONNECTION: "Connection",
    CONTENT_ENCODING: "Content-Encoding",
    CONTENT_LANGUAGE: "Content-Language",
    CONTENT_LENGTH: "Content-Length",
    CONTENT_LOCATION: "Content-Location",
    CONTENT_TYPE: "Content-Type",

    COOKIE: "Cookie",

    DATE: "Date",

    ETAG: "ETag",
    EXPECT: "Expect",

    HOST: "Host",

    IF_MATCH: "If-Match",
    IF_MODIFIED_SINCE: "If-Modified-Since",
    IF_NONE_MATCH: "If-None-Match",
    IF_RANGE: "If-Range",
    IF_UNMODIFIED_SINCE: "If-Unmodified-Since",

    LAST_MODIFIED: "Last-Modified",
    LOCATION: "Location",

    ORIGIN: "Origin",

    EXPIRES: "Expires",

    PRAGMA: "Pragma",
    PROXY_AUTHORIZATION: "Proxy-Authorization",

    RANGE: "Range",
    REFERER: "Referer",

    RETRY_AFTER: "Retry-After",

    SERVER: "Server",
    SET_COOKIE: "Set-Cookie",

    TRANSFER_ENCODING: "Transfer-Encoding",

    UPGRADE: "Upgrade",
    USER_AGENT: "User-Agent",

    VARY: "Vary",
    VIA: "Via",
    WARNING: "Warning",

    WWW_AUTHENTICATE: "WWW-Authenticate",

    X_REQUEST_ID: "X-Request-Id",
    X_CORRELATION_ID: "X-Correlation-Id",

    REFERRER_POLICY: "Referrer-Policy",

    X_CONTENT_TYPE_OPTIONS: "X-Content-Type-Options",
    X_FRAME_OPTIONS: "X-Frame-Options",
    X_ROBOTS_TAG: "X-Robots-Tag"
} as const);

export const HTTP_ENCODINGS = Object.freeze({
    IDENTITY: "identity",
    GZIP: "gzip",
    DEFLATE: "deflate",
    BR: "br",
    ZSTD: "zstd",
    COMPRESS: "compress",
    UTF_8: "utf-8"
} as const);

export const HTTP_STATUS_CODES = Object.freeze({
    CONTINUE: 100,
    SWITCHING_PROTOCOLS: 101,
    PROCESSING: 102,
    EARLY_HINTS: 103,

    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NON_AUTHORITATIVE_INFORMATION: 203,
    NO_CONTENT: 204,
    RESET_CONTENT: 205,
    PARTIAL_CONTENT: 206,
    MULTI_STATUS: 207,
    ALREADY_REPORTED: 208,
    IM_USED: 226,

    MULTIPLE_CHOICES: 300,
    MOVED_PERMANENTLY: 301,
    FOUND: 302,
    SEE_OTHER: 303,
    NOT_MODIFIED: 304,
    USE_PROXY: 305,
    TEMPORARY_REDIRECT: 307,
    PERMANENT_REDIRECT: 308,

    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    PROXY_AUTHENTICATION_REQUIRED: 407,
    REQUEST_TIMEOUT: 408,
    CONFLICT: 409,
    GONE: 410,
    LENGTH_REQUIRED: 411,
    PRECONDITION_FAILED: 412,
    PAYLOAD_TOO_LARGE: 413,
    URI_TOO_LONG: 414,
    UNSUPPORTED_MEDIA_TYPE: 415,
    RANGE_NOT_SATISFIABLE: 416,
    EXPECTATION_FAILED: 417,
    IM_A_TEAPOT: 418,
    MISDIRECTED_REQUEST: 421,
    UNPROCESSABLE_ENTITY: 422,
    LOCKED: 423,
    FAILED_DEPENDENCY: 424,
    TOO_EARLY: 425,
    UPGRADE_REQUIRED: 426,
    PRECONDITION_REQUIRED: 428,
    TOO_MANY_REQUESTS: 429,
    REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
    UNAVAILABLE_FOR_LEGAL_REASONS: 451,

    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    HTTP_VERSION_NOT_SUPPORTED: 505,
    VARIANT_ALSO_NEGOTIATES: 506,
    INSUFFICIENT_STORAGE: 507,
    LOOP_DETECTED: 508,
    NOT_EXTENDED: 510,
    NETWORK_AUTHENTICATION_REQUIRED: 511
} as const);

export const HTTP_STATUS_LINES = Object.freeze({
    CONTINUE: "100 Continue",
    SWITCHING_PROTOCOLS: "101 Switching Protocols",
    PROCESSING: "102 Processing",
    EARLY_HINTS: "103 Early Hints",

    OK: "200 OK",
    CREATED: "201 Created",
    ACCEPTED: "202 Accepted",
    NON_AUTHORITATIVE_INFORMATION: "203 Non-Authoritative Information",
    NO_CONTENT: "204 No Content",
    RESET_CONTENT: "205 Reset Content",
    PARTIAL_CONTENT: "206 Partial Content",
    MULTI_STATUS: "207 Multi-Status",
    ALREADY_REPORTED: "208 Already Reported",
    IM_USED: "226 IM Used",

    MULTIPLE_CHOICES: "300 Multiple Choices",
    MOVED_PERMANENTLY: "301 Moved Permanently",
    FOUND: "302 Found",
    SEE_OTHER: "303 See Other",
    NOT_MODIFIED: "304 Not Modified",
    USE_PROXY: "305 Use Proxy",
    TEMPORARY_REDIRECT: "307 Temporary Redirect",
    PERMANENT_REDIRECT: "308 Permanent Redirect",

    BAD_REQUEST: "400 Bad Request",
    UNAUTHORIZED: "401 Unauthorized",
    PAYMENT_REQUIRED: "402 Payment Required",
    FORBIDDEN: "403 Forbidden",
    NOT_FOUND: "404 Not Found",
    METHOD_NOT_ALLOWED: "405 Method Not Allowed",
    NOT_ACCEPTABLE: "406 Not Acceptable",
    PROXY_AUTHENTICATION_REQUIRED: "407 Proxy Authentication Required",
    REQUEST_TIMEOUT: "408 Request Timeout",
    CONFLICT: "409 Conflict",
    GONE: "410 Gone",
    LENGTH_REQUIRED: "411 Length Required",
    PRECONDITION_FAILED: "412 Precondition Failed",
    PAYLOAD_TOO_LARGE: "413 Payload Too Large",
    URI_TOO_LONG: "414 URI Too Long",
    UNSUPPORTED_MEDIA_TYPE: "415 Unsupported Media Type",
    RANGE_NOT_SATISFIABLE: "416 Range Not Satisfiable",
    EXPECTATION_FAILED: "417 Expectation Failed",
    IM_A_TEAPOT: "418 I'm a Teapot",
    MISDIRECTED_REQUEST: "421 Misdirected Request",
    UNPROCESSABLE_ENTITY: "422 Unprocessable Entity",
    LOCKED: "423 Locked",
    FAILED_DEPENDENCY: "424 Failed Dependency",
    TOO_EARLY: "425 Too Early",
    UPGRADE_REQUIRED: "426 Upgrade Required",
    PRECONDITION_REQUIRED: "428 Precondition Required",
    TOO_MANY_REQUESTS: "429 Too Many Requests",
    REQUEST_HEADER_FIELDS_TOO_LARGE: "431 Request Header Fields Too Large",
    UNAVAILABLE_FOR_LEGAL_REASONS: "451 Unavailable For Legal Reasons",

    INTERNAL_SERVER_ERROR: "500 Internal Server Error",
    NOT_IMPLEMENTED: "501 Not Implemented",
    BAD_GATEWAY: "502 Bad Gateway",
    SERVICE_UNAVAILABLE: "503 Service Unavailable",
    GATEWAY_TIMEOUT: "504 Gateway Timeout",
    HTTP_VERSION_NOT_SUPPORTED: "505 HTTP Version Not Supported",
    VARIANT_ALSO_NEGOTIATES: "506 Variant Also Negotiates",
    INSUFFICIENT_STORAGE: "507 Insufficient Storage",
    LOOP_DETECTED: "508 Loop Detected",
    NOT_EXTENDED: "510 Not Extended",
    NETWORK_AUTHENTICATION_REQUIRED: "511 Network Authentication Required"
} as const);

export const HTTP_CONNECTION_VALUES = Object.freeze({
    KEEP_ALIVE: "keep-alive",
    CLOSE: "close",
    UPGRADE: "upgrade"
} as const);

export const RESPONSE_TYPE = Object.freeze({
    JSON: "json",
    TEXT: "text",
    XML: "xml",
    WEB_MANIFEST: "manifest"
} as const);

export const HTTP_MIME_TYPES_CHARSETS = Object.freeze({
    UTF_8: '; charset=utf-8'
} as const)

export const HTTP_MIME_TYPES = Object.freeze({
    APPLICATION_JSON: "application/json",
    APPLICATION_XML: "application/xml",
    APPLICATION_FORM_URLENCODED: "application/x-www-form-urlencoded",
    APPLICATION_OCTET_STREAM: "application/octet-stream",
    APPLICATION_PDF: "application/pdf",
    APPLICATION_ZIP: "application/zip",
    APPLICATION_GZIP: "application/gzip",
    APPLICATION_CBOR: "application/cbor",
    APPLICATION_JWT: "application/jwt",
    APPLICATION_WWW_FORM_URLENCODED: "application/x-www-form-urlencoded",

    APPLICATION_MANIFEST_JSON: "application/manifest+json",

    MULTIPART_FORM_DATA: "multipart/form-data",
    MULTIPART_MIXED: "multipart/mixed",

    TEXT_PLAIN: "text/plain",
    TEXT_HTML: "text/html",
    TEXT_CSS: "text/css",
    TEXT_CSV: "text/csv",
    TEXT_MARKDOWN: "text/markdown",
    TEXT_EVENT_STREAM: "text/event-stream",
    TEXT_JAVASCRIPT: "text/javascript",

    APPLICATION_JAVASCRIPT: "application/javascript",

    IMAGE_PNG: "image/png",
    IMAGE_JPEG: "image/jpeg",
    IMAGE_GIF: "image/gif",
    IMAGE_WEBP: "image/webp",
    IMAGE_SVG_XML: "image/svg+xml",
    IMAGE_AVIF: "image/avif",

    FONT_WOFF: "font/woff",
    FONT_WOFF2: "font/woff2",
    FONT_TTF: "font/ttf",
    FONT_OTF: "font/otf",

    AUDIO_MPEG: "audio/mpeg",
    AUDIO_OGG: "audio/ogg",
    AUDIO_WEBM: "audio/webm",

    VIDEO_MP4: "video/mp4",
    VIDEO_WEBM: "video/webm",
    VIDEO_OGG: "video/ogg"
} as const);

export const HTTP_CACHE_CONTROL_DIRECTIVES = Object.freeze({
    NO_CACHE: "no-cache",
    NO_STORE: "no-store",
    NO_TRANSFORM: "no-transform",
    MUST_REVALIDATE: "must-revalidate",
    PROXY_REVALIDATE: "proxy-revalidate",

    PUBLIC: "public",
    PRIVATE: "private",

    MAX_AGE: "max-age",
    S_MAXAGE: "s-maxage",

    STALE_WHILE_REVALIDATE: "stale-while-revalidate",
    STALE_IF_ERROR: "stale-if-error",

    IMMUTABLE: "immutable"
} as const);

export const HEADER_CACHE_CONTROL_FAILURE_VALUES = Object.freeze({
    DEFAULT: "no-store, no-cache, must-revalidate, max-age=0"
} as const)

export const HEADER_CACHE_CONTROL_SUCCESS_VALUE = Object.freeze({
    DEFAULT: "public, max-age="
} as const)

export const HEADER_PRAGMA_VALUES = Object.freeze({
    NO_CACHE: "no-cache"
} as const)

export const HEADER_EXPIRES_VALUES = Object.freeze({
    ZERO: "0"
} as const)

export const HEADER_X_ROBOTS_TAG_VALUES = Object.freeze({
    NO_INDEX: "noindex",
    NO_FOLLOW: "nofollow"
} as const)

export const HEADER_VARY_VALUES = Object.freeze({
    ACCEPT_ENCODING: "accept-encoding"
} as const)

export const HEADER_X_CONTENT_TYPE_OPTIONS_VALUES = Object.freeze({
    NOSNIFF: "nosniff"
} as const)

export const HEADER_X_FRAME_OPTIONS_VALUES = Object.freeze({
    DENY: "DENY"
} as const)

export const HEADER_REFERRER_POLICY_VALUES = Object.freeze({
    NO_REFERRER: "no-referrer"
} as const)