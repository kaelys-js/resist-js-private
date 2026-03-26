/**
 * URL STRING SCHEMA
 *
 * SUMMARY  
 *   Validates that the input is a syntactically valid, absolute URL according
 *   to the WHATWG URL standard. Supports all standard schemes (http, https,
 *   ftp, file, data, ws, wss) while rejecting malformed or ambiguous values.
 *
 * PURPOSE   
 *   Ensures downstream systems receive a fully-qualified, well-formed URL
 *   string suitable for:
 *   - network requests  
 *   - resource resolution  
 *   - redirect handling  
 *   - link normalization  
 *   - analytics ingestion  
 *   - configuration schemas  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any absolute URL  
 *   - strings compatible with `new URL()`  
 *
 *   REJECTS:
 *   - relative URLs  
 *   - protocol-relative URLs  
 *   - malformed URL strings  
 *   - non-string values  
 *   - empty strings  
 *
 * OUTPUT CONTRACT  
 *   Returns the original URL unchanged (no normalization).  
 *
 * VALIDATION RULES  
 *   - Must be a non-empty string  
 *   - Must parse cleanly via WHATWG `new URL()`  
 *   - Must contain a protocol + hostname component  
 *
 * SEMANTIC NOTES  
 *   This schema guarantees only **syntactic correctness**, not that the URL is
 *   reachable or resolves to a secure resource.
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://example.com"
 *   "https://example.com/path?query=1"
 *   "ftp://server.domain.net/file.bin"
 *
 *   // Invalid
 *   "/relative/path"
 *   "example.com"
 *   "ht!tp://bad"
 *   ""
 *   ```
 */
export const urlString = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },
    "Expected a valid absolute URL."
);

/**
* OUTPUT TYPE — URL STRING
*
* SUMMARY  
*   Represents a validated, fully-qualified URL. This type guarantees that all
*   values conform to WHATWG URL syntax and include a protocol and host.
*
* PURPOSE  
*   Provides a safe and strongly-typed identifier for:
*   - network endpoints  
*   - redirect targets  
*   - integration configuration  
*   - analytics pipelines  
*   - backend resource references  
*
* EXAMPLE  
*   ```
*   const endpoint: UrlString =
*       parse(urlString, "https://api.example.com/v1/users");
*   ```
*/
export type UrlString = v.InferOutput<typeof urlString>;

/**
 * HTTP/HTTPS URL SCHEMA
 *
 * SUMMARY  
 *   Validates that the input is a **fully-qualified HTTP or HTTPS URL** using
 *   the WHATWG URL parser. This schema explicitly restricts protocols to
 *   `http:` and `https:` ensuring that only web-transport URLs are accepted.
 *
 * PURPOSE  
 *   Guarantees a safe, normalized input for:
 *   - API endpoints  
 *   - webhook URLs  
 *   - OAuth callback URLs  
 *   - redirect targets  
 *   - frontend/backend cross-origin communication  
 *   - configuration values requiring HTTP(S) only  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - strings parseable by WHATWG `new URL()`  
 *   - URLs whose `.protocol` is `http:` or `https:`  
 *
 *   REJECTS:
 *   - non-string values  
 *   - empty strings  
 *   - relative URLs (`/path`, `./a`, `../b`)  
 *   - protocol-relative (`//example.com`)  
 *   - any protocol other than http/https (ftp, ws, wss, file, mailto, etc.)  
 *   - malformed URLs  
 *
 * OUTPUT CONTRACT  
 *   Returns the validated string unchanged.  
 *   No normalization or trimming is performed automatically.  
 *
 * VALIDATION RULES  
 *   - Input must be a non-empty string  
 *   - Must parse successfully via WHATWG URL  
 *   - Must satisfy:  
 *       ```
 *       url.protocol === "http:" || url.protocol === "https:"
 *       ```  
 *
 * SEMANTIC NOTES  
 *   This schema is widely applicable in secure backend systems because it
 *   forbids dangerous or ambiguous protocols (data:, file:, javascript:, etc.)
 *   while guaranteeing interoperable URL syntax.
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://example.com"
 *   "http://localhost:8080/api"
 *
 *   // Invalid
 *   "ftp://example.com"
 *   "/relative"
 *   "example.com"
 *   "ws://socket.example.com"
 *   ""
 *   ```
 */
export const urlHttp = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;
        try {
            const u = new URL(value);
            return u.protocol === "http:" || u.protocol === "https:";
        } catch {
            return false;
        }
    },
    "Expected a valid HTTP or HTTPS URL."
);

/**
* OUTPUT TYPE — HTTP/HTTPS URL
*
* SUMMARY  
*   Represents a validated absolute HTTP/HTTPS URL whose protocol is guaranteed
*   to be either `http:` or `https:` with full WHATWG URL compliance.
*
* PURPOSE  
*   Suitable for any configuration or runtime field requiring strict web-safe
*   transport URLs, including:
*   - backend API targets  
*   - CDN endpoints  
*   - service discovery  
*   - callback and redirect URLs  
*   - telemetry collectors  
*
* EXAMPLE  
*   ```
*   const endpoint: UrlHttp =
*       parse(urlHttp, "https://api.example.com/v1/status");
*   ```
*/
export type UrlHttp = v.InferOutput<typeof urlHttp>;

/**
 * WEB-TRANSPORT URL SCHEMA
 *
 * SUMMARY  
 *   Validates that the input is a syntactically valid absolute URL using one of
 *   the four web-transport protocols:
 *
 *     - http:
 *     - https:
 *     - ws:
 *     - wss:
 *
 *   This schema ensures that only URLs suitable for browser-based and
 *   server-side web transport are accepted.
 *
 * PURPOSE  
 *   This schema is essential for:
 *   - REST and RPC endpoints  
 *   - WebSocket endpoints  
 *   - real-time service connections  
 *   - CORS allowlist validation  
 *   - URL configuration in distributed systems  
 *   - frontend/backend service discovery  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *     - must be a non-empty string  
 *     - must parse successfully via WHATWG `new URL()`  
 *     - protocol must be one of: http:, https:, ws:, wss:
 *
 *   REJECTS:
 *     - any other protocol (ftp:, file:, data:, chrome-extension:, blob:, etc.)  
 *     - protocol-relative URLs ("//example.com")  
 *     - malformed URLs  
 *     - relative URLs  
 *     - empty or whitespace-only strings  
 *     - non-string types  
 *
 * OUTPUT CONTRACT  
 *   - Returns the original URL string unchanged.  
 *   - No normalization (lowercasing, trimming, origin-stripping) is performed.  
 *
 * VALIDATION RULES  
 *   - MUST satisfy:  
 *       ```
 *       url.protocol ∈ { "http:", "https:", "ws:", "wss:" }
 *       ```
 *
 * SEMANTIC NOTES  
 *   This schema is stricter than `urlString` and `urlHttp` because it constrains
 *   the protocol set to **web transport only**, ensuring interoperability with
 *   both HTTP and WebSocket environments.
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://example.com"
 *   "ws://localhost:9001/socket"
 *   "wss://realtime.example.com/hub"
 *
 *   // Invalid
 *   "ftp://example.com"
 *   "/relative"
 *   "example.com"
 *   "file:///etc/passwd"
 *   "data:text/plain;base64,..."
 *   ```
 */
export const urlWeb = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);
            return (
                u.protocol === "http:" ||
                u.protocol === "https:" ||
                u.protocol === "ws:" ||
                u.protocol === "wss:"
            );
        } catch {
            return false;
        }
    },
    "Expected a valid web-transport URL (http, https, ws, wss)."
);

/**
* OUTPUT TYPE — WEB-TRANSPORT URL
*
* SUMMARY  
*   Represents a validated web-transport URL, restricting the protocol to one
*   of four web-safe values: http, https, ws, or wss.
*
* PURPOSE  
*   Strongly typed guarantee for runtime and configuration values that must
*   correspond to actual web endpoints.
*
* EXAMPLE  
*   ```
*   const socketEndpoint: UrlWeb =
*       parse(urlWeb, "wss://stream.example.com/live");
*   ```
*/
export type UrlWeb = v.InferOutput<typeof urlWeb>;

/**
 * HOSTNAME-ONLY URL SCHEMA
 *
 * SUMMARY  
 *   Validates that the input is a **strict RFC-3986-compliant hostname** or
 *   fully-qualified domain name (FQDN) without any protocol, path, port,
 *   credentials, query string, or fragment.
 *
 *   This schema ensures the input is *only* a host component and nothing more.
 *
 * PURPOSE  
 *   Provides a hardened validation layer for systems requiring a pure hostname
 *   such as:
 *   - service discovery records  
 *   - DNS-based configuration  
 *   - domain-based routing  
 *   - CORS allowlists  
 *   - reverse-proxy configuration  
 *   - analytics grouping  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - ASCII domain names (`example.com`, `api.service.local`)  
 *   - Punycode-encoded IDNA domains (`xn--bücher.com`)  
 *   - IPv4 addresses (`192.168.1.10`)  
 *   - IPv6 addresses **without brackets** (`2001:db8::1`)  
 *
 *   REJECTS:
 *   - strings containing protocol (`https://example.com`)  
 *   - path segments (`example.com/foo`)  
 *   - port numbers (`example.com:8080`)  
 *   - hash fragments (`example.com#x`)  
 *   - query strings (`example.com?test=1`)  
 *   - bracket-wrapped IPv6 (`[2001:db8::1]`) — not allowed in host-only form  
 *   - whitespace-only strings  
 *   - malformed domain labels  
 *   - non-string types  
 *
 * OUTPUT CONTRACT  
 *   Returns the original hostname string unchanged.  
 *   No trimming, lowercasing, or normalization is performed automatically.  
 *
 * VALIDATION LOGIC  
 *   - Must be a non-empty string  
 *   - Must match **exactly one** of the valid host patterns:
 *       - RFC 1035 domain name (labels: a–z, 0–9, hyphen; no leading/trailing
 *         hyphen; max 63 chars per label; max total 255)
 *       - IPv4 dotted-quad  
 *       - IPv6 unbracketed hexadecimal address  
 *   - Must *not* contain:
 *       - protocol prefix  
 *       - path  
 *       - port  
 *       - search/query  
 *       - fragment  
 *   - Must not exceed FQDN length constraints  
 *
 * SEMANTIC NOTES  
 *   This schema is intentionally strict to preserve security and ensure clean
 *   host-level semantics. Hostnames are frequently consumed by:
 *   - load balancers  
 *   - reverse proxies  
 *   - mTLS client-verification logic  
 *   - DNS resolution layers  
 *   - multi-tenant routing  
 *
 *   Rejecting ambiguous or loosely formatted values prevents:
 *   - SSRF injection  
 *   - hostname smuggling  
 *   - protocol confusion attacks  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "example.com"
 *   "api.internal"
 *   "xn--bcher-kva.com"
 *   "192.168.0.1"
 *   "2001:db8::ff00:42:8329"
 *
 *   // Invalid
 *   "https://example.com"
 *   "example.com:443"
 *   "example.com/path"
 *   "[2001:db8::1]"
 *   "exa_mple.com"
 *   " example.com "
 *   ""
 *   ```
 */
export const urlHost = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        // Reject any forbidden characters that imply non-host content
        if (
            value.includes("/") ||
            value.includes(":") ||
            value.includes("?") ||
            value.includes("#") ||
            value.includes("@")
        ) {
            return false;
        }

        // IPv4
        const ipv4 =
            /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
        if (ipv4.test(value)) return true;

        // IPv6 — unbracketed
        const ipv6 =
            /^[0-9A-Fa-f:]+(?:\:[0-9A-Fa-f]+)*$/;
        if (value.includes(":") && ipv6.test(value)) return true;

        // Domain (RFC-1035)
        const domain =
            /^(?=.{1,255}$)(?:(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)\.)*(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)$/;
        return domain.test(value);
    },
    "Expected a valid hostname (no protocol, no port, no path)."
);

/**
* OUTPUT TYPE — HOSTNAME-ONLY VALUE
*
* SUMMARY  
*   Represents a validated, RFC-3986-compliant hostname. The value is guaranteed
*   to contain **only** the host component — no protocol, path, query, port,
*   or fragment.
*
* PURPOSE  
*   Useful when strict host separation is required for:
*   - DNS resolution  
*   - multi-tenant routing  
*   - origin allowlists  
*   - CORS policy enforcement  
*   - service discovery  
*   - API gateway routing  
*
* CONTRACT GUARANTEES  
*   Always one of:
*   - valid domain name  
*   - IPv4 address  
*   - IPv6 address (unbracketed)  
*
* SEMANTIC NOTES  
*   Values returned by this schema should NOT be used as full URLs. They must
*   be combined with protocol, port, and path separately and safely.
*
* EXAMPLE  
*   ```
*   const host: UrlHost = parse(urlHost, "api.example.com");
*   dns.lookup(host, ...);
*   ```
*/
export type UrlHost = v.InferOutput<typeof urlHost>;

/**
 * ORIGIN-ONLY URL SCHEMA
 *
 * SUMMARY  
 *   Validates that the input is a **strict origin**, consisting exclusively of:
 *
 *     scheme "://" host [ ":" port ]
 *
 *   with **no path, parameters, query string, or fragment allowed**. This schema
 *   enforces precise WHATWG-origin semantics, making it suitable for high-
 *   integrity security decisions and cross-origin logic.
 *
 * PURPOSE  
 *   Provides a hardened input contract for:
 *   - CORS allowlists  
 *   - service-to-service trust boundaries  
 *   - multi-tenant routing  
 *   - browser-side origin checks  
 *   - OAuth redirect origin validation  
 *   - request provenance and analytics normalization  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute URLs where:
 *       - protocol is http, https, ws, wss  
 *       - host is valid per RFC-3986  
 *       - optional port is included  
 *       - path is absent or is exactly "/" (canonical empty path)  
 *
 *   REJECTS:
 *   - paths longer than "/"  
 *   - query strings  
 *   - fragments  
 *   - credentials (`user:pass@`)  
 *   - non-web protocols (ftp:, file:, data:, etc.)  
 *   - whitespace-only or empty strings  
 *   - non-string types  
 *
 * OUTPUT CONTRACT  
 *   Returns the fully-qualified origin string, preserving the original host
 *   casing and port. No normalization is performed.
 *
 * VALIDATION LOGIC  
 *   - Must be a valid web-transport URL per WHATWG  
 *   - Must satisfy:
 *       ```
 *       url.pathname in ["", "/"]
 *       url.search   === ""
 *       url.hash     === ""
 *       url.username === ""
 *       url.password === ""
 *       ```
 *
 * SEMANTIC NOTES  
 *   Origins form the **core security primitive** in browser networking. They
 *   define the boundary for:
 *   - cross-origin requests  
 *   - cookie scoping  
 *   - localStorage isolation  
 *   - service worker registration  
 *
 *   Incorrect parsing of origins can lead to:
 *   - SSRF attacks  
 *   - origin smuggling  
 *   - privilege escalation  
 *   - CORS bypasses  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://example.com"
 *   "https://example.com:8080"
 *   "http://localhost"
 *   "wss://stream.example.com"
 *
 *   // Invalid
 *   "https://example.com/path"
 *   "https://example.com?q=1"
 *   "https://example.com/#x"
 *   "ftp://example.com"
 *   "https://user:pass@example.com"
 *   "example.com"
 *   "/relative"
 *   ```
 */
export const urlOrigin = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            // Must use a web protocol
            if (
                u.protocol !== "http:" &&
                u.protocol !== "https:" &&
                u.protocol !== "ws:" &&
                u.protocol !== "wss:"
            ) {
                return false;
            }

            // Must have NO username/password
            if (u.username || u.password) return false;

            // Must have NO search or fragment
            if (u.search !== "" || u.hash !== "") return false;

            // Path must be empty or "/"
            if (!(u.pathname === "" || u.pathname === "/")) return false;

            return true;
        } catch {
            return false;
        }
    },
    "Expected a valid origin in the form scheme://host[:port]."
);

/**
* OUTPUT TYPE — ORIGIN VALUE
*
* SUMMARY  
*   Represents a validated origin string that includes:
*   - scheme (http/https/ws/wss)  
*   - hostname  
*   - optional port  
*
*   Guaranteed to contain **no path**, **no query**, and **no fragment**.
*
* PURPOSE  
*   Suitable for:
*   - CORS configuration  
*   - cross-origin permission matrices  
*   - validating redirect and callback origins  
*   - origin-based access control  
*   - service discovery  
*   - analytics attribution  
*
* CONTRACT GUARANTEES  
*   Always a well-formed origin per WHATWG, preserving:
*   - protocol  
*   - hostname  
*   - port  
*
* SEMANTIC NOTES  
*   Origins represent the fundamental security boundary in browser networking.
*   This type guarantees correctness and prevents origin-smuggling attacks.
*
* EXAMPLE  
*   ```
*   const origin: UrlOrigin = parse(urlOrigin, "https://api.example.com:8443");
*   ```
*/
export type UrlOrigin = v.InferOutput<typeof urlOrigin>;

/**
 * URL PATH SCHEMA
 *
 * SUMMARY  
 *   Validates that the input is a **syntactically valid URL path**, enforcing
 *   RFC-3986 segment structure, prohibiting traversal sequences, and rejecting
 *   malformed encodings or unsafe characters.
 *
 *   A URL path must begin with `/`, may contain multiple hierarchical
 *   segments, and may optionally terminate with a trailing slash.
 *
 * PURPOSE  
 *   Ensures safe, canonical path values for:
 *   - routing tables  
 *   - API endpoint definitions  
 *   - reverse-proxy rules  
 *   - static asset mapping  
 *   - server-side request handling  
 *   - multi-tenant path isolation  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - strings beginning with `/`  
 *   - zero or more segments separated by `/`  
 *   - percent-encoded characters (valid UTF-8 only)  
 *   - trailing slashes (optional)  
 *
 *   REJECTS:
 *   - empty strings  
 *   - strings not starting with `/`  
 *   - `.` or `..` traversal segments  
 *   - embedded NUL or control characters  
 *   - malformed percent-escapes (`%`, `%GZ`, `%2`)  
 *   - path components in which decoding produces invalid UTF-8  
 *   - whitespace-only values  
 *   - non-string types  
 *
 * OUTPUT CONTRACT  
 *   Returns the original string unchanged.  
 *   No normalization, decoding, or re-encoding is performed.  
 *
 * VALIDATION LOGIC  
 *   - Must be a string starting with `/`  
 *   - Must match allowed character set:
 *       - unreserved:  A-Z a-z 0-9  _  -  .  ~  
 *       - sub-delims:  !  $  &  '  (  )  *  +  ,  ;  =  
 *       - pct-encoded: `%` HEX HEX  
 *       - path delimiter: `/`  
 *
 *   - MUST NOT contain:
 *       - raw spaces  
 *       - encoded NUL (`%00`)  
 *       - traversal segments (`/./`, `/../`)  
 *       - `//` (optional strictness: this schema forbids it)  
 *
 * SEMANTIC NOTES  
 *   `urlPath` enforces **high-integrity routing correctness**. Path injection,
 *   traversal, and Unicode mismatches are frequent vectors for:
 *
 *   - SSRF  
 *   - LFI/RFI  
 *   - cache-key poisoning  
 *   - privilege escalation in multi-tenant routers  
 *
 *   This schema eliminates those risks by constraining the path to a strictly
 *   valid and safe character set.
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "/"
 *   "/api/v1/users"
 *   "/assets/icons/logo.png"
 *   "/a/b/c/"
 *   "/café"               // UTF-8 if encoded properly ("%C3%A9")
 *   "/file/%E2%82%AC"     // "€"
 *
 *   // Invalid
 *   ""                    // empty
 *   "api/users"           // missing leading slash
 *   "/../secret"          // traversal
 *   "/a//b"               // double slash not allowed
 *   "/file/%ZZ"           // invalid percent-encoding
 *   "/file/%C3"           // incomplete encoding
 *   "/null/%00"           // NUL not allowed
 *   ```
 */
export const urlPath = v.custom(
    (value) => {
        if (typeof value !== "string" || value === "" || value.trim() === "") {
            return false;
        }

        // Must start with /
        if (!value.startsWith("/")) return false;

        // Double slashes forbidden for security clarity
        if (value.includes("//")) return false;

        // Reject traversal
        if (value.includes("/../") || value.includes("/./")) return false;

        // Reject control characters (0x00–0x1F, 0x7F)
        if (/[\u0000-\u001F\u007F]/.test(value)) return false;

        // RFC 3986 allowed path characters (raw + pct-encoded)
        const PATH_PATTERN =
            /^\/(?:[A-Za-z0-9._~!$&'()*+,;=:@-]|%(?:[0-9A-Fa-f]{2}))*$/;

        if (!PATH_PATTERN.test(value)) return false;

        return true;
    },
    "Expected a valid RFC-3986 URL path (starting with '/', no traversal, no invalid characters)."
);

/**
* OUTPUT TYPE — URL PATH
*
* SUMMARY  
*   Represents a validated, RFC-3986-compliant path component suitable for use
*   in APIs, routing, proxying, and security-critical URL handling.
*
* PURPOSE  
*   Ensures type-level guarantees that a path:
*   - starts with `/`  
*   - contains only safe characters  
*   - contains no traversal segments  
*   - is safe for direct use in request routing
*
* CONTRACT GUARANTEES  
*   Always returns a safe, unmodified string beginning with `/`.  
*
* SEMANTIC NOTES  
*   This type is a cornerstone of secure server design. A validated path
*   protects routers, filesystem gateways, API routers, and SSRF policies.
*
* EXAMPLE  
*   ```
*   const p: UrlPath = parse(urlPath, "/api/v1/items/42");
*   router.match(p);
*   ```
*/
export type UrlPath = v.InferOutput<typeof urlPath>;

/**
 * URL QUERY PARAMS SCHEMA
 *
 * SUMMARY  
 *   Validates that the input is a **standalone query-string component**, i.e. a
 *   string beginning with `?` followed by one or more RFC-3986-compliant
 *   key/value pairs. Enforces strict percent-encoding correctness, rejects
 *   malformed segments, and protects against injection vectors commonly
 *   observed in query-string payloads.
 *
 * PURPOSE  
 *   Provides hardened validation for query-string parsing workflows used in:
 *   - API request validation  
 *   - analytics ingestion  
 *   - URL normalization  
 *   - redirect & callback verification  
 *   - filtering, sorting, pagination parameters  
 *   - structured search parameter schemas  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - strings beginning with `?`  
 *   - empty query (`?`)  
 *   - keys containing RFC 3986 unreserved + sub-delim characters  
 *   - values containing the same (including percent-encoding)  
 *   - repeated keys (`a=1&a=2`)  
 *   - array-like keys (`a[]=1`)  
 *
 *   REJECTS:
 *   - strings not starting with `?`  
 *   - fragments (`#…`)  
 *   - keys or values with invalid percent-encoding (`%2`, `%GZ`, etc.)  
 *   - control characters  
 *   - embedded semicolons used for injection (`?x=1;DROP TABLE`)  
 *   - malformed `key=value` structures  
 *   - whitespace-only strings  
 *   - non-string types  
 *
 * OUTPUT CONTRACT  
 *   Returns the original query-string unchanged.  
 *   No decoding, key-sorting, or normalization is performed.  
 *
 * VALIDATION LOGIC  
 *   - MUST start with `?`  
 *   - MUST NOT contain `#`  
 *   - Segments must be of the form:
 *       `key[=value]`  
 *   - Keys and values must match:
 *       - unreserved: A-Z a-z 0-9  _  .  -  ~  
 *       - sub-delims: ! $ & ' ( ) * + , ; =  
 *       - pct-encoded: % HEX HEX  
 *   - Empty value is permitted: `?key=`  
 *   - Empty key is **not** permitted  
 *
 * SEMANTIC NOTES  
 *   Query-string handling is a high-risk area. This schema prevents:
 *   - SQL-style injection sequences  
 *   - command injection via separators  
 *   - filter traversal attacks  
 *   - malformed Unicode handling  
 *   - ambiguous parsing logic across application layers  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "?a=1"
 *   "?q=hello%20world"
 *   "?a=1&b=2"
 *   "?arr[]=a&arr[]=b"
 *   "?"
 *
 *   // Invalid
 *   "a=1"            // missing leading '?'
 *   "?a=%"           // bad percent-encoding
 *   "?a=%GZ"         // invalid hex
 *   "?a=1#frag"      // fragment not allowed
 *   "?a=1;b=2"       // semicolon injection
 *   "?=1"            // empty key
 *   ```
 */
export const urlQueryParams = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        // Must begin with '?'
        if (!value.startsWith("?")) return false;

        // Fragments not allowed
        if (value.includes("#")) return false;

        // Allow bare '?'
        if (value === "?") return true;

        // Remove leading '?'
        const qs = value.slice(1);

        // Split into key-value segments
        const segments = qs.split("&");
        for (const seg of segments) {
            if (seg === "") return false;

            // key=value or key=
            const [key, val] = seg.split("=", 2);

            // Key must exist
            if (!key) return false;

            // Allowed characters (RFC 3986)
            const PART =
                /^[A-Za-z0-9._~!$&'()*+,;=:-]|%(?:[0-9A-Fa-f]{2})/;

            const SAFE =
                /^([A-Za-z0-9._~!$&'()*+,;=:-]|%(?:[0-9A-Fa-f]{2}))*$/;

            if (!SAFE.test(key)) return false;
            if (val !== undefined && !SAFE.test(val)) return false;
        }

        return true;
    },
    "Expected a valid RFC-3986 query-string (starting with '?', valid key/value pairs)."
);

/**
* OUTPUT TYPE — QUERY STRING COMPONENT
*
* SUMMARY  
*   Represents a validated query-string component beginning with `?` and
*   containing only RFC-3986-compliant key/value pairs.
*
* PURPOSE  
*   Ensures safe handling of query-strings in:
*   - analytics  
*   - request parsing  
*   - search/filter interfaces  
*   - redirect/callback logic  
*   - multi-tenant parameter routing  
*
* CONTRACT GUARANTEES  
*   Always returns:
*   - a string beginning with `?`  
*   - containing only safe, syntactically valid parameters  
*
* SEMANTIC NOTES  
*   This type is foundational for safe and consistent URL composition.
*
* EXAMPLE  
*   ```
*   const q: UrlQueryParams = parse(urlQueryParams, "?page=1&sort=asc");
*   ```
*/
export type UrlQueryParams = v.InferOutput<typeof urlQueryParams>;

/**
 * COERCED & NORMALIZED URL SCHEMA
 *
 * SUMMARY  
 *   Accepts a wide variety of user-supplied URL-like inputs (strings with
 *   whitespace, uppercase hostnames, missing trailing slashes, mixed encoding,
 *   redundant path segments, ETC.) and **coerces them into a fully normalized,
 *   canonical WHATWG URL**. This includes cleanup, validation, and strict
 *   sanitization.
 *
 *   Normalization includes:
 *     - trimming surrounding whitespace  
 *     - lowercasing the hostname  
 *     - collapsing redundant path segments  
 *     - resolving percent-encodings  
 *     - normalizing default ports (e.g., :80 → removed for http)  
 *     - generating `href` as the canonical string output  
 *
 * PURPOSE  
 *   Ideal for user-facing input or configuration where incoming URL strings may
 *   be inconsistent or poorly formatted. Common use-cases:
 *   - configuration files  
 *   - user-submitted endpoints  
 *   - webhook targets  
 *   - admin dashboards  
 *   - analytics ingestion  
 *   - service-discovery mapping  
 *   - canonicalization before hashing or storing URLs  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any primitive convertible to string  
 *   - messy URL strings with leading/trailing whitespace  
 *   - uppercase or mixed-case hostname  
 *   - URLs missing normalization  
 *
 *   REJECTS:
 *   - values that cannot form a valid absolute URL  
 *   - relative URLs  
 *   - URLs missing protocol  
 *   - malformed encodings  
 *   - non-string/non-convertibles (objects, arrays, functions)  
 *
 * OUTPUT CONTRACT  
 *   Returns the **canonical URL string**, equal to `new URL(input).href`.
 *   This means:
 *   - normalized protocol  
 *   - normalized hostname (lowercase)  
 *   - normalized path  
 *   - normalized port  
 *   - guaranteed absolute form  
 *
 * VALIDATION LOGIC  
 *   - `String(input)` is trimmed  
 *   - MUST successfully parse under WHATWG URL  
 *   - MUST contain protocol + hostname  
 *   - Canonical `.href` returned on success  
 *
 * SEMANTIC NOTES  
 *   This schema is **not** a basic validator—it is a *canonicalizer*.  
 *   It transforms unclear URLs into clean and unambiguous canonical URLs, which
 *   is critical for:
 *   - deduplication  
 *   - caching keys  
 *   - database normalization  
 *   - ensuring consistent behavior across distributed systems  
 *
 *   Prevents:
 *   - duplicate URL entries differing only by formatting  
 *   - ambiguous routing  
 *   - user-input inconsistencies  
 *
 * EXAMPLES  
 *   ```
 *   // Valid & Coerced
 *   " https://EXAMPLE.com/Api/../v1 "  →  "https://example.com/v1"
 *   "HTTP://Test.com"                  →  "http://test.com/"
 *   "https://api.example.com:80"       →  "https://api.example.com/"
 *
 *   // Invalid
 *   "example.com"            // missing protocol
 *   "/api/users"             // relative
 *   "ht!tp://bad"            // malformed
 *   {}                       // non-string
 *   ```
 */
export const urlCoerce = v.coerce(
    v.string("Expected a URL-like value."),
    (input: any) => {
        if (input === null || input === undefined) {
            throw new Error("Expected a URL-like value.");
        }

        const raw = String(input).trim();
        if (raw === "") throw new Error("Expected a non-empty URL string.");

        let u: URL;
        try {
            u = new URL(raw);
        } catch {
            throw new Error("Expected a valid absolute URL.");
        }

        // Normalize the hostname (lowercase)
        u.hostname = u.hostname.toLowerCase();

        // Return canonical string
        return u.href;
    }
);

/**
* OUTPUT TYPE — COERCED URL
*
* SUMMARY  
*   Represents a **fully canonicalized absolute URL string** produced by the
*   `urlCoerce` schema. The returned string is guaranteed to be:
*   - normalized  
*   - absolute  
*   - WHATWG-compliant  
*   - safe for indexing, caching, hashing, persistence, and routing  
*
* PURPOSE  
*   Ensures that all downstream consumers receive a URL in a consistent format,
*   eliminating ambiguity from upstream user input or flexible configuration
*   formats.
*
* CONTRACT GUARANTEES  
*   - Always a valid absolute URL (WHATWG `href` format)  
*   - Hostname is always lowercase  
*   - Path is fully normalized  
*   - Default ports removed  
*   - Guaranteed to include protocol and host  
*
* SEMANTIC NOTES  
*   This type represents a **canonical** URL — not simply a validated one.  
*   Canonicalization is essential for:
*   - cache-key identity  
*   - URL fingerprinting  
*   - cross-service consistency  
*   - duplicate elimination  
*   - security rule evaluation  
*
* EXAMPLE  
*   ```
*   const clean: UrlCoerce = parse(urlCoerce,
*     " HTTPS://Example.COM/api/../v1 ");
*
*   console.log(clean); // "https://example.com/v1"
*   ```
*/
export type UrlCoerce = v.InferOutput<typeof urlCoerce>;

/**
 * URL ARRAY SCHEMA
 *
 * SUMMARY  
 *   Validates that the input is an array of **fully canonicalized absolute
 *   URLs**, where each element is processed through the `urlCoerce` schema.
 *   This guarantees that all URLs inside the collection are syntactically
 *   valid, normalized, and unambiguous.
 *
 * PURPOSE  
 *   Used for configuration fields and runtime structures containing multiple
 *   URL endpoints, such as:
 *   - service clusters  
 *   - webhook subscribers  
 *   - reverse-proxy upstream lists  
 *   - CDN edge sources  
 *   - cross-origin allowlists  
 *   - load balancer backends  
 *   - fallback endpoint chains  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - arrays containing any input accepted by `urlCoerce`  
 *   - mixed messy URL inputs (whitespace, bad casing, missing normalization)  
 *   - arrays of any length, including empty arrays  
 *
 *   REJECTS:
 *   - non-array types  
 *   - arrays containing null, undefined, or non-string, non-coercible values  
 *   - entries that cannot be turned into a valid absolute URL  
 *
 * OUTPUT CONTRACT  
 *   Returns a **new array** of canonical URL strings courtesy of `urlCoerce`,
 *   where each element is fully normalized and validated.
 *
 * VALIDATION LOGIC  
 *   - Must be an array  
 *   - Each element must pass `urlCoerce`  
 *   - No additional normalization applied to the array structure itself  
 *   - Order preserved as-is  
 *
 * SEMANTIC NOTES  
 *   Arrays of URLs are frequently involved in:
 *   - cluster rotation  
 *   - multi-target routing  
 *   - weighted load balancing  
 *   - webhook fan-out systems  
 *
 *   Canonicalizing each URL ensures:
 *   - consistent hashing  
 *   - stable deduplication  
 *   - predictable cluster key generation  
 *   - safety against malformed configuration entries  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   ["https://api.example.com", " https://EXAMPLE.com/v1  "]
 *
 *   // Output
 *   ["https://api.example.com/", "https://example.com/v1"]
 *
 *   // Invalid
 *   ["", "/relative", "notaurl", null]
 *
 *   // Empty array allowed
 *   []
 *   ```
 */
export const urlArray = v.array(urlCoerce, "Expected an array of valid URLs.");

/**
 * OUTPUT TYPE — ARRAY OF CANONICAL URLS
 *
 * SUMMARY  
 *   Represents a validated list of absolute, normalized URLs produced by
 *   `urlArray`. Each entry is guaranteed to be a fully canonical URL string.
 *
 * PURPOSE  
 *   Provides a safe type-level contract for any operation that requires
 *   multiple URLs, including:
 *   - upstream lists  
 *   - failover chains  
 *   - load balancer target pools  
 *   - webhook distribution sets  
 *
 * CONTRACT GUARANTEES  
 *   - Always an array  
 *   - Every element always a canonical URL (WHATWG `.href` format)  
 *   - Hostnames always lowercase  
 *   - No invalid or malformed values present  
 *
 * SEMANTIC NOTES  
 *   This is the preferred type for storing, hashing, comparing, and indexing
 *   collections of endpoint URLs.
 *
 * EXAMPLE  
 *   ```
 *   const endpoints: UrlArray = parse(urlArray, [
 *     " http://API.EXAMPLE.com ",
 *     "https://example.com/v1/../v2",
 *   ]);
 *
 *   // → ["http://api.example.com/", "https://example.com/v2"]
 *   ```
 */
export type UrlArray = v.InferOutput<typeof urlArray>;

/**
 * URL MAP SCHEMA
 *
 * SUMMARY  
 *   Validates that the input is a **string-keyed record/dictionary** whose
 *   values are all **canonical absolute URLs** processed through the
 *   `urlCoerce` schema. Rejects prototype-pollution keys, empty keys, and
 *   invalid entries. Used for configuration objects mapping service names,
 *   tenants, clusters, or feature identifiers to URL endpoints.
 *
 * PURPOSE  
 *   Provides a hardened structure for multi-endpoint configurations including:
 *   - microservice endpoint registries  
 *   - routing tables  
 *   - CDN source maps  
 *   - analytics ingestion endpoints  
 *   - webhook subscription maps  
 *   - tenant → endpoint lookup tables  
 *   - multicluster failover maps  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - plain JavaScript objects  
 *   - string keys (non-empty, valid identifiers, no prototype pollution keys)  
 *   - values that can be coerced to valid absolute URLs  
 *
 *   REJECTS:
 *   - non-object values (arrays, null, primitives)  
 *   - objects with prototype-pollution key names:
 *       "__proto__", "constructor", "prototype"  
 *   - empty string keys  
 *   - values that cannot be coerced to valid canonical URLs  
 *
 * OUTPUT CONTRACT  
 *   Returns a **new object** where each value has been fully normalized by
 *   `urlCoerce`. Key order is preserved as provided.
 *
 * VALIDATION LOGIC  
 *   - Must be a plain object  
 *   - Key must be a safe, non-empty string  
 *   - Each corresponding value must pass `urlCoerce`  
 *   - Must not contain dangerous or misleading object keys  
 *
 * SEMANTIC NOTES  
 *   URL maps are widely used in distributed systems as configuration metadata.
 *   This schema ensures:
 *   - elimination of malformed endpoints  
 *   - safe and predictable object shapes  
 *   - immunity to prototype traversal attacks  
 *   - canonical URL identity across the system  
 *
 *   Useful for:
 *   - static configs  
 *   - live service registry  
 *   - routing DSLs  
 *   - environmental overrides  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   {
 *     api: "https://api.example.com",
 *     auth: " https://AUTH.example.com/v1 "
 *   }
 *
 *   // Output
 *   {
 *     api: "https://api.example.com/",
 *     auth: "https://auth.example.com/v1"
 *   }
 *
 *   // Invalid
 *   null
 *   []
 *   { __proto__: "https://bad.com" }
 *   { auth: "/relative" }
 *   { api: "notaurl" }
 *   ```
 */
export const urlMap = v.custom(
    (value) => {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
            return false;
        }

        const forbiddenKeys = new Set(["__proto__", "constructor", "prototype"]);

        for (const key of Object.keys(value)) {
            // key validation
            if (typeof key !== "string" || key.trim() === "") return false;
            if (forbiddenKeys.has(key)) return false;

            try {
                // Each entry must pass urlCoerce
                parse(urlCoerce, value[key]);
            } catch {
                return false;
            }
        }

        return true;
    },
    "Expected an object mapping string keys to valid canonical URLs."
).pipe(
    v.transform((input: Record<string, any>) => {
        const output: Record<string, string> = {};
        for (const key of Object.keys(input)) {
            output[key] = parse(urlCoerce, input[key]);
        }
        return output;
    })
);

/**
* OUTPUT TYPE — URL MAP
*
* SUMMARY  
*   Represents a mapping of **string keys to canonical absolute URLs** generated
*   by the `urlMap` schema. Every entry is guaranteed to contain a fully
*   normalized URL string.
*
* PURPOSE  
*   Ideal for configuration objects and distributed routing metadata such as:
*   - service registries  
*   - multi-endpoint configurations  
*   - tenant → endpoint mappings  
*   - CDN or proxy upstream maps  
*   - security allowlists and blocklists  
*
* CONTRACT GUARANTEES  
*   - Always a plain object  
*   - All keys are safe, non-empty strings  
*   - All values are canonical URLs derived from `urlCoerce`  
*   - No prototype pollution keys  
*
* SEMANTIC NOTES  
*   Useful anywhere you require **deterministic** URL resolution across many
*   components or services. Ensures normalization before caching, hashing, or
*   storing.
*
* EXAMPLE  
*   ```
*   const endpoints: UrlMap = parse(urlMap, {
*     api: "https://API.EXAMPLE.com",
*     auth: " http://auth.example.com/v1/../v2 "
*   });
*
*   // {
*   //   api: "https://api.example.com/",
*   //   auth: "http://auth.example.com/v2"
*   // }
*   ```
*/
export type UrlMap = v.InferOutput<typeof urlMap>;

/**
 * URL FIELD SCHEMA FACTORY
 *
 * SUMMARY  
 *   Produces a **strict, self-describing field object schema** for representing
 *   canonical absolute URLs alongside a human-readable description. Intended for
 *   configuration metadata, schema-driven UI forms, analytics descriptors,
 *   service registry records, and machine-readable documentation.
 *
 *   The resulting schema validates:
 *     {
 *       description: string;
 *       value: canonical-url-string;
 *     }
 *
 *   where `value` is fully normalized by `urlCoerce`.
 *
 * PURPOSE  
 *   Ensures strong typing and validation around structured URL fields used in:
 *   - service manifests  
 *   - configuration panels  
 *   - metadata-driven routing  
 *   - endpoint registries  
 *   - schema-driven documentation  
 *   - feature-config systems  
 *
 * INPUT CONTRACT  
 *   The factory accepts:
 *     - `description: string` (static description assigned to the field)
 *
 *   The resulting schema then accepts objects of the form:
 *     { description: string; value: any }
 *
 *   where:
 *   - `description` inside the input object is validated as a string  
 *   - but is **replaced** with the static description provided to the factory  
 *   - `value` MUST pass `urlCoerce`  
 *
 *   REJECTS:
 *   - non-object inputs  
 *   - missing `description` or `value` keys  
 *   - non-string descriptions  
 *   - values that cannot be coerced into canonical URLs  
 *   - arrays or null values  
 *
 * OUTPUT CONTRACT  
 *   Returns a new object:
 *     {
 *       description: STATIC_DESCRIPTION,
 *       value: canonical-url-string
 *     }
 *
 *   where `value` is fully normalized according to WHATWG URL rules.
 *
 * VALIDATION LOGIC  
 *   - The input must be a plain object with `description` and `value` keys  
 *   - `description` must be a string, but is overridden by factory-provided value  
 *   - `value` is passed through `urlCoerce`  
 *   - Outputs a fully canonical, safe, stable structure  
 *
 * SEMANTIC NOTES  
 *   This schema pattern ensures **immutable schema descriptions** while allowing
 *   safe, normalized URL insertion. It is suited for:
 *   - infrastructure configuration  
 *   - runtime metadata  
 *   - analytics dimensions  
 *   - declarative capability specifications  
 *
 * EXAMPLES  
 *   ```
 *   const webhookField = createUrlField("Webhook target URL");
 *
 *   const field = parse(webhookField, {
 *     description: "ignored by transform",
 *     value: " HTTPS://API.EXAMPLE.com/v1/../notify "
 *   });
 *
 *   // Output:
 *   {
 *     description: "Webhook target URL",
 *     value: "https://api.example.com/notify"
 *   }
 *   ```
 */
export const createUrlField = (description: string) =>
    v
        .object(
            {
                description: v.string("Description must be a string."),
                value: urlCoerce,
            },
            "URL field must be an object with { description, value }."
        )
        .pipe(
            v.transform((input) => ({
                description,
                value: input.value,
            }))
        );

/**
* OUTPUT TYPE — URL FIELD
*
* SUMMARY  
*   Represents the strongly-typed output of a URL field schema created by
*   `createUrlField`. Provides a canonical structure containing:
*     - a fixed description string  
*     - a canonical absolute URL  
*
* PURPOSE  
*   Provides a safe, strongly-typed contract for:
*   - configuration objects  
*   - schema-driven user interfaces  
*   - metadata registries  
*   - typed routing tables  
*   - documentation systems  
*
* CONTRACT GUARANTEES  
*   The output type always has the shape:
*   ```
*   {
*     description: T;
*     value: string;    // canonical WHATWG URL
*   }
*   ```
*
* SEMANTIC NOTES  
*   `T` allows external systems (config loaders, UI generators, documentation
*   builders) to attach compile-time metadata to URLs while ensuring strict
*   runtime validation.
*
* EXAMPLE  
*   ```
*   type WebhookField = UrlField<"Webhook endpoint">;
*
*   const field: WebhookField = parse(
*     createUrlField("Webhook endpoint"),
*     { description: "ignored", value: "https://API.com/x" }
*   );
*   ```
*/
export type UrlField<T extends string = string> = {
    description: T;
    value: string;
};

/**
 * UNIVERSAL URL SCHEMA (“ANY PROTOCOL”)
 *
 * SUMMARY  
 *   Validates that the input is a **syntactically correct absolute URL** using
 *   the WHATWG URL parser, without imposing any restrictions on the protocol.
 *   Accepts every protocol permitted by `new URL()`, including non-web,
 *   application-specific, and vendor-specific schemes.
 *
 * PURPOSE  
 *   Used when systems must accept a broad spectrum of URL types, including:
 *   - file/archive URLs  
 *   - browser extension URLs  
 *   - data URIs  
 *   - custom application protocols  
 *   - internal IPC bridges  
 *   - mailto & messaging URIs  
 *   - special-purpose handlers (intent:, app:, vscode:, etc.)  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any non-empty string that parses via `new URL()`  
 *   - all valid WHATWG URL schemes  
 *   - correctly percent-encoded paths  
 *   - URLs with any valid component (host, opaque path, username/password, etc.)  
 *
 *   REJECTS:
 *   - empty strings  
 *   - whitespace-only strings  
 *   - relative URLs (`/api`, `./x`, `../x`)  
 *   - malformed encodings  
 *   - non-string types  
 *
 * OUTPUT CONTRACT  
 *   Returns the original input URL unchanged (no normalization).  
 *
 * VALIDATION LOGIC  
 *   - Trim input string (via explicit check, not mutation)  
 *   - Attempt WHATWG parsing  
 *   - Reject on parse failure  
 *   - Accept any protocol returned by `URL.protocol`  
 *
 * SEMANTIC NOTES  
 *   `urlAny` is deliberately _most permissive_ while still guaranteeing strict
 *   syntactic correctness. It is ideal for:
 *   - “pass-through” URL handling  
 *   - telemetry ingestion  
 *   - registry formats storing arbitrary URL schemes  
 *   - systems integrating with unknown external protocols  
 *
 *   Security-sensitive logic must use more restrictive schemas (e.g. `urlHttp`,
 *   `urlWeb`, `urlOrigin`) instead of `urlAny`.
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://example.com/"
 *   "file:///usr/local/bin"
 *   "mailto:help@example.com"
 *   "data:text/plain;base64,SGVsbG8="
 *   "custom-scheme://service/resource"
 *   "vscode://file/home/user/project"
 *
 *   // Invalid
 *   "/relative/path"
 *   "example.com"
 *   " ht!tp://bad "
 *   ""
 *   ```
 */
export const urlAny = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },
    "Expected a valid absolute URL of any protocol."
);

/**
* OUTPUT TYPE — UNIVERSAL URL
*
* SUMMARY  
*   Represents a validated absolute URL string that may use **any protocol**,
*   as long as it is accepted by the WHATWG `URL` constructor.
*
* PURPOSE  
*   Useful for:
*   - universal URL registries  
*   - metadata ingestion pipelines  
*   - systems interacting with custom/proprietary URL schemes  
*   - “unknown protocol” handlers  
*   - pass-through storage  
*
* CONTRACT GUARANTEES  
*   - Always a valid absolute URL  
*   - Always a string  
*   - Protocol is **not** restricted (file:, data:, mailto:, ftp:, etc.)  
*   - No coercion, normalization, or mutation  
*
* SEMANTIC NOTES  
*   This type SHOULD NOT be used for security boundaries or routing. Use
*   protocol-specific schemas instead for:
*   - request URLs  
*   - CORS origins  
*   - web-service communication  
*
* EXAMPLE  
*   ```
*   const link: UrlAny = parse(urlAny, "file:///usr/local/etc/config");
*   ```
*/
export type UrlAny = v.InferOutput<typeof urlAny>;

/**
 * URL WITHOUT QUERY STRING SCHEMA
 *
 * SUMMARY  
 *   Validates that the input is a **syntactically valid absolute URL** which
 *   contains **no query-string component**. The URL may include protocol, host,
 *   port, and path, but MUST NOT contain `?`, `?key=value`, or any other form
 *   of search parameters.
 *
 * PURPOSE  
 *   Used for systems where the presence of a query-string is undesirable,
 *   ambiguous, or prohibited, such as:
 *   - CDN or asset URLs  
 *   - canonical content identifiers  
 *   - static resources  
 *   - webhook base endpoints  
 *   - strict routing rules  
 *   - cache-key sanitized URLs  
 *   - security-sensitive redirect validation  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any absolute URL that parses via WHATWG `new URL()`  
 *   - URLs with protocol, host, port, path  
 *   - trailing slashes  
 *
 *   REJECTS:
 *   - URLs containing ANY query component:
 *       - "https://example.com?x"  
 *       - "https://example.com/?a=1"  
 *       - "https://example.com?"  
 *   - relative URLs  
 *   - malformed URLs  
 *   - non-string values  
 *   - empty or whitespace-only strings  
 *
 * OUTPUT CONTRACT  
 *   Returns the original URL string unchanged.  
 *   No coercion, no normalization, no mutation.  
 *
 * VALIDATION LOGIC  
 *   - Trim input string for emptiness check (non-mutating)  
 *   - Attempt WHATWG URL parsing  
 *   - Reject if `url.search` is non-empty  
 *
 * SEMANTIC NOTES  
 *   Removing query-strings is critical in environments where URLs must be:
 *   - immutable identifiers  
 *   - cache-stable  
 *   - unambiguous routing keys  
 *   - safe for filesystem mapping  
 *   - free from attacker-controlled variables  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://example.com"
 *   "https://example.com/path/to/file"
 *   "http://localhost:8080/api"
 *
 *   // Invalid
 *   "https://example.com?x"
 *   "https://example.com/?a=1"
 *   "https://example.com?"
 *   "/relative"
 *   "example.com"
 *   ""
 *   ```
 */
export const urlNoQuery = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);
            return u.search === "";
        } catch {
            return false;
        }
    },
    "Expected a valid absolute URL with no query-string component."
);

/**
 * OUTPUT TYPE — URL WITHOUT QUERY COMPONENT
 *
 * SUMMARY  
 *   Represents a validated absolute URL which is **guaranteed to contain no
 *   query-string**. This ensures clean, stable identifiers for routing, asset
 *   mapping, and security-sensitive workflows.
 *
 * PURPOSE  
 *   Appropriate for:
 *   - asset URLs  
 *   - canonical URL references  
 *   - redirect/whitelist entries  
 *   - filesystem-backed routing  
 *   - multi-tenant content addressing  
 *
 * CONTRACT GUARANTEES  
 *   - Always a valid absolute URL  
 *   - Always a string  
 *   - `search` component ALWAYS empty  
 *
 * SEMANTIC NOTES  
 *   Useful when query-strings introduce ambiguity or when manipulating URLs
 *   without query parameters is required by the system’s invariants.
 *
 * EXAMPLE  
 *   ```
 *   const clean: UrlNoQuery =
 *       parse(urlNoQuery, "https://example.com/path/to/page");
 *   ```
 */
export type UrlNoQuery = v.InferOutput<typeof urlNoQuery>;

/**
 * URL WITHOUT FRAGMENT SCHEMA
 *
 * SUMMARY  
 *   Validates that the input is a **syntactically valid absolute URL** which
 *   contains **no fragment component** (i.e., no `#` and no content after `#`).
 *
 *   The URL may freely include:
 *     - protocol  
 *     - hostname  
 *     - port  
 *     - path  
 *     - query parameters  
 *
 *   But MUST NOT include any fragment identifier.
 *
 * PURPOSE  
 *   Used in systems where fragments:
 *   - break caching  
 *   - complicate routing rules  
 *   - interfere with CDN or proxy behavior  
 *   - are rejected by downstream services  
 *   - represent user-interface-only metadata not intended for backend logic  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any absolute URL where `new URL()` succeeds  
 *   - URLs with any combination of protocol, host, port, path, query  
 *
 *   REJECTS:
 *   - URLs containing a fragment (`#`)  
 *   - URLs containing only a fragment at the end (`…#`)  
 *   - URLs with malformed syntax  
 *   - relative URLs  
 *   - non-string values  
 *   - empty or whitespace-only strings  
 *
 * OUTPUT CONTRACT  
 *   Returns the original unmodified input URL string.  
 *
 * VALIDATION LOGIC  
 *   - Validate string type  
 *   - Attempt WHATWG URL parsing  
 *   - Must satisfy:
 *       ```
 *       url.hash === ""
 *       ```
 *
 * SEMANTIC NOTES  
 *   Fragment identifiers are meant for **client-side navigation only** and are
 *   never sent to servers. Using fragment-bearing URLs in backend, CDN, or
 *   multi-layer routing systems typically yields incorrect or inconsistent
 *   behavior, making this schema essential for structural integrity.
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://example.com"
 *   "https://example.com/api?x=1"
 *   "https://example.com/page/sub"
 *
 *   // Invalid
 *   "https://example.com#section"
 *   "https://example.com/page#"
 *   "https://example.com/path?x=1#foo"
 *   "/relative"
 *   "example.com"
 *   ```
 */
export const urlNoFragment = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);
            return u.hash === "";
        } catch {
            return false;
        }
    },
    "Expected a valid absolute URL with no fragment identifier."
);

/**
* OUTPUT TYPE — URL WITHOUT FRAGMENT COMPONENT
*
* SUMMARY  
*   Represents a validated absolute URL **guaranteed to contain no fragment**.
*   Ensures compatibility with backend systems, proxies, routing tables, and
*   infrastructure components that do not support or expect fragment-bearing
*   URLs.
*
* PURPOSE  
*   Useful for:
*   - CDN route definitions  
*   - backend-only routing  
*   - signed URL generation  
*   - security-sensitive URL verification  
*   - canonical URL storage  
*
* CONTRACT GUARANTEES  
*   - Always a valid absolute URL  
*   - Always a string  
*   - Never contains a `#fragment`  
*
* SEMANTIC NOTES  
*   Fragment identifiers are inherently client-side and never transmitted
*   during HTTP requests. Removing them enforces backend-level consistency.
*
* EXAMPLE  
*   ```
*   const clean: UrlNoFragment =
*       parse(urlNoFragment, "https://example.com/path?x=1");
*   ```
*/
export type UrlNoFragment = v.InferOutput<typeof urlNoFragment>;

/**
 * URL WITHOUT EMBEDDED CREDENTIALS SCHEMA
 *
 * SUMMARY  
 *   Validates that the input is a **syntactically valid absolute URL** which
 *   contains **no embedded username or password** in the authority component.
 *
 *   The URL may freely include:
 *     - protocol (any WHATWG-valid scheme)
 *     - hostname
 *     - port
 *     - path
 *     - query parameters
 *     - fragment
 *
 *   But MUST NOT include:
 *     - `username@host`
 *     - `username:password@host`
 *
 * PURPOSE  
 *   Embedded credentials in URLs are dangerous and often unintended. This
 *   schema prevents:
 *   - accidental credential leakage  
 *   - SSRF privilege escalation  
 *   - poisoning of server logs with secrets  
 *   - bypass of downstream authentication checks  
 *   - misconfigured webhooks or callback endpoints containing OAuth secrets  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any absolute URL where `new URL()` succeeds  
 *   - URLs with any combination of path, query, fragment  
 *
 *   REJECTS:
 *   - URLs containing username/password (`url.username || url.password`)  
 *   - relative URLs  
 *   - malformed URLs  
 *   - empty or whitespace-only strings  
 *   - non-string values  
 *
 * OUTPUT CONTRACT  
 *   Returns the original unmodified URL string.  
 *   Does **not** normalize or canonicalize.  
 *
 * VALIDATION LOGIC  
 *   - Attempt WHATWG parsing  
 *   - Validate:
 *       ```
 *       url.username === "" && url.password === ""
 *       ```  
 *
 * SEMANTIC NOTES  
 *   Credential-bearing URLs are prohibited in most security policies and should
 *   never appear in:
 *   - redirects  
 *   - logs  
 *   - internal service calls  
 *   - public configuration  
 *   - CDN or proxy routing  
 *
 *   This schema enforces that invariant.
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://example.com"
 *   "https://example.com/api?x=1#test"
 *   "http://localhost:8080/path"
 *
 *   // Invalid
 *   "https://user@example.com"
 *   "https://user:pass@example.com"
 *   "http://admin:1234@192.168.1.10"
 *   ```
 */
export const urlNoAuth = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);
            return u.username === "" && u.password === "";
        } catch {
            return false;
        }
    },
    "Expected a valid absolute URL with no embedded username or password."
);

/**
* OUTPUT TYPE — URL WITHOUT EMBEDDED CREDENTIALS
*
* SUMMARY  
*   Represents a validated absolute URL that is **guaranteed not to contain**
*   username or password components in its authority section.
*
* PURPOSE  
*   Ensures safe URL handling in security-critical workflows:
*   - audit logging  
*   - service-to-service calls  
*   - multi-tenant routing  
*   - webhook configuration  
*   - user-facing link sanitation  
*
* CONTRACT GUARANTEES  
*   - Always a WHATWG-parseable absolute URL  
*   - Always a string  
*   - **Never** contains `username@` or `username:password@`  
*
* SEMANTIC NOTES  
*   This type is strongly recommended for:
*   - redirect URL validation  
*   - storage of URL references  
*   - OAuth redirect URIs  
*   - inbound/outbound URL security filters  
*
* EXAMPLE  
*   ```
*   const safe: UrlNoAuth =
*       parse(urlNoAuth, "https://example.com/api/v1?x=1#frag");
*   ```
*/
export type UrlNoAuth = v.InferOutput<typeof urlNoAuth>;

/**
 * FILE-URL SCHEMA (`file://`)
 *
 * SUMMARY  
 *   Validates that the input is a **syntactically valid file URL**, conforming
 *   to WHATWG URL semantics and RFC 8089. The URL MUST use the `file:` scheme
 *   and must represent either:
 *
 *     - a local filesystem path  
 *     - a platform-qualified absolute file reference  
 *     - a UNC-style network share (Windows)  
 *
 *   Examples of valid patterns:
 *     - `file:///usr/local/bin/node`
 *     - `file:///C:/Windows/System32`
 *     - `file://host/share/folder/file.txt`
 *
 * PURPOSE  
 *   Used in environments requiring secure and canonical handling of filesystem
 *   references:
 *   - sandboxed worker environments  
 *   - CLI tooling  
 *   - local asset resolution  
 *   - path whitelisting  
 *   - multi-platform path normalization layers  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any URL parseable by WHATWG where:
 *       - `url.protocol === "file:"`
 *       - `url.pathname` is non-empty
 *
 *   REJECTS:
 *   - non–`file:` schemes (http, https, ftp, data, etc.)
 *   - malformed file URLs
 *   - empty or whitespace string
 *   - relative filesystem paths (`/usr/bin`, `C:\Windows`, etc.)
 *   - non-string values
 *
 * OUTPUT CONTRACT  
 *   Returns the original input string without normalization.  
 *   Does NOT rewrite Windows drive letters or UNC hosts.  
 *
 * VALIDATION LOGIC  
 *   - Must parse under `new URL(input)`
 *   - Must satisfy:
 *       ```
 *       url.protocol === "file:" &&
 *       url.pathname !== ""
 *       ```
 *
 * SEMANTIC NOTES  
 *   - RFC 8089 requires `file://` URLs to have *absolute* path semantics.  
 *   - Windows drive letters appear as `/C:/...` inside the pathname.  
 *   - UNC hosts appear as:
 *       `file://server/share/path`
 *   - `file://localhost/...` is equivalent to `file:///...`  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "file:///etc/hosts"
 *   "file:///C:/Users/Cole/Documents/report.txt"
 *   "file://NAS01/media/movies/Inception.mkv"
 *
 *   // Invalid
 *   "/etc/hosts"
 *   "C:\\Users\\Cole"        // Not a URL
 *   "https://example.com"
 *   "file://"                // Missing path
 *   "file:/relative/path"    // Not absolute
 *   ```
 */
export const urlFile = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            // Must use file protocol
            if (u.protocol !== "file:") return false;

            // Pathname MUST exist (no empty paths)
            return u.pathname !== "";
        } catch {
            return false;
        }
    },
    "Expected a valid absolute file URL (file://)."
);

/**
* OUTPUT TYPE — FILE URL
*
* SUMMARY  
*   Represents a validated `file://` URL that references a local or networked
*   filesystem location. Ensures that downstream systems never receive paths
*   lacking absolute semantics, invalid platform formatting, or malformed URL
*   structure.
*
* PURPOSE  
*   Suitable for:
*   - secure path whitelisting  
*   - file-based configuration  
*   - worker/CLI resolver pipelines  
*   - devtools file inspection  
*   - local asset routing  
*
* CONTRACT GUARANTEES  
*   - Always a WHATWG-parseable file URL  
*   - Always uses the `file:` protocol  
*   - Always contains a non-empty absolute pathname  
*   - Always a string  
*
* SEMANTIC NOTES  
*   - Windows: expects `/C:/path` inside pathname  
*   - UNIX: expects `/usr/bin/...`  
*   - UNC shares remain supported via `file://hostname/path`  
*
* EXAMPLE  
*   ```
*   const f: UrlFile =
*       parse(urlFile, "file:///C:/Users/Cole/Desktop/notes.txt");
*   ```
*/
export type UrlFile = v.InferOutput<typeof urlFile>;

/**
 * WEBSOCKET URL SCHEMA (`ws://` or `wss://`)
 *
 * SUMMARY  
 *   Validates that the input string is a **syntactically correct WebSocket URL**
 *   using either the unencrypted `ws:` scheme or the encrypted `wss:` scheme.
 *   The URL must be absolute and must pass WHATWG URL parsing semantics.
 *
 *   Accepted forms include:
 *     - ws://example.com
 *     - ws://example.com:8080/socket
 *     - wss://secure.host/live
 *     - wss://foo.bar?room=123#frag
 *
 * PURPOSE  
 *   Ensures safe and canonical usage of WebSocket endpoints in:
 *   - multiplayer game engines  
 *   - WebRTC signaling  
 *   - LiveKit, mediasoup, Janus, Pion pipelines  
 *   - push/real-time messaging gateways  
 *   - distributed event bus architectures  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute URLs where:
 *       ```
 *       url.protocol === "ws:" || url.protocol === "wss:"
 *       ```
 *   - URLs with ports, paths, queries, fragments  
 *
 *   REJECTS:
 *   - non-WebSocket protocols (http, https, ftp, file, data, etc.)
 *   - relative URLs  
 *   - malformed URLs  
 *   - empty or whitespace-only strings  
 *   - non-string values  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original URL string unchanged**.  
 *   Does NOT rewrite ports, paths, or fragments.  
 *
 * VALIDATION LOGIC  
 *   - `typeof value === "string"`  
 *   - `new URL(value)` succeeds  
 *   - protocol is exactly `ws:` or `wss:`  
 *
 * SEMANTIC NOTES  
 *   WebSocket URLs are a strict subset of standard HTTP(S) URLs. Correct
 *   validation is essential for:
 *   - load balancer rules  
 *   - reverse proxy WS upgrades  
 *   - TURN/STUN signaling  
 *   - high-throughput event transport  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "ws://localhost:3000/socket"
 *   "wss://api.example.com/realtime"
 *   "wss://live.edge.net/feed?token=abc"
 *
 *   // Invalid
 *   "http://example.com"        // wrong protocol
 *   "/ws"                       // relative
 *   "ftp://server/ws"           // not websocket
 *   ""                          // empty
 *   ```
 */
export const urlWs = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);
            return u.protocol === "ws:" || u.protocol === "wss:";
        } catch {
            return false;
        }
    },
    "Expected a valid WebSocket URL (ws:// or wss://)."
);

/**
* OUTPUT TYPE — WEBSOCKET URL
*
* SUMMARY  
*   Represents a validated WebSocket endpoint suitable for real-time systems,
*   ensuring downstream infrastructure never receives malformed or insecure
*   WS/WSS URLs.
*
* PURPOSE  
*   Ideal for:
*   - multiplayer game networking  
*   - WebRTC signaling channels  
*   - pub/sub transports  
*   - distributed event systems  
*   - chat and presence systems  
*
* CONTRACT GUARANTEES  
*   - Always an absolute WebSocket URL  
*   - Always a WHATWG-parseable string  
*   - Always `ws:` or `wss:`  
*
* SEMANTIC NOTES  
*   WSS is strongly recommended for production environments.  
*
* EXAMPLE  
*   ```
*   const wsUrl: UrlWs =
*       parse(urlWs, "wss://live.example.com/room?id=123");
*   ```
*/
export type UrlWs = v.InferOutput<typeof urlWs>;

/**
 * FTP URL SCHEMA (`ftp://`)
 *
 * SUMMARY  
 *   Validates that the input string is a **syntactically correct FTP URL**
 *   using the `ftp:` protocol. This includes support for:
 *
 *     - optional username  
 *     - optional username:password  
 *     - hostnames or IPs  
 *     - optional ports  
 *     - path components  
 *     - query parameters  
 *     - fragments  
 *
 *   The URL MUST be absolute and MUST parse successfully via WHATWG `URL`.
 *
 * PURPOSE  
 *   Ensures safe and correct handling of FTP endpoints used in:
 *   - legacy file transfer systems  
 *   - migration pipelines  
 *   - batch ingestion loaders  
 *   - archival systems  
 *   - hybrid on-prem / cloud workflows  
 *   - partner-integrated data exchange  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any WHATWG-parseable absolute URL where:
 *       ```
 *       url.protocol === "ftp:"
 *       ```
 *
 *   REJECTS:
 *   - non-FTP schemes (`http:`, `https:`, `file:`, `sftp:`, `ftps:`…)  
 *   - malformed URLs  
 *   - relative URLs  
 *   - empty or whitespace-only strings  
 *   - non-string inputs  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original input string unchanged**.  
 *   No normalization is applied.  
 *
 * VALIDATION LOGIC  
 *   - Validate non-empty string  
 *   - Parse with WHATWG `URL`  
 *   - Confirm protocol === `ftp:`  
 *
 * SEMANTIC NOTES  
 *   FTP URLs are used across many legacy and standards-based systems. This
 *   schema enforces strict correctness to prevent:
 *   - insecure fallback to HTTP  
 *   - credential leakage via malformed authority components  
 *   - broken ingestion workflows  
 *   - SSRF-style misuse of protocol handlers  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "ftp://example.com"
 *   "ftp://user@example.com"
 *   "ftp://admin:1234@host:21/files/data.csv"
 *   "ftp://ftp.server.net/pub/archive?year=2023#ref"
 *
 *   // Invalid
 *   "http://example.com"
 *   "ftps://secure-server"      // not FTP
 *   "/relative/path"
 *   "example.com"
 *   ""                          // empty
 *   ```
 */
export const urlFtp = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);
            return u.protocol === "ftp:";
        } catch {
            return false;
        }
    },
    "Expected a valid FTP URL (ftp://)."
);


/**
* OUTPUT TYPE — FTP URL
*
* SUMMARY  
*   Represents a validated and WHATWG-compliant `ftp://` link suitable for
*   structured file-transfer systems and legacy interoperability layers.
*
* PURPOSE  
*   Used for:
*   - data ingestion  
*   - ETL automation  
*   - archival access  
*   - partner-to-partner file exchange  
*   - legacy FTP-backed workflows  
*
* CONTRACT GUARANTEES  
*   - Always a valid WHATWG file transfer URL  
*   - Always uses `ftp:` protocol  
*   - Always a string  
*
* SEMANTIC NOTES  
*   Authentication MAY exist in the authority section:
*   - `user@host`  
*   - `user:password@host`  
*
* EXAMPLE  
*   ```
*   const ftp: UrlFtp =
*       parse(urlFtp, "ftp://admin:123@ftp.example.com/data.csv");
*   ```
*/
export type UrlFtp = v.InferOutput<typeof urlFtp>;

/**
 * MAILTO URL SCHEMA (`mailto:`)
 *
 * SUMMARY  
 *   Validates that the input is a **syntactically valid RFC 6068 mailto URL**.
 *   The URL must use the `mailto:` scheme and must include *at least one*
 *   well-formed email address in the path component. Query parameters such as
 *   `subject`, `body`, `cc`, and `bcc` are allowed.
 *
 *   Example valid structures:
 *     - mailto:john@example.com
 *     - mailto:user1@example.com,user2@example.com
 *     - mailto:team@example.com?subject=Hello
 *     - mailto:me@example.com?cc=a@b.com&bcc=c@d.com&body=Text
 *
 * PURPOSE  
 *   Ensures strict adherence to RFC 6068 when processing:
 *   - deep links  
 *   - user-facing email actions  
 *   - support/contact links  
 *   - marketing automation  
 *   - templated mail composition  
 *   - device-level mailto handlers  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute URLs where:
 *       ```
 *       url.protocol === "mailto:"
 *       ```
 *   - path contains one or more comma-separated email addresses  
 *   - optional query parameters  
 *
 *   REJECTS:
 *   - missing email addresses  
 *   - malformed email addresses  
 *   - non-mailto schemes  
 *   - empty or whitespace-only strings  
 *   - non-string values  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original URL string unchanged**.  
 *
 * VALIDATION LOGIC  
 *   - Input must be a non-empty string  
 *   - MUST parse with WHATWG `URL`  
 *   - MUST have `protocol === "mailto:"`  
 *   - MUST contain one or more comma-separated RFC5322-valid email addresses  
 *
 *   Email validation pattern (robust, not permissive):
 *       ```
 *       /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 *       ```
 *
 * SEMANTIC NOTES  
 *   Mailto URLs are not network requests; they *invoke clients*.
 *   Ensuring correct structure prevents:
 *   - UI breakage  
 *   - improperly pre-filled fields  
 *   - marketing automation errors  
 *   - broken fallback routing on mobile  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "mailto:john@example.com"
 *   "mailto:a@b.com,c@d.com?subject=Hi"
 *   "mailto:team@company.com?body=Support request"
 *
 *   // Invalid
 *   "mailto:"                     // no email
 *   "mailto:invalid"              // not email
 *   "mailto:user@@example.com"    // invalid
 *   "http://example.com"          // wrong scheme
 *   ""                            // empty
 *   ```
 */
export const urlMailto = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            if (u.protocol !== "mailto:") return false;

            // RFC-like email validation (reasonably strict)
            const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            const emails = u.pathname.split(",").filter(Boolean);
            if (emails.length === 0) return false;

            return emails.every((email) => EMAIL.test(email));
        } catch {
            return false;
        }
    },
    "Expected a valid RFC 6068 mailto URL."
);

/**
* OUTPUT TYPE — MAILTO URL
*
* SUMMARY  
*   Represents a validated RFC 6068 mailto link, ensuring that downstream
*   systems receive **only well-formed, standards-compliant email deep links**.
*
* PURPOSE  
*   This type is designed for:
*   - contact links  
*   - pre-filled message composition  
*   - mobile/desktop mail client invocation  
*   - marketing and transactional emails  
*
* CONTRACT GUARANTEES  
*   - Always a valid `mailto:` URL  
*   - Always contains at least one valid email address  
*   - Always a string  
*
* SEMANTIC NOTES  
*   Query parameters (subject/body/cc/bcc) remain intact as provided in the
*   original string.  
*
* EXAMPLE  
*   ```
*   const m: UrlMailto =
*       parse(urlMailto, "mailto:support@example.com?subject=Help");
*   ```
*/
export type UrlMailto = v.InferOutput<typeof urlMailto>;

/**
 * TELEPHONE URL SCHEMA (`tel:`)
 *
 * SUMMARY  
 *   Validates that the input string is a **syntactically correct telephone URL**
 *   defined by RFC 3966 and using the `tel:` scheme. Telephone URIs represent
 *   telephone numbers in a standardized format, supporting global numbers,
 *   local numbers, extensions, and RFC-compliant parameters.
 *
 *   Valid examples include:
 *     - tel:+15551234567
 *     - tel:5551234567
 *     - tel:+1-555-123-4567
 *     - tel:+15551234567;ext=204
 *     - tel:+15551234567;isub=45;phone-context=example.com
 *     - tel:+15551234567p123         (pause)
 *     - tel:+15551234567w456         (wait)
 *
 * PURPOSE  
 *   Telephone URLs are used extensively in:
 *   - mobile deep links  
 *   - mobile/desktop "tap-to-call" interfaces  
 *   - customer-service and support tooling  
 *   - telecom automation  
 *   - provisioning APIs  
 *   - fraud detection (validating number formats)  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute URLs where:
 *       ```
 *       url.protocol === "tel:"
 *       ```
 *   - RFC 3966-compliant telephone numbers (global or local)
 *   - optional telephone parameters (e.g., ext, isub)
 *   - pause (`p`) and wait (`w`) characters
 *   - percent-encoded characters allowed by RFC
 *
 *   REJECTS:
 *   - missing phone number after `tel:`  
 *   - malformed numbers  
 *   - prohibited characters  
 *   - empty or whitespace strings  
 *   - non-string values  
 *   - wrong scheme  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original unmodified URL string**.
 *
 * VALIDATION LOGIC  
 *   - Must parse with WHATWG URL  
 *   - Must satisfy:
 *       ```
 *       url.protocol === "tel:"
 *       ```
 *   - Number is contained in `url.pathname` (NOT hostname)  
 *   - Validate telephone number using a strict RFC 3966-compliant pattern:
 *
 *       Global-number:      /^\+[\d\-\.()pwPW]+$/
 *       Local-number:       /^[\d\-\.()pwPW]+$/
 *       Extensions:         ;ext=digits
 *       Params:             ;key=value
 *
 *   Combined simplified rule used here:
 *       ```
 *       const TEL = /^[+]?[\d().-]*(?:[pw][\d().-]+)*(?:;[a-zA-Z0-9\-]+=[^;]+)*$/;
 *       ```
 *
 * SEMANTIC NOTES  
 *   Telephone numbers require careful parsing due to:
 *   - locale variation  
 *   - carrier-specific conventions  
 *   - RFC 3966 parameter semantics  
 *
 *   This schema validates structural correctness, not telecom routing validity.
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "tel:+15551234567"
 *   "tel:5551234"
 *   "tel:+1-555-123-4567;ext=200"
 *   "tel:+15551234567p123"
 *
 *   // Invalid
 *   "tel:"                // empty number
 *   "tel:+1(555)ABC"      // letters not allowed
 *   "tel:++123"           // malformed
 *   "http://example.com"  // wrong scheme
 *   ""
 *   ```
 */
export const urlTel = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;
        try {
            const u = new URL(value);

            if (u.protocol !== "tel:") return false;

            // RFC 3966-style validation (strict but practical)
            const TEL =
                /^[+]?[\d().-]*(?:[pwPW][\d().-]+)*(?:;[a-zA-Z0-9\-]+=[^;]+)*$/;

            const phone = u.pathname;
            if (!phone || phone.trim() === "") return false;

            return TEL.test(phone);
        } catch {
            return false;
        }
    },
    "Expected a valid RFC 3966 telephone URL (tel:)."
);

/**
* OUTPUT TYPE — TELEPHONE URL
*
* SUMMARY  
*   Represents a validated RFC 3966-compliant `tel:` URL containing a properly
*   structured telephone number, optional parameters, and optional dialing
*   modifiers.
*
* PURPOSE  
*   This type is appropriate for:
*   - mobile deep links  
*   - support/contact UI flows  
*   - telecom provisioning APIs  
*   - fraud detection systems  
*   - user profile phone-number storage  
*   - call automation pipelines  
*
* CONTRACT GUARANTEES  
*   - Always a valid telephone URL  
*   - Always RFC 3966 compliant  
*   - Always an absolute URL with `tel:` scheme  
*   - Always a string  
*
* SEMANTIC NOTES  
*   `urlTel` validates structure only — it does NOT validate:
*   - country existence  
*   - carrier assignment  
*   - number routability  
*
* EXAMPLE  
*   ```
*   const tel: UrlTel =
*       parse(urlTel, "tel:+15551234567;ext=100");
*   ```
*/
export type UrlTel = v.InferOutput<typeof urlTel>;

/**
 * SMS URL SCHEMA (`sms:`)
 *
 * SUMMARY  
 *   Validates that the input is a **syntactically correct SMS URL** as defined
 *   by RFC 5724. An SMS URL represents an instruction to initiate an SMS
 *   message composition action on a device, supporting:
 *
 *     - one or more telephone numbers (comma-separated)
 *     - optional `body=` parameter
 *     - optional `via=` parameter (service center address)
 *
 *   Examples of valid structures:
 *     - sms:+15551234567
 *     - sms:5551234
 *     - sms:+15551234567,+15551113333
 *     - sms:+15551234567?body=Hello%20World
 *     - sms:+15551234567?via=+18005550100
 *
 * PURPOSE  
 *   SMS URLs are used in:
 *   - mobile deep links  
 *   - customer-facing call-to-action flows  
 *   - marketing messages  
 *   - device-native “open SMS composer” operations  
 *   - telecom automation  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any absolute URL where:
 *       ```
 *       url.protocol === "sms:"
 *       ```
 *   - one or more comma-separated RFC3966-compatible phone numbers
 *   - optional query parameters for:
 *       - body (string)
 *       - via  (valid phone number)
 *
 *   REJECTS:
 *   - empty numbers  
 *   - malformed telephone numbers  
 *   - non-sms schemes  
 *   - empty or whitespace-only strings  
 *   - non-string inputs  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original URL string unchanged**.  
 *   Does NOT normalise numbers or query parameters.  
 *
 * VALIDATION LOGIC  
 *   - Ensure valid WHATWG URL  
 *   - Ensure protocol === `sms:`  
 *   - Extract telephone numbers from `url.pathname`
 *   - Validate each using RFC-style telephone rules:
 *
 *       const PHONE =
 *         /^[+]?[\d().-]*(?:[pwPW][\d().-]+)*(?:;[a-zA-Z0-9\-]+=[^;]+)*$/;
 *
 *   - If `via` is present in search params, validate it with the same rule  
 *   - `body` may be any non-empty string  
 *
 * SEMANTIC NOTES  
 *   SMS URLs are not network endpoints; they *instruct* devices to open a
 *   message composer. This schema strictly validates:
 *   - telecom number structure  
 *   - multi-recipient formatting  
 *   - optional fields  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "sms:+15551234567"
 *   "sms:+15551234567,+15557776666"
 *   "sms:+15551234567?body=Hello"
 *   "sms:+15551234567?via=+18005550100&body=Test"
 *
 *   // Invalid
 *   "sms:"                    // no number
 *   "sms:++123"               // malformed
 *   "sms:123?via=invalid"     // via not valid number
 *   "http://example.com"      // wrong scheme
 *   ""
 *   ```
 */
export const urlSms = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            if (u.protocol !== "sms:") return false;

            const PHONE =
                /^[+]?[\d().-]*(?:[pwPW][\d().-]+)*(?:;[a-zA-Z0-9\-]+=[^;]+)*$/;

            const numbers = u.pathname.split(",").filter(Boolean);
            if (numbers.length === 0) return false;

            if (!numbers.every((num) => PHONE.test(num))) return false;

            // Validate optional "via" parameter (if present)
            const via = u.searchParams.get("via");
            if (via && !PHONE.test(via)) return false;

            // "body" can be any non-empty string (percent encoding allowed)
            // no structural validation needed per RFC
            return true;
        } catch {
            return false;
        }
    },
    "Expected a valid RFC 5724 SMS URL (sms:)."
);

/**
* OUTPUT TYPE — SMS URL
*
* SUMMARY  
*   Represents a validated RFC 5724 SMS URL containing:
*   - one or more telephone numbers  
*   - optional message body  
*   - optional service center override (`via`)  
*
* PURPOSE  
*   Appropriate for:
*   - deep-linking into native SMS composers  
*   - mobile onboarding flows  
*   - dynamic message automation  
*   - telecom infrastructure  
*
* CONTRACT GUARANTEES  
*   - Always a valid `sms:` URL  
*   - Always contains at least one valid phone number  
*   - Always a string  
*   - Optional params (`body`, `via`) preserved exactly  
*
* SEMANTIC NOTES  
*   Logical meaning of the parameters is handset-specific; this schema ensures
*   only structural correctness, not telecom routing validity.
*
* EXAMPLE  
*   ```
*   const sms: UrlSms =
*       parse(urlSms, "sms:+15551234567?body=Hello%20World");
*   ```
*/
export type UrlSms = v.InferOutput<typeof urlSms>;

/**
 * IRC URL SCHEMA (`irc:`)
 *
 * SUMMARY  
 *   Validates that the input string is a **syntactically correct IRC URL**
 *   according to RFC 2812 and subsequent de facto URL-format conventions.
 *
 *   IRC URLs support multiple addressing modes:
 *     - Server-based:
 *         irc://irc.example.com/#channel
 *         irc://irc.example.com:6667/channel
 *
 *     - Local / client-default server:
 *         irc:#channel
 *         irc:///          (implicit client/server)
 *
 *     - Channel-join URLs with optional parameters:
 *         irc://irc.server/#channel?key=abc
 *         irc://irc.server:6697/#channel?password=secret
 *
 * PURPOSE  
 *   Used by:
 *   - IRC clients  
 *   - chat/developer tooling  
 *   - legacy collaboration platforms  
 *   - automation for bots, deployment, and alerts  
 *   - service integrations triggering IRC joins  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any WHATWG-parseable URL where:
 *       ```
 *       url.protocol === "irc:" || url.protocol === "ircs:"
 *       ```
 *     (Note: `ircs:` is the encrypted IRC protocol)
 *
 *   - host may be empty (`irc:#channel` is valid)
 *   - pathname must be one of:
 *       - empty
 *       - `/#channel`
 *       - `/channel`
 *   - channel names MUST begin with `#` or `&`
 *   - optional query parameters allowed (`key`, `password`, etc.)
 *
 *   REJECTS:
 *   - malformed channels  
 *   - non-IRC protocols  
 *   - invalid servernames  
 *   - empty scheme  
 *   - whitespace-only inputs  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original unmodified URL string**.  
 *
 * VALIDATION LOGIC  
 *   - Parse via WHATWG URL  
 *   - Scheme MUST be `irc:` or `ircs:`  
 *   - Host is optional  
 *   - Path may be:
 *       - ""  
 *       - "/"  
 *       - "/#channel"  
 *       - "/channel"  
 *
 *   Channel validation rule:
 *     const CHANNEL = /^(?:#|&)[^\s,]{1,200}$/;
 *
 * SEMANTIC NOTES  
 *   IRC URLs have unusual semantics compared to standard web URLs:
 *   - pathname encodes channel  
 *   - host MAY be missing  
 *   - empty path means “connect only”  
 *   - optional connect parameters are widely supported  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "irc://irc.libera.chat/#javascript"
 *   "irc://irc.server.net:6697/#devops?key=abc"
 *   "ircs://irc.secure.net/#channel"
 *   "irc:#localchannel"
 *   "irc:///#fallback"
 *
 *   // Invalid
 *   "irc://"                // no channel, no path — invalid for join
 *   "irc://server/"         // no channel
 *   "irc://server/#"        // empty channel
 *   "irc://server/###bad"   // malformed
 *   "http://example.com"    // wrong scheme
 *   ""
 *   ```
 */
export const urlIrc = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            // IRC supports irc: and ircs:
            if (u.protocol !== "irc:" && u.protocol !== "ircs:") {
                return false;
            }

            // Channel extraction:
            //
            // Mode A: irc://server/#channel → pathname="/#channel"
            // Mode B: irc:#channel → pathname="#channel"
            const raw = u.pathname.startsWith("/")
                ? u.pathname.slice(1)
                : u.pathname;

            // If raw is empty → OK only if host exists AND no join is requested.
            // Here we enforce: IRC URLs MUST specify a channel for the sake of safety.
            if (!raw) return false;

            // Validate channel
            const CHANNEL = /^(?:#|&)[^\s,]{1,200}$/;

            // raw may contain leading "#", "&", or be bare
            return CHANNEL.test(raw);
        } catch {
            return false;
        }
    },
    "Expected a valid IRC URL (irc://server/#channel or irc:#channel)."
);

/**
* OUTPUT TYPE — IRC URL
*
* SUMMARY  
*   Represents a validated IRC or IRCS URL pointing to either:
*   - a server + channel, or  
*   - a local/default IRC context, with a channel.
*
* PURPOSE  
*   Enables safe use of IRC join URLs within:
*   - developer tooling  
*   - live chat infrastructure  
*   - bots and automation  
*   - team collaboration systems  
*   - client launchers  
*
* CONTRACT GUARANTEES  
*   - Always a valid IRC URL  
*   - Always contains a valid channel  
*   - May contain a server or be local  
*   - Always a string  
*
* SEMANTIC NOTES  
*   `ircs:` (encrypted IRC) is fully supported.
*
* EXAMPLE  
*   ```
*   const link: UrlIrc =
*       parse(urlIrc, "irc://irc.libera.chat/#javascript");
*   ```
*/
export type UrlIrc = v.InferOutput<typeof urlIrc>;

/**
 * DATA URL SCHEMA (`data:`)
 *
 * SUMMARY  
 *   Validates that the input string is a **syntactically correct RFC 2397
 *   data URL** using the `data:` scheme. A data URL encodes a complete resource
 *   inline using:
 *
 *       data:[<mediatype>][;charset=<charset>][;base64],<data>
 *
 *   And may embed:
 *     - text  
 *     - images  
 *     - JSON  
 *     - XML  
 *     - any restricted or permitted MIME type  
 *     - optional base64-encoded payloads  
 *
 * PURPOSE  
 *   Enforces correctness for resource embedding in:
 *   - security-sensitive rendering pipelines  
 *   - HTML sanitizers  
 *   - email-templating engines  
 *   - sandboxed browser environments  
 *   - static-site generators  
 *   - asset inliners  
 *
 *   Prevents XSS vectors often introduced through malformed `data:` URLs.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - Any string that begins with `data:`  
 *   - Correct RFC 2397 structure:
 *       - required comma separator  
 *       - valid mediatype (optional but recommended)  
 *       - optional `;charset=`  
 *       - optional `;base64`  
 *       - valid base64 payload (if base64 mode enabled)  
 *
 *   REJECTS:
 *   - malformed data URLs  
 *   - missing comma separator  
 *   - invalid MIME types  
 *   - malformed base64 data in base64 mode  
 *   - whitespace-only or empty strings  
 *   - non-string inputs  
 *
 * OUTPUT CONTRACT  
 *   Returns **the original unmodified string**.  
 *
 * VALIDATION LOGIC  
 *   - Must start with `"data:"`  
 *   - Must contain one comma separating header from data  
 *   - Parse header segment:
 *       1. media type (optional)
 *       2. optional charset parameter
 *       3. optional base64 indicator
 *   - Parse payload segment after comma
 *   - If base64 flag present → payload MUST match strict base64:
 *
 *         /^[A-Za-z0-9+/]+={0,2}$/
 *
 *   - If base64 flag NOT present:
 *       - allow percent-encoding, UTF-8 text, or raw bytes  
 *
 * SEMANTIC NOTES  
 *   Malformed data URLs are a top-tier security risk:
 *   - XSS injection  
 *   - DOM clobbering  
 *   - spoofed MIME payloads  
 *   - script injection through fake MIME types  
 *
 *   This schema prevents structural attacks but does not enforce MIME
 *   safelists — which should be layered separately based on application needs.
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "data:text/plain,Hello"
 *   "data:text/plain;charset=utf-8,hello"
 *   "data:application/json;base64,eyJhIjoxfQ=="
 *   "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 *
 *   // Invalid
 *   "data:"                     // no comma
 *   "data:text/plain"           // no comma/payload
 *   "data:;base64,###"          // invalid base64
 *   "http://example.com"        // wrong scheme
 *   ""
 *   ```
 */
export const urlData = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        if (!value.startsWith("data:")) return false;

        // Must contain exactly one comma split
        const idx = value.indexOf(",");
        if (idx === -1) return false;

        const header = value.slice(5, idx); // after "data:" prefix
        const payload = value.slice(idx + 1);

        if (header.length === 0) {
            // RFC allows empty media-type, but requires the comma present
            // i.e. "data:,Hello" is legal
            // So we accept empty header but still require payload
            return payload.length > 0;
        }

        // Parse header components
        const parts = header.split(";");

        // First segment may be MIME type
        const mime = parts[0];
        if (mime && !/^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(mime)) {
            // If non-empty, it MUST be valid MIME type
            return false;
        }

        let isBase64 = false;

        for (let i = 1; i < parts.length; i++) {
            const p = parts[i].toLowerCase();

            if (p === "base64") {
                isBase64 = true;
                continue;
            }

            // charset param
            if (p.startsWith("charset=")) {
                // charset can be almost anything RFC-compatible; minimal check
                if (p.length <= 8) return false;
                continue;
            }

            // Unknown parameters allowed per RFC → ignore
        }

        if (isBase64) {
            // Strict base64 validation
            const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
            return BASE64.test(payload);
        }

        // Non-base64 mode — payload may contain any valid UTF-8 or percent encoding
        // Minimal check: cannot be empty
        return payload.length > 0;
    },
    "Expected a valid RFC 2397 data URL (data:)."
);

/**
* OUTPUT TYPE — DATA URL
*
* SUMMARY  
*   Represents a validated RFC 2397-compliant data URL containing:
*   - MIME type (optional)
*   - charset (optional)
*   - base64 flag (optional)
*   - raw or base64 payload
*
* PURPOSE  
*   Used for:
*   - safe HTML/data embedding  
*   - inline assets in SSR/CSR pipelines  
*   - high-security sanitation workflows  
*   - email inlining (images, attachments)  
*   - bundler transforms  
*
* CONTRACT GUARANTEES  
*   - Always a valid `data:` URL  
*   - Always structurally correct  
*   - Always a string  
*
* SEMANTIC NOTES  
*   This type guarantees only structural correctness, not MIME safelisting or
*   content safety. Application layers should enforce additional constraints.
*
* EXAMPLE  
*   ```
*   const img: UrlData =
*       parse(urlData, "data:image/png;base64,iVBOR...");
*   ```
*/
export type UrlData = v.InferOutput<typeof urlData>;

/**
 * BLOB URL SCHEMA (`blob:`)
 *
 * SUMMARY  
 *   Validates that the input string is a **syntactically correct WHATWG Blob
 *   URL**, which is an opaque, origin-bound object URL used by browsers to
 *   reference in-memory binary data.
 *
 *   Blob URLs take the form:
 *
 *       blob:<origin>/<identifier>
 *
 *   Where:
 *     - `<origin>` MUST be a valid origin (e.g., "https://example.com")
 *     - `<identifier>` is an opaque string, typically a UUID or crypto token
 *
 *   Examples:
 *     - blob:https://example.com/3b1e5d2f-1234-4a91-bcfe-88c2f9e19f15
 *     - blob:null/7c4d1bd0-a2ab-4eae-b61d-bd8f97e493ec
 *     - blob:http://localhost:3000/1e4b9e40-eec5-4e7b-8f3d-e3e2bc8d5d98
 *
 * PURPOSE  
 *   Blob URLs are essential for:
 *   - client-side rendering of binary data  
 *   - media streaming  
 *   - WebRTC / canvas / image manipulation  
 *   - secure, revocable in-memory data references  
 *   - sandboxed document viewing  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any string beginning with `blob:`  
 *   - URLs matching WHATWG blob URL structure  
 *   - opaque identifiers of arbitrary length  
 *
 *   REJECTS:
 *   - missing `/` separator between origin and identifier  
 *   - invalid origins  
 *   - malformed blob identifiers  
 *   - empty identifiers  
 *   - whitespace-only inputs  
 *   - non-string types  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original, unmodified blob URL**.  
 *
 * VALIDATION LOGIC  
 *   Blob URL format: `blob:<origin>/<id>`
 *
 *   Steps:
 *     1. Ensure `value` starts with `"blob:"`
 *     2. Split into:
 *          prefix = "blob:"
 *          rest   = "<origin>/<id>"
 *     3. Ensure `<origin>` parses under WHATWG `new URL()`
 *     4. Ensure `/` exists between origin and identifier
 *     5. Ensure identifier is non-empty and contains no spaces
 *
 *   Identifier rule:
 *
 *       const IDENT = /^[^\s]+$/;
 *
 *   Origin MUST be a valid absolute URL (or the literal `"null"` allowed by
 *   WHATWG for opaque origins).
 *
 * SEMANTIC NOTES  
 *   Blob URLs are:
 *     - unique per document or execution context  
 *     - revocable via `URL.revokeObjectURL()`  
 *     - not fetchable across origins  
 *
 *   This schema **does not** validate origin-URL security policies — it ensures
 *   URL correctness only.
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "blob:https://example.com/abc123"
 *   "blob:null/3b12f1df-5232-3d3a-8c32-41d9a90c8a7f"
 *   "blob:http://localhost:3000/opaque-token-here"
 *
 *   // Invalid
 *   "blob:/no-origin"                // missing origin
 *   "blob:example.com/abc"           // invalid origin
 *   "blob:https://example.com/"      // missing identifier
 *   "http://example.com"             // wrong scheme
 *   ""
 *   ```
 */
export const urlBlob = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;
        if (!value.startsWith("blob:")) return false;

        const rest = value.slice(5); // strip "blob:"

        const slash = rest.indexOf("/");
        if (slash === -1) return false;

        const origin = rest.slice(0, slash);
        const id = rest.slice(slash + 1);

        // identifier MUST be non-empty
        if (!id || id.trim() === "") return false;

        // identifier MUST contain no whitespace
        const IDENT = /^[^\s]+$/;
        if (!IDENT.test(id)) return false;

        // origin MUST be a valid origin or the literal "null"
        if (origin !== "null") {
            try {
                const parsed = new URL(origin);
                if (!parsed.protocol) return false;
            } catch {
                return false;
            }
        }

        return true;
    },
    "Expected a valid WHATWG Blob URL (blob:<origin>/<identifier>)."
);

/**
* OUTPUT TYPE — BLOB URL
*
* SUMMARY  
*   Represents a validated Blob URL that points to an opaque, in-memory object
*   reference owned by the current origin or execution environment.
*
* PURPOSE  
*   Safely enables:
*   - programmatic media handling  
*   - object URL revocation  
*   - binary data preview  
*   - canvas/DOM integrations  
*   - local-only data referencing  
*
* CONTRACT GUARANTEES  
*   - Always begins with `blob:`  
*   - Always contains a valid origin  
*   - Always contains a non-empty identifier  
*   - Always a string  
*
* SEMANTIC NOTES  
*   Blob URLs are inherently ephemeral and must be explicitly revoked when no
*   longer needed:
*
*     URL.revokeObjectURL(value);
*
* EXAMPLE  
*   ```
*   const blobUrl: UrlBlob =
*       parse(urlBlob, "blob:https://app.example.com/6fbbfdff-a1cc-4c09");
*   ```
*/
export type UrlBlob = v.InferOutput<typeof urlBlob>;

/**
 * HYBRID FILE/HTTP URL SCHEMA (`file://`, `http://`, `https://`)
 *
 * SUMMARY  
 *   Validates that the input is a **syntactically correct absolute URL** whose
 *   scheme is strictly limited to:
 *
 *     - `file:`  — local filesystem references  
 *     - `http:`  — plaintext HTTP  
 *     - `https:` — encrypted HTTPS  
 *
 *   This hybrid mode is required in systems that intentionally accept either
 *   local file references or remote network resources, such as:
 *
 *   - browser extensions  
 *   - Electron-based desktop apps  
 *   - PDF/image processing pipelines  
 *   - static site generators  
 *   - hybrid ingestion systems  
 *   - sandboxed cloud functions reading local artifacts  
 *
 * PURPOSE  
 *   Enforces a secure and predictable set of permitted URL protocols in
 *   environments where both local and remote resources must be supported but
 *   *all other protocols must be rejected* (ftp, data, blob, ws, irc, mailto,
 *   javascript, etc.).
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any WHATWG-parseable absolute URL where:
 *       ```
 *       url.protocol === "file:" ||
 *       url.protocol === "http:" ||
 *       url.protocol === "https:"
 *       ```
 *
 *   - Allowed structures include:
 *       - file:///absolute/path  
 *       - file://host/share/path  
 *       - http://example.com  
 *       - https://cdn.example.com/assets/app.js  
 *
 *   REJECTS:
 *   - all other schemes (`data:`, `blob:`, `ftp:`, `ws:`, `mailto:`, etc.)
 *   - relative URLs  
 *   - malformed URLs  
 *   - empty or whitespace-only strings  
 *   - non-string inputs  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original URL string, unchanged**.  
 *   Does NOT normalize slashes, decode characters, or rewrite anything.  
 *
 * VALIDATION LOGIC  
 *   - Attempt WHATWG URL parsing  
 *   - Accept only 3 schemes:
 *       ```
 *       file:
 *       http:
 *       https:
 *       ```
 *   - For `file:` URLs:
 *       - MUST have non-empty pathname  
 *   - For `http:` / `https:`:
 *       - host must be present  
 *
 * SEMANTIC NOTES  
 *   This schema is safety-critical in:
 *   - sandboxed environments  
 *   - user-supplied resource loading  
 *   - internal preview/renderer pipelines  
 *   - zero-trust asset import systems  
 *
 *   It prevents protocol-based attacks such as:
 *   - `javascript:` injection  
 *   - `data:` payload attacks  
 *   - `ftp:` SSRF vectors  
 *   - `blob:` bypasses  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "file:///usr/local/bin/app"
 *   "file://localhost/C:/Users/Cole/Desktop"
 *   "http://example.com"
 *   "https://cdn.example.com/app.js"
 *
 *   // Invalid
 *   "ftp://example.com/file"
 *   "blob:https://example.com/uuid"
 *   "data:text/html,<script>xss</script>"
 *   "/relative/path"
 *   "example.com"
 *   ""
 *   ```
 */
export const urlFileHttpHybrid = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            // Accept only file, http, https
            if (
                u.protocol !== "file:" &&
                u.protocol !== "http:" &&
                u.protocol !== "https:"
            ) {
                return false;
            }

            // Additional rules per protocol:
            if (u.protocol === "file:") {
                if (!u.pathname || u.pathname.trim() === "") return false;
                return true;
            }

            if (u.protocol === "http:" || u.protocol === "https:") {
                // hostname MUST be present for network URLs
                if (!u.hostname) return false;
                return true;
            }

            return false;
        } catch {
            return false;
        }
    },
    "Expected a file://, http://, or https:// URL."
);

/**
* OUTPUT TYPE — HYBRID FILE/HTTP URL
*
* SUMMARY  
*   Represents a validated URL that belongs to exactly one of the following
*   permitted schemes:
*
*     - `file:`   (local filesystem resource)  
*     - `http:`   (insecure remote resource)  
*     - `https:`  (secure remote resource)  
*
* PURPOSE  
*   This type is foundational for applications that need to safely handle
*   user-provided paths which may reference local OR remote resources:
*
*   - hybrid renderers  
*   - CLI + browser dual-mode applications  
*   - file import systems  
*   - sandboxed Worker pipelines  
*   - typed configuration files  
*
* CONTRACT GUARANTEES  
*   - Always a WHATWG-parseable absolute URL  
*   - Always string output  
*   - Always one of: file/http/https  
*   - Never any other protocol  
*
* SEMANTIC NOTES  
*   This type is intentionally restrictive to prevent protocol-based attack
*   surfaces while still allowing hybrid processing flows.
*
* EXAMPLE  
*   ```
*   const ref: UrlFileHttpHybrid =
*       parse(urlFileHttpHybrid, "file:///home/cole/project/config.json");
*
*   const cdnRef: UrlFileHttpHybrid =
*       parse(urlFileHttpHybrid, "https://cdn.example.com/bundle.js");
*   ```
*/
export type UrlFileHttpHybrid = v.InferOutput<typeof urlFileHttpHybrid>;

/**
 * SAFE REDIRECT URL SCHEMA
 *
 * SUMMARY  
 *   Validates that the input is a **safe, absolute redirect URL** suitable for
 *   redirect flows, OAuth callbacks, login transitions, and any security-
 *   sensitive navigation. Protects against open-redirect, protocol abuse,
 *   unicode spoofing, and hostname-based phishing.
 *
 *   Safe URLs MUST:
 *     - use only `https:` OR `http:` (configurable but HTTPS recommended)
 *     - contain a valid hostname
 *     - contain no embedded credentials
 *     - contain no dangerous schemes (`javascript:`, `data:`, `blob:`)
 *     - contain no control characters
 *     - be fully WHATWG-parseable
 *
 * PURPOSE  
 *   This schema enforces safe redirect behavior in:
 *   - OAuth2 / OIDC callback validation  
 *   - magic-link authentication  
 *   - password-reset flows  
 *   - dashboard redirect-after-login  
 *   - security-hardened gateway systems  
 *   - multi-tenant redirect validation  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute URLs using:
 *       - `https:` (recommended)
 *       - `http:`  (allowed but not secure)
 *   - valid hostnames  
 *   - optional path, query, fragment  
 *
 *   REJECTS:
 *   - non-HTTP schemes (`ftp:`, `file:`, `data:`, `blob:`, `ws:`, `javascript:`)
 *   - missing hostname  
 *   - embedded credentials (`user@host`)  
 *   - control characters  
 *   - whitespace-only input  
 *   - malformed URLs  
 *   - non-strings  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original URL string**, unmodified.  
 *
 * VALIDATION LOGIC  
 *   - `typeof value === "string"`  
 *   - Must parse via WHATWG `new URL()`  
 *   - Must satisfy:
 *       ```
 *       url.protocol === "https:" || url.protocol === "http:"
 *       url.hostname !== ""
 *       url.username === ""
 *       url.password === ""
 *       ```
 *   - Must not contain dangerous characters:
 *       - control characters  
 *       - unassigned Unicode  
 *
 *   - Must not start with forbidden schemes:
 *       - javascript:  
 *       - vbscript:  
 *       - data:  
 *
 * SEMANTIC NOTES  
 *   This schema does NOT restrict hostnames — host allowlists/denylists can be
 *   layered separately.
 *
 *   It enforces only **protocol-level safety**, not business-logic safety.
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://example.com"
 *   "https://example.com/dashboard?from=login"
 *   "http://localhost:3000/redirect"
 *
 *   // Invalid
 *   "javascript:alert(1)"
 *   "data:text/html,<script>alert(1)</script>"
 *   "ftp://example.com"
 *   "https://user:pw@example.com"
 *   "https://"
 *   ""
 *   ```
 */
export const urlSafeRedirect = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        // Reject javascript:, data:, blob:, vbscript:, etc.
        const lower = value.toLowerCase().trim();
        if (
            lower.startsWith("javascript:") ||
            lower.startsWith("vbscript:") ||
            lower.startsWith("data:") ||
            lower.startsWith("blob:")
        ) {
            return false;
        }

        try {
            const u = new URL(value);

            // Only http/https allowed
            if (u.protocol !== "https:" && u.protocol !== "http:") return false;

            // Must have hostname
            if (!u.hostname) return false;

            // No embedded credentials
            if (u.username || u.password) return false;

            // Must not contain control characters
            if (/[\u0000-\u001F\u007F]/.test(value)) return false;

            return true;
        } catch {
            return false;
        }
    },
    "Expected a safe HTTP/HTTPS redirect URL."
);

/**
* OUTPUT TYPE — SAFE REDIRECT URL
*
* SUMMARY  
*   Represents a validated redirect URL that has passed all protocol-level
*   safety checks, ensuring that downstream systems cannot be exploited using
*   open redirects, credential injection, or malicious schemes.
*
* PURPOSE  
*   Required for:
*   - login flows with `redirect_to`  
*   - OAuth callback URLs  
*   - email magic-links  
*   - payment gateway return URLs  
*   - zero-trust auth transitions  
*
* CONTRACT GUARANTEES  
*   - Always a valid HTTP(S) URL  
*   - Always hostname-present  
*   - Always credential-free  
*   - Never uses forbidden schemes  
*
* SEMANTIC NOTES  
*   Does not restrict **which** domains are allowed — that belongs to a
*   host-allowlist layer. This type enforces **security fundamentals only**.
*
* EXAMPLE  
*   ```
*   const safe: UrlSafeRedirect =
*       parse(urlSafeRedirect, "https://app.example.com/dashboard");
*   ```
*/
export type UrlSafeRedirect = v.InferOutput<typeof urlSafeRedirect>;

/**
 * JSON RESOURCE URL SCHEMA (`*.json`)
 *
 * SUMMARY  
 *   Validates that the input is a **syntactically correct, absolute HTTP/HTTPS
 *   URL** which **MUST end with `.json`**. This ensures that URLs point to
 *   JSON-based resources such as API responses, configuration manifests,
 *   OpenAPI documents, metadata packages, or machine-readable schemas.
 *
 *   The URL may include:
 *     - protocol (`https:` strongly recommended)
 *     - hostname
 *     - port
 *     - full path (must end with `.json`)
 *     - optional query string
 *     - optional fragment
 *
 * PURPOSE  
 *   Enforces strict correctness for systems depending on JSON-based endpoints:
 *   - API discovery / self-describing services  
 *   - metadata loaders  
 *   - CDN-hosted config bundles  
 *   - app initialization payloads  
 *   - schema registries  
 *   - integration manifests  
 *
 *   Prevents accidental routing to:
 *   - HTML pages  
 *   - non-JSON assets  
 *   - binary files  
 *   - unsafe redirects  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute HTTP or HTTPS URLs
 *   - path **must** end with `.json` (case-insensitive)
 *   - query parameters allowed
 *   - fragment identifiers allowed (rare but permitted)
 *
 *   REJECTS:
 *   - non-http/https schemes  
 *   - missing hostname  
 *   - paths not ending in `.json`  
 *   - malformed URLs  
 *   - empty/whitespace strings  
 *   - non-string inputs  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original, unmodified URL string**.  
 *
 * VALIDATION LOGIC  
 *   - parse via WHATWG `URL`  
 *   - enforce:
 *       ```
 *       url.protocol === "http:" || url.protocol === "https:"
 *       url.hostname !== ""
 *       url.pathname.toLowerCase().endsWith(".json")
 *       ```
 *
 * SEMANTIC NOTES  
 *   This schema validates **structure**, not JSON content. Fetching and parsing
 *   the resource must be handled separately.
 *
 *   For stricter environments (e.g., zero-trust), host allowlisting should be
 *   layered on top of this schema.
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://example.com/config.json"
 *   "https://api.service.com/v1/schema.json?version=2"
 *   "http://localhost:3000/manifest.json#debug"
 *
 *   // Invalid
 *   "https://example.com/config"         // no .json suffix
 *   "https://example.com/file.JSONX"     // wrong extension
 *   "file:///etc/app.json"               // not http/https
 *   "data:application/json,{"            // wrong scheme
 *   "https://"                           // missing host/path
 *   ""
 *   ```
 */
export const urlJson = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            // Must be http or https
            if (u.protocol !== "http:" && u.protocol !== "https:") return false;

            // Must have hostname
            if (!u.hostname) return false;

            // Path MUST end with .json (case-insensitive)
            if (!u.pathname.toLowerCase().endsWith(".json")) return false;

            return true;
        } catch {
            return false;
        }
    },
    "Expected an absolute HTTP/HTTPS URL ending with .json."
);

/**
* OUTPUT TYPE — JSON RESOURCE URL
*
* SUMMARY  
*   Represents a validated JSON-resource URL that is guaranteed to:
*   - use HTTP or HTTPS
*   - be absolute
*   - end with `.json`
*
*   This strong invariant enables safe loading of structured metadata,
*   configuration payloads, and machine-readable API descriptors.
*
* PURPOSE  
*   Ideal for:
*   - app initialization  
*   - dynamic config loading  
*   - deployment metadata  
*   - schema auto-loading  
*   - client+server shared runtime assets  
*
* CONTRACT GUARANTEES  
*   - Always an absolute URL  
*   - Always HTTP/HTTPS  
*   - Always ends with `.json`  
*   - Always a string  
*
* SEMANTIC NOTES  
*   This type does **not** verify JSON contents — it only guarantees that the
*   referenced resource is structurally likely to be JSON based on its suffix.
*
* EXAMPLE  
*   ```
*   const manifest: UrlJson =
*       parse(urlJson, "https://cdn.example.com/v2/manifest.json");
*   ```
*/
export type UrlJson = v.InferOutput<typeof urlJson>;

/**
 * IMAGE URL SCHEMA (`*.png`, `*.jpg`, `*.jpeg`, `*.gif`, `*.webp`, etc.)
 *
 * SUMMARY  
 *   Validates that the input is a **syntactically valid absolute HTTP/HTTPS URL**
 *   whose pathname ends in a known safe image extension. This schema is intended
 *   for trusted rendering pipelines, asset resolution layers, metadata scrapers,
 *   and security-conscious image loading.
 *
 *   Supported extensions (case-insensitive):
 *     - .png  
 *     - .jpg  
 *     - .jpeg  
 *     - .gif  
 *     - .webp  
 *     - .avif  
 *     - .bmp  
 *     - .tiff  
 *     - .svg  (allowed but flagged as a vector format—safe if served correctly)
 *
 * PURPOSE  
 *   Provides strict guardrails ensuring that only **real image URLs** pass:
 *   - profile images  
 *   - marketing banners  
 *   - social preview images  
 *   - image CDN URLs  
 *   - OpenGraph `og:image`  
 *   - SSR and client-side image hydration  
 *
 *   Prevents:
 *   - HTML disguised as images  
 *   - file injection attacks  
 *   - browser XSS vectors via crafted URLs  
 *   - non-image assets routed into image components  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute HTTP/HTTPS URLs  
 *   - optional querystring  
 *   - optional fragment  
 *   - pathnames ending with one of the allowed image extensions  
 *
 *   REJECTS:
 *   - non-http/https schemes  
 *   - paths without an image extension  
 *   - tricky unicode filename attacks  
 *   - disguised non-image URLs  
 *   - empty/whitespace-only strings  
 *   - non-string inputs  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original URL string unchanged**.  
 *
 * VALIDATION LOGIC  
 *   - Parse via WHATWG `URL`  
 *   - Enforce:
 *       ```
 *       protocol is http: or https:
 *       hostname is not empty
 *       pathname matches /\.(png|jpg|jpeg|gif|webp|avif|bmp|tiff|svg)$/i
 *       ```
 *
 * SEMANTIC NOTES  
 *   - SVG is allowed because many systems legitimately use vector images, but
 *     developers should be aware of potential inline-SVG JS execution risks
 *     when served from untrusted sources.  
 *   - This schema is structural, not semantic — it does not fetch or validate
 *     image metadata.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://cdn.example.com/img/profile.png"
 *   "https://img.cdn.com/assets/hero.webp?version=3"
 *   "https://example.com/logo.svg#icon"
 *
 *   // Invalid
 *   "https://example.com/file.txt"
 *   "https://example.com/endpoint"
 *   "ftp://example.com/avatar.png"
 *   "javascript:alert(1)"
 *   ""
 *   ```
 */
export const urlImage = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            if (u.protocol !== "http:" && u.protocol !== "https:") return false;
            if (!u.hostname) return false;

            const ext = u.pathname.toLowerCase();

            if (
                !(
                    ext.endsWith(".png") ||
                    ext.endsWith(".jpg") ||
                    ext.endsWith(".jpeg") ||
                    ext.endsWith(".gif") ||
                    ext.endsWith(".webp") ||
                    ext.endsWith(".avif") ||
                    ext.endsWith(".bmp") ||
                    ext.endsWith(".tiff") ||
                    ext.endsWith(".svg")
                )
            ) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    },
    "Expected an absolute HTTP/HTTPS URL ending with a valid image extension."
);

/**
 * OUTPUT TYPE — IMAGE URL
 *
 * SUMMARY  
 *   Represents a validated image URL compliant with the `urlImage` schema.  
 *   Ensures strong invariants for image rendering, metadata extraction, and
 *   asset pipeline ingestion.
 *
 * PURPOSE  
 *   Enables reliable usage of validated image URLs in:
 *   - UI components  
 *   - SSR image rendering  
 *   - asset caching/CDN layers  
 *   - OpenGraph metadata  
 *   - marketing pipelines  
 *
 * CONTRACT GUARANTEES  
 *   - Always an HTTP/HTTPS absolute URL  
 *   - Always ends with a known image extension  
 *   - Always a string  
 *
 * SEMANTIC NOTES  
 *   Does not validate actual image bytes or MIME type — only structural
 *   correctness of the URL. Actual media validation must occur downstream.
 *
 * EXAMPLE  
 *   ```
 *   const avatar: UrlImage =
 *       parse(urlImage, "https://cdn.example.com/user/avatar.jpg");
 *   ```
 */
export type UrlImage = v.InferOutput<typeof urlImage>;

/**
 * SVG IMAGE URL SCHEMA (`*.svg`)
 *
 * SUMMARY  
 *   Validates that the input is a **strict, absolute HTTP/HTTPS URL** whose
 *   pathname ends *exactly* with `.svg` (case-insensitive). This schema is
 *   built specifically for SVG ingestion, which carries unique security risks
 *   compared to raster image formats.
 *
 *   This schema **does not inspect the SVG payload itself**, but strictly
 *   validates URL structure to ensure that only syntactically safe SVG URLs are
 *   accepted for downstream sanitization, proxying, or controlled rendering.
 *
 * PURPOSE  
 *   Required for secure handling of:
 *   - icon packs  
 *   - vector logos  
 *   - design-system components  
 *   - brand assets  
 *   - OpenGraph / social preview SVGs  
 *   - CDN-hosted SVGs  
 *   - UI image pipelines  
 *
 *   Protects against:
 *   - mis-labeled URLs  
 *   - non-SVG assets  
 *   - malicious scheme injection  
 *   - credential-in-URL exploits  
 *   - SSRF-enabled URL spoofing  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute HTTP/HTTPS URLs  
 *   - hostnames of any form  
 *   - optional query and fragment  
 *   - pathnames **ending with `.svg`**  
 *
 *   REJECTS:
 *   - non-http/https schemes  
 *   - missing hostnames  
 *   - credentials (`username:password@host`)  
 *   - paths not ending in `.svg`  
 *   - disguised SVGs (`.svgz`, `.svg.png`, `.svg/../evil`)  
 *   - empty/whitespace inputs  
 *   - non-strings  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original input string unchanged**, guaranteed to be a
 *   syntactically valid absolute SVG URL suitable for downstream sanitization.
 *
 * VALIDATION LOGIC  
 *   - Parse via WHATWG `URL`  
 *   - Enforce:
 *       ```
 *       protocol ∈ {"https:", "http:"}
 *       hostname exists
 *       credentials absent
 *       pathname endsWith(".svg") (case-insensitive)
 *       ```
 *
 * SEMANTIC NOTES  
 *   - This schema intentionally refuses `.svgz` (Gzip-compressed) because
 *     servers often misrepresent them as safe static images.  
 *   - Full SVG sanitization is **not** performed here — downstream sanitizers
 *     or proxy layers must remove inline JS, events, external references, etc.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://cdn.example.com/icons/arrow.svg"
 *   "https://assets.example.com/logo.svg?theme=dark"
 *   "http://localhost:3000/vector.svg#icon"
 *
 *   // Invalid
 *   "https://example.com/logo.svgz"
 *   "https://example.com/logo.svg.png"
 *   "data:image/svg+xml,<svg>...</svg>"
 *   "javascript:alert(1)"
 *   "https://user:pw@evil.com/icon.svg"
 *   ""
 *   ```
 */
export const urlSvg = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            // Must be http/https
            if (u.protocol !== "http:" && u.protocol !== "https:") return false;

            // Hostname required
            if (!u.hostname) return false;

            // Must not contain credentials
            if (u.username || u.password) return false;

            // Must end with .svg (case-insensitive)
            if (!u.pathname.toLowerCase().endsWith(".svg")) return false;

            return true;
        } catch {
            return false;
        }
    },
    "Expected an absolute HTTP/HTTPS URL ending with .svg."
);

/**
* OUTPUT TYPE — SVG URL
*
* SUMMARY  
*   Represents a validated SVG URL that has passed strict structural checks
*   under the `urlSvg` schema, guaranteeing SVG-specific invariants for secure
*   rendering and controlled ingestion.
*
* PURPOSE  
*   Intended for:
*   - vector assets in design systems  
*   - branding components  
*   - icon registries  
*   - SSR vector rendering  
*   - CDN image handling  
*
* CONTRACT GUARANTEES  
*   - Always HTTP or HTTPS  
*   - Always absolute  
*   - Always ends with `.svg`  
*   - Never contains credentials  
*
* SEMANTIC NOTES  
*   - The type does *not* guarantee the SVG payload is safe; it guarantees only
*     that the URL structurally references an `.svg` resource.  
*
* EXAMPLE  
*   ```
*   const icon: UrlSvg =
*       parse(urlSvg, "https://cdn.example.com/icons/check.svg");
*   ```
*/
export type UrlSvg = v.InferOutput<typeof urlSvg>;

/**
 * AUDIO URL SCHEMA (`*.mp3`, `*.wav`, `*.ogg`, `*.flac`, `*.aac`, `*.m4a`)
 *
 * SUMMARY  
 *   Validates that the input is a **strict, absolute, HTTP/HTTPS audio URL**
 *   whose pathname ends with a supported audio extension. This schema is built
 *   for secure, predictable ingestion of audio assets used in media pipelines,
 *   web applications, SSR contexts, transcription workflows, and CDN-backed
 *   audio delivery systems.
 *
 *   Supported extensions (case-insensitive):
 *     - .mp3  
 *     - .wav  
 *     - .ogg  
 *     - .flac  
 *     - .aac  
 *     - .m4a  
 *
 * PURPOSE  
 *   Ensures strong invariants for audio ingestion:
 *   - user-uploaded audio  
 *   - podcast episode URLs  
 *   - voice message URLs  
 *   - content libraries  
 *   - notification sounds  
 *   - machine-learning dataset ingestion  
 *   - secure audio streaming  
 *
 *   Protects against:
 *   - non-audio assets being passed into audio pipelines  
 *   - mis-labeled HTML or scripts posing as audio files  
 *   - exploitation via scheme spoofing (e.g., javascript:)  
 *   - SSRF vector URLs  
 *   - credential-in-URL injection  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute URLs with http/https protocol  
 *   - optional query parameters  
 *   - optional fragments  
 *   - pathnames ending with a known audio extension  
 *
 *   REJECTS:
 *   - data:, blob:, file:, javascript:, ftp:, ws:, wss:  
 *   - empty or whitespace-only inputs  
 *   - missing hostname  
 *   - username:password@host credentials  
 *   - disguised audio (`.mp3.html`, `.wav.png`, etc.)  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original URL string unchanged**, guaranteed to reference a
 *   structurally correct audio asset.
 *
 * VALIDATION LOGIC  
 *   - Parse via WHATWG `URL`  
 *   - Enforce:
 *       ```
 *       protocol ∈ {"http:", "https:"}
 *       hostname exists
 *       credentials absent
 *       pathname endsWith any of:
 *         .mp3 | .wav | .ogg | .flac | .aac | .m4a
 *       ```
 *
 * SEMANTIC NOTES  
 *   - This schema does **not** validate actual audio MIME type, duration,
 *     bitrate, or codec — downstream media layers must do that.  
 *   - This schema is safe for SSR, WebAudio, Workers, and CDN ingestion.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://cdn.example.com/audio/intro.mp3"
 *   "https://media.example.com/tracks/song.flac?quality=lossless"
 *   "http://localhost:3000/uploads/voice.m4a#v1"
 *
 *   // Invalid
 *   "https://example.com/file.mp3.html"      // disguised as mp3
 *   "data:audio/mp3;base64,AAA..."           // wrong scheme
 *   "https://user:pw@example.com/clip.wav"   // credentials blocked
 *   "ftp://example.com/sound.ogg"            // unsupported scheme
 *   ""
 *   ```
 */
export const urlAudio = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            // Must be http/https
            if (u.protocol !== "http:" && u.protocol !== "https:") return false;

            // Hostname required
            if (!u.hostname) return false;

            // Credentials forbidden
            if (u.username || u.password) return false;

            // Valid audio extensions
            const p = u.pathname.toLowerCase();
            if (
                !(
                    p.endsWith(".mp3") ||
                    p.endsWith(".wav") ||
                    p.endsWith(".ogg") ||
                    p.endsWith(".flac") ||
                    p.endsWith(".aac") ||
                    p.endsWith(".m4a")
                )
            ) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    },
    "Expected an absolute HTTP/HTTPS URL ending with a valid audio extension."
);

/**
* OUTPUT TYPE — AUDIO URL
*
* SUMMARY  
*   Represents the validated output of the `urlAudio` schema, ensuring that the
*   string refers to a syntactically correct HTTP/HTTPS audio file suitable for
*   secure downstream consumption.
*
* PURPOSE  
*   Ideal for:
*   - audio players  
*   - speech-to-text pipelines  
*   - podcast CMS ingestion  
*   - streaming services  
*   - voice memo and upload systems  
*   - dataset pre-processing  
*
* CONTRACT GUARANTEES  
*   - Always a valid HTTP/HTTPS URL  
*   - Always ends with a supported audio extension  
*   - Always a string  
*   - Never contains embedded credentials  
*
* SEMANTIC NOTES  
*   This type guarantees **structural correctness only**; true media safety
*   (codec validity, bitrate, duration) must be handled by media decoders or
*   proxy layers.
*
* EXAMPLE  
*   ```
*   const audio: UrlAudio =
*       parse(urlAudio, "https://cdn.example.com/tracks/theme.mp3");
*   ```
*/
export type UrlAudio = v.InferOutput<typeof urlAudio>;

/**
 * VIDEO URL SCHEMA (`*.mp4`, `*.webm`, `*.mov`, `*.mkv`, `*.avi`, `*.flv`, `*.m4v`)
 *
 * SUMMARY  
 *   Validates that the input is a **strict, absolute HTTP/HTTPS video URL** whose
 *   pathname ends with a recognized video extension. This schema ensures safe,
 *   predictable ingestion into media rendering pipelines, transcoding systems,
 *   browser `<video>` components, SSR environments, and CDN-backed streaming.
 *
 *   Supported extensions (case-insensitive):
 *     - .mp4  
 *     - .webm  
 *     - .mov  
 *     - .mkv  
 *     - .avi  
 *     - .flv  
 *     - .m4v  
 *
 * PURPOSE  
 *   Provides strong validation guarantees for:
 *   - streaming endpoints  
 *   - media CDN assets  
 *   - product video rendering  
 *   - user-generated content (UGC)  
 *   - ML dataset ingestion  
 *   - video transcoding queues  
 *   - demo/tutorial video pipelines  
 *
 *   Prevents:
 *   - non-video files in video pipelines  
 *   - disguised HTML/scripts as “videos”  
 *   - SSRF-style external URL abuse  
 *   - credential-in-URL attacks  
 *   - protocol mischief (javascript:, data:, blob:)  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute HTTP/HTTPS URLs  
 *   - pathnames ending with one of the listed video extensions  
 *   - optional query parameters  
 *   - optional fragment (`#t=30` etc.)  
 *
 *   REJECTS:
 *   - empty or whitespace inputs  
 *   - malformed URLs  
 *   - non-http/https protocols  
 *   - missing hostname  
 *   - embedded credentials (`user:pw@`)  
 *   - disguised video extensions (`.mp4.html`, `.webm.png`, etc.)  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original URL string unchanged**, guaranteed to reference a
 *   syntactically valid video resource.
 *
 * VALIDATION LOGIC  
 *   - Parse via WHATWG `URL`  
 *   - Enforce:
 *       ```
 *       protocol ∈ {"http:", "https:"}
 *       hostname exists
 *       username/password empty
 *       pathname endsWith:
 *         .mp4 | .webm | .mov | .mkv | .avi | .flv | .m4v
 *       ```
 *
 * SEMANTIC NOTES  
 *   - This schema validates **structure**, not codec/container-level semantics.  
 *   - It is safe for use in SSR, browser rendering, Workers, and proxy layers.  
 *   - Real transcoding or playback safety must inspect the bytes.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://cdn.example.com/videos/intro.mp4"
 *   "https://media.example.com/ads/spot.webm?quality=1080p"
 *   "http://localhost:3000/uploads/clip.mov#t=30"
 *
 *   // Invalid
 *   "https://example.com/movie.mp4.html"     // disguised
 *   "javascript:alert(1)"                    // unsafe
 *   "data:video/mp4;base64,AAA..."           // wrong protocol
 *   "https://user:pw@evil.com/video.mkv"     // credentials forbidden
 *   "ftp://example.com/video.mp4"            // unsupported scheme
 *   ""
 *   ```
 */
export const urlVideo = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            // Must be http/https
            if (u.protocol !== "http:" && u.protocol !== "https:") return false;

            // Hostname required
            if (!u.hostname) return false;

            // No embedded credentials
            if (u.username || u.password) return false;

            // Validate extension
            const p = u.pathname.toLowerCase();
            if (
                !(
                    p.endsWith(".mp4") ||
                    p.endsWith(".webm") ||
                    p.endsWith(".mov") ||
                    p.endsWith(".mkv") ||
                    p.endsWith(".avi") ||
                    p.endsWith(".flv") ||
                    p.endsWith(".m4v")
                )
            ) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    },
    "Expected an absolute HTTP/HTTPS URL ending with a valid video extension."
);

/**
* OUTPUT TYPE — VIDEO URL
*
* SUMMARY  
*   Represents the validated output of the `urlVideo` schema, ensuring the
*   referenced resource is structurally a valid HTTP/HTTPS video file URL.
*
* PURPOSE  
*   Ideal for:
*   - `<video>` components  
*   - server-side rendering  
*   - video ingestion/transcoding queues  
*   - ML dataset loaders  
*   - media CDN routers  
*   - product galleries  
*
* CONTRACT GUARANTEES  
*   - Always a valid HTTP/HTTPS absolute URL  
*   - Always ends with a supported video extension  
*   - Always a string  
*   - Never includes embedded credentials  
*
* SEMANTIC NOTES  
*   - This type guarantees URL-level correctness, not media integrity.  
*
* EXAMPLE  
*   ```
*   const clip: UrlVideo =
*       parse(urlVideo, "https://cdn.example.com/videos/demo.webm");
*   ```
*/
export type UrlVideo = v.InferOutput<typeof urlVideo>;

/**
 * FONT URL SCHEMA (`*.woff`, `*.woff2`, `*.ttf`, `*.otf`, `*.eot`)
 *
 * SUMMARY  
 *   Validates that the input is a **strict, absolute HTTP/HTTPS URL** whose
 *   pathname ends with a recognized, browser-safe font extension. This schema
 *   is intended for secure ingestion of web font assets used in design systems,
 *   SSR typography, CDN-backed asset pipelines, dynamic theme engines, and any
 *   system that requires predictable, safe, cross-platform font loading.
 *
 *   Supported extensions (case-insensitive):
 *     - .woff  
 *     - .woff2  
 *     - .ttf  
 *     - .otf  
 *     - .eot  
 *
 * PURPOSE  
 *   Enforces strict, safe handling of font URLs to prevent:
 *   - misuse of non-font files in font pipelines  
 *   - trick URLs returning HTML/JS instead of fonts  
 *   - scheme-based attacks (`javascript:`, `data:`)  
 *   - credential-in-URL vulnerabilities  
 *   - SSRF-adjacent URL spoofing  
 *
 *   Required for:
 *   - design tokens + design systems  
 *   - universal rendering (SSR)  
 *   - multi-tenant font overrides  
 *   - theming engines  
 *   - CDN-backed font delivery  
 *   - icon-font ingestion  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute HTTP/HTTPS URLs  
 *   - optional query strings  
 *   - optional fragment identifiers  
 *   - pathnames ending in a supported font extension  
 *
 *   REJECTS:
 *   - non-string inputs  
 *   - empty or whitespace-only values  
 *   - non-HTTP(S) schemes  
 *   - missing hostnames  
 *   - embedded credentials (`user:pw@`)  
 *   - disguised font extensions (`.woff.html`, `.ttf.php`)  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original URL string unchanged**, guaranteed to refer to a
 *   structurally valid web-font resource.
 *
 * VALIDATION LOGIC  
 *   - Parsed using the Web WHATWG `URL` API  
 *   - Enforces:
 *       ```
 *       protocol ∈ {"http:", "https:"}
 *       hostname exists
 *       username/password blank
 *       pathname endsWith:
 *         .woff | .woff2 | .ttf | .otf | .eot
 *       ```
 *
 * SEMANTIC NOTES  
 *   - Does *not* validate MIME type, glyph integrity, or font metadata — only
 *     structural correctness of the URL.  
 *   - Safe for Workers, Deno, Bun, Node, browsers, SSR frameworks, and CF CDN.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://cdn.example.com/fonts/Inter-Regular.woff2"
 *   "https://assets.example.com/theme/font.ttf?cache=345"
 *   "http://localhost:3000/dev/font.otf#v1"
 *
 *   // Invalid
 *   "https://example.com/font.woff.html"       // disguised extension
 *   "javascript:alert(1)"                      // unsafe scheme
 *   "data:font/woff;base64,AAA..."             // invalid for URL schema
 *   "https://user:pw@evil.com/MyFont.ttf"      // credential injection
 *   "ftp://example.com/font.woff"              // unsupported scheme
 *   ""
 *   ```
 */
export const urlFont = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            // Must be http/https
            if (u.protocol !== "http:" && u.protocol !== "https:") return false;

            // Hostname required
            if (!u.hostname) return false;

            // Credentials forbidden
            if (u.username || u.password) return false;

            // Validate extension
            const p = u.pathname.toLowerCase();
            if (
                !(
                    p.endsWith(".woff") ||
                    p.endsWith(".woff2") ||
                    p.endsWith(".ttf") ||
                    p.endsWith(".otf") ||
                    p.endsWith(".eot")
                )
            ) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    },
    "Expected an absolute HTTP/HTTPS URL ending with a valid font extension."
);

/**
* OUTPUT TYPE — FONT URL
*
* SUMMARY  
*   Represents a syntactically valid, extension-verified font URL that has been
*   fully validated by the `urlFont` schema. Guarantees that the referenced
*   resource is structurally a web-font suitable for ingestion into rendering,
*   design, and asset pipelines.
*
* PURPOSE  
*   Used for:
*   - web font loading  
*   - dynamic theming  
*   - design token engines  
*   - SSR typography  
*   - cross-platform asset builders  
*   - CDN font routing  
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always HTTP/HTTPS  
*   - Always absolute  
*   - Always ends with a supported font extension  
*   - Never contains URL credentials  
*
* SEMANTIC NOTES  
*   The type enforces structural validity only. Font internals (glyph sets,
*   kerning tables, OpenType features) are validated downstream by renderers.
*
* EXAMPLE  
*   ```
*   const font: UrlFont =
*       parse(urlFont, "https://cdn.example.com/fonts/Inter-Medium.woff2");
*   ```
*/
export type UrlFont = v.InferOutput<typeof urlFont>;

/**
 * ARCHIVE URL SCHEMA (`*.zip`, `*.tar`, `*.tar.gz`, `*.tgz`, `*.tar.bz2`,
 *                     `*.tbz`, `*.rar`, `*.7z`)
 *
 * SUMMARY  
 *   Validates that the input is a **strict, absolute HTTP/HTTPS URL** whose
 *   pathname ends with a recognized archive extension. This schema is designed
 *   for secure ingestion of compressed packages used in software distribution,
 *   automated deployment, plugin installation, CI/CD pipelines, and
 *   multi-environment artifact delivery.
 *
 *   Supported extensions (case-insensitive):
 *     - .zip  
 *     - .tar  
 *     - .tar.gz  
 *     - .tgz  
 *     - .tar.bz2  
 *     - .tbz  
 *     - .rar  
 *     - .7z  
 *
 * PURPOSE  
 *   Prevents:
 *   - disguised HTML/scripts posing as archives  
 *   - malicious redirections into non-archive MIME types  
 *   - SSRF-mediated exploitation  
 *   - credential-in-URL attacks  
 *   - extension spoofing (e.g., `.zip.js`)  
 *
 *   Enables secure:
 *   - CI/CD artifact retrieval  
 *   - plugin/theme package downloads  
 *   - versioned release fetching  
 *   - software update delivery  
 *   - backup & restore workflows  
 *   - Worker/Bun deploy bundles  
 *   - air-gap installation pipelines  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute HTTP/HTTPS URLs  
 *   - optional query string  
 *   - optional hash fragments  
 *   - pathnames ending in any supported archive extension  
 *
 *   REJECTS:
 *   - empty / whitespace-only inputs  
 *   - malformed URLs  
 *   - non-http/https protocols  
 *   - username:password credential injection  
 *   - disguised extensions (".zip.html", ".tar.gz.php")  
 *   - unicode homoglyph attacks in extension suffix  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original URL string unchanged**, guaranteeing that the value
 *   structurally references a valid archive format.
 *
 * VALIDATION LOGIC  
 *   - Parse using WHATWG `URL`  
 *   - Enforce:
 *       ```
 *       protocol ∈ {"https:", "http:"}
 *       hostname non-empty
 *       username/password empty
 *       pathname endsWith any of:
 *         .zip
 *         .tar
 *         .tar.gz
 *         .tgz
 *         .tar.bz2
 *         .tbz
 *         .rar
 *         .7z
 *       ```
 *
 * SEMANTIC NOTES  
 *   - This schema validates **URL structure**, not archive contents, MIME type,
 *     compression layer integrity, or tamper evidence.  
 *   - Downstream systems must validate signatures, digests, or cryptographic
 *     proofs.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://cdn.example.com/releases/app-1.2.0.tar.gz"
 *   "https://downloads.example.com/builds/latest.zip"
 *   "http://localhost:3000/artifacts/bundle.tgz#v3"
 *
 *   // Invalid
 *   "https://example.com/app.zip.html"      // disguised
 *   "https://user:pw@evil.com/file.tar"     // credentials embedded
 *   "ftp://example.com/archive.tar.gz"      // unsupported scheme
 *   "javascript:alert(1)"                   // malicious scheme
 *   ""
 *   ```
 */
export const urlArchive = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            // Must be http/https
            if (u.protocol !== "http:" && u.protocol !== "https:") return false;

            // Hostname required
            if (!u.hostname) return false;

            // No credentials allowed
            if (u.username || u.password) return false;

            const p = u.pathname.toLowerCase();

            // Ordered to match longer suffixes first
            if (
                p.endsWith(".tar.gz") ||
                p.endsWith(".tar.bz2") ||
                p.endsWith(".tgz") ||
                p.endsWith(".tbz") ||
                p.endsWith(".zip") ||
                p.endsWith(".tar") ||
                p.endsWith(".rar") ||
                p.endsWith(".7z")
            ) {
                return true;
            }

            return false;
        } catch {
            return false;
        }
    },
    "Expected an absolute HTTP/HTTPS URL ending with a valid archive extension."
);

/**
* OUTPUT TYPE — ARCHIVE URL
*
* SUMMARY  
*   Represents a fully validated archive URL referencing a compressed package
*   such as `.zip`, `.tar.gz`, `.7z`, `.rar`, etc. The guarantees provided by
*   this type ensure that only safe, syntactically correct archive URLs enter
*   deployment, ingestion, or build workflows.
*
* PURPOSE  
*   Used in:
*   - automated build downloaders  
*   - CI/CD artifact fetchers  
*   - plugin installer systems  
*   - software distribution services  
*   - infrastructure bootstrap flows  
*   - versioned release consumers  
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always absolute  
*   - Always HTTP/HTTPS  
*   - Always ends with a supported archive extension  
*   - No credential fields  
*
* SEMANTIC NOTES  
*   This type asserts only URL-level validity. Real archive verification (hash,
*   signature, manifest integrity) must be enforced downstream.
*
* EXAMPLE  
*   ```
*   const artifact: UrlArchive =
*       parse(urlArchive, "https://cdn.example.com/app/release-2.1.0.zip");
*   ```
*/
export type UrlArchive = v.InferOutput<typeof urlArchive>;

/**
 * SCRIPT URL SCHEMA (`*.js`, `*.mjs`, `*.cjs`, `*.ts`)
 *
 * SUMMARY  
 *   Validates that the input is a **strict, absolute HTTP/HTTPS URL** whose
 *   pathname ends with a recognized JavaScript-family extension. This schema
 *   enforces strong structural guarantees for script ingestion, crucial in
 *   environments where supply-chain security and runtime integrity are
 *   mission-critical.
 *
 *   Supported extensions (case-insensitive):
 *     - .js     (classic scripts)
 *     - .mjs    (ECMAScript modules)
 *     - .cjs    (CommonJS modules)
 *     - .ts     (TypeScript — for *tooling-only* ingestion)
 *
 * PURPOSE  
 *   Protects script-loading systems from:
 *   - disguised HTML/JS payloads  
 *   - malicious redirects  
 *   - cross-site script injection  
 *   - credential smuggling  
 *   - invalid or unsafe scheme usage  
 *   - extension spoofing (`.js.html`, `.mjs.php`, etc.)  
 *
 *   Required in:
 *   - CDN-backed script delivery  
 *   - remote module federation  
 *   - Worker/Bun/Node import resolvers  
 *   - dynamic runtime loading  
 *   - plugin systems  
 *   - self-updating script engines  
 *   - browser `<script>` tags  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute HTTP/HTTPS URLs  
 *   - pathname MUST end with a supported script extension  
 *   - optional query parameters  
 *   - optional fragment  
 *
 *   REJECTS:
 *   - non-string inputs  
 *   - empty/whitespace-only strings  
 *   - non-http/https schemes  
 *   - missing hostnames  
 *   - embedded credentials (`user:pw@host`)  
 *   - disguised extensions  
 *   - unicode homoglyph attacks in extension position  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original URL string**, unchanged, guaranteed to reference a
 *   structurally valid script resource.
 *
 * VALIDATION LOGIC  
 *   - Parse via WHATWG `URL`  
 *   - Enforce:
 *       ```
 *       protocol ∈ {"http:", "https:"}
 *       hostname exists
 *       username/password empty
 *       pathname endsWith:
 *         .js | .mjs | .cjs | .ts
 *       ```
 *
 * SEMANTIC NOTES  
 *   - `.ts` is allowed **only** because modern toolchains fetch `.ts` files
 *     directly (e.g., Deno, Bun, or Cloudflare Workers bundling).  
 *   - This schema validates only URL structure — not executable content,
 *     MIME type, module semantics, or runtime safety.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://cdn.example.com/app/client.js"
 *   "https://modules.example.com/pkg/index.mjs?v=123"
 *   "http://localhost:3000/plugins/widget.ts"
 *   "https://assets.example.com/server/entry.cjs#v8"
 *
 *   // Invalid
 *   "https://example.com/script.js.html"   // disguised
 *   "javascript:alert(1)"                  // unsafe scheme
 *   "https://user:pw@example.com/a.js"     // credential injection
 *   "ftp://example.com/file.mjs"           // unsupported scheme
 *   ""
 *   ```
 */
export const urlScript = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            // Must be http/https
            if (u.protocol !== "http:" && u.protocol !== "https:") return false;

            // Must have hostname
            if (!u.hostname) return false;

            // No credentials allowed
            if (u.username || u.password) return false;

            // Extension validation
            const p = u.pathname.toLowerCase();
            if (
                !(
                    p.endsWith(".js") ||
                    p.endsWith(".mjs") ||
                    p.endsWith(".cjs") ||
                    p.endsWith(".ts")
                )
            ) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    },
    "Expected an absolute HTTP/HTTPS URL ending with a valid script extension."
);

/**
* OUTPUT TYPE — SCRIPT URL
*
* SUMMARY  
*   Represents a syntactically valid JavaScript-family URL validated through
*   the `urlScript` schema. Guarantees structural correctness for secure,
*   predictable ingestion into script-loading pipelines.
*
* PURPOSE  
*   Ideal for:
*   - browser `<script>` tags  
*   - dynamic import()  
*   - remote module federation  
*   - plugin architectures  
*   - toolchain-based loader graphs (Bun, Deno, Workers)  
*   - CDN script delivery  
*
* CONTRACT GUARANTEES  
*   - Always an absolute URL  
*   - Always HTTP/HTTPS  
*   - Always ends with `.js`, `.mjs`, `.cjs`, or `.ts`  
*   - Never contains embedded credentials  
*
* SEMANTIC NOTES  
*   Content-level safety (XSS, supply-chain hijacking, MIME correctness) must
*   be guaranteed by downstream systems such as CSP, signature validation,
*   subresource integrity (SRI), or sandboxing.
*
* EXAMPLE  
*   ```
*   const remoteScript: UrlScript =
*       parse(urlScript, "https://cdn.example.com/app/index.mjs");
*   ```
*/
export type UrlScript = v.InferOutput<typeof urlScript>;

/**
 * STYLESHEET URL SCHEMA (`*.css`)
 *
 * SUMMARY  
 *   Validates that the input is a **strict, absolute HTTP/HTTPS URL** whose
 *   pathname ends with `.css` (case-insensitive). This schema is essential for
 *   secure stylesheet ingestion, preventing HTML/script masquerading, protocol
 *   spoofing, credential injection, and extension-level ambiguity.
 *
 * PURPOSE  
 *   Enforces strong invariants for:
 *   - `<link rel="stylesheet">` assets  
 *   - design system CSS bundles  
 *   - CDN-hosted theme files  
 *   - dynamic theme switching  
 *   - SSR stylesheet injection  
 *   - multi-tenant brand theming systems  
 *   - remote theme plugin ecosystems  
 *
 *   Prevents:
 *   - `.css`-spoofed HTML  
 *   - malicious redirect-based injection  
 *   - credential-in-URL attacks  
 *   - unsafe protocols (`javascript:`, `data:`)  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute `http` or `https` URLs  
 *   - optional query parameters (`?v=123`)  
 *   - optional fragments (`#theme`)  
 *   - pathname MUST end with `.css`  
 *
 *   REJECTS:
 *   - empty/whitespace inputs  
 *   - malformed URLs  
 *   - missing hostnames  
 *   - embedded credentials (`user:pass@`)  
 *   - disguised `.css` (`.css.js`, `.css.html`, `.css.php`)  
 *   - unsafe schemes (ftp:, data:, file:, javascript:)  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original string**, unchanged, guaranteed to be a structurally
 *   valid stylesheet URL.
 *
 * VALIDATION LOGIC  
 *   - Parsed using WHATWG `URL`  
 *   - Enforce:
 *       ```
 *       url.protocol ∈ {"http:", "https:"}
 *       url.hostname exists
 *       url.username/password empty
 *       url.pathname.toLowerCase().endsWith(".css")
 *       ```
 *
 * SEMANTIC NOTES  
 *   - This schema validates only the URL structure, **not** the CSS content,
 *     MIME type, CORS headers, or browser compatibility.  
 *   - Downstream systems must enforce CSP, integrity checks (SRI), or sandboxed
 *     fetch boundaries when loading external stylesheets.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://cdn.example.com/styles/app.css"
 *   "https://theme.example.com/dark.css?v=12"
 *   "http://localhost:3000/custom/theme.css#v2"
 *
 *   // Invalid
 *   "https://example.com/style.css.html"     // disguised
 *   "data:text/css,body{display:none}"        // unsafe scheme
 *   "https://user:pw@evil.com/theme.css"      // credentials forbidden
 *   "ftp://example.com/theme.css"             // unsupported scheme
 *   ""
 *   ```
 */
export const urlStylesheet = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            // Only http/https allowed
            if (u.protocol !== "http:" && u.protocol !== "https:") return false;

            // Hostname required
            if (!u.hostname) return false;

            // No credentials allowed
            if (u.username || u.password) return false;

            // Must end with .css
            if (!u.pathname.toLowerCase().endsWith(".css")) return false;

            return true;
        } catch {
            return false;
        }
    },
    "Expected an absolute HTTP/HTTPS URL ending with .css."
);

/**
* OUTPUT TYPE — STYLESHEET URL
*
* SUMMARY  
*   Represents a validated stylesheet URL conforming to the strict invariants
*   of `urlStylesheet`. Guarantees that the referenced resource is compatible
*   with `<link rel="stylesheet">` and safe for theme/CDN ingestion.
*
* PURPOSE  
*   Used in:
*   - design systems  
*   - global theme engines  
*   - remote stylesheet plugins  
*   - SSR hydration pipelines  
*   - external CDN asset referencing  
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always HTTP/HTTPS  
*   - Always absolute  
*   - Always ends with `.css`  
*   - Never contains username/password credentials  
*
* SEMANTIC NOTES  
*   This type does not assert MIME correctness; browsers and CDN headers must
*   enforce real CSS delivery (text/css) and prevent script masquerading.  
*
* EXAMPLE  
*   ```
*   const css: UrlStylesheet =
*       parse(urlStylesheet, "https://cdn.example.com/styles/base.css");
*   ```
*/
export type UrlStylesheet = v.InferOutput<typeof urlStylesheet>;

/**
 * SOURCE MAP URL SCHEMA (`*.js.map`, `*.mjs.map`, `*.cjs.map`, `*.css.map`)
 *
 * SUMMARY  
 *   Validates that the input is a **strict, absolute HTTP/HTTPS URL** whose
 *   pathname ends with a recognized source map extension. Source maps expose
 *   internal code structure, symbol names, and sensitive metadata — therefore,
 *   strict validation and controlled ingestion are critical for secure
 *   deployments.
 *
 *   Supported extensions (case-insensitive):
 *     - .js.map  
 *     - .mjs.map  
 *     - .cjs.map  
 *     - .css.map  
 *
 * PURPOSE  
 *   Ensures that only **legitimate source map files** are referenced by:
 *   - error tracking platforms (Sentry, Datadog, etc.)  
 *   - build/debug pipelines  
 *   - client-side debugging tools  
 *   - SSR runtime error resolvers  
 *   - Workers/Bun/Node stacktrace mappers  
 *   - artifact uploaders  
 *   - production sourcemap distribution  
 *
 *   Prevents:
 *   - disguised HTML, JS, or files posing as `.map`  
 *   - credential-injection in script URLs  
 *   - SSRF-enabled artifact misdirection  
 *   - unsafe protocols (`javascript:`, `data:`)  
 *   - accidental upload of incorrect artifacts  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute `http` or `https` URLs  
 *   - optional query parameters  
 *   - optional fragment identifiers  
 *   - pathnames ending in one of the supported `.map` extensions  
 *
 *   REJECTS:
 *   - empty or whitespace strings  
 *   - malformed URLs  
 *   - non-HTTP(S) protocols  
 *   - missing hostnames  
 *   - embedded credentials (`user:pw@host`)  
 *   - disguised `.map` files (`.js.map.php`)  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original URL string**, unchanged, guaranteed to reference a
 *   structurally valid sourcemap path.
 *
 * VALIDATION LOGIC  
 *   - Parse using WHATWG `URL`  
 *   - Enforce:
 *       ```
 *       url.protocol ∈ {"https:", "http:"}
 *       url.hostname non-empty
 *       url.username/password empty
 *       url.pathname endsWith(
 *         .js.map     |
 *         .mjs.map    |
 *         .cjs.map    |
 *         .css.map
 *       )
 *       ```
 *
 * SEMANTIC NOTES  
 *   - This schema ensures structure only; it does **not** guarantee the map
 *     file matches the actual bundle.  
 *   - Downstream systems must verify integrity using:
 *       - SRI  
 *       - signature/digest  
 *       - build manifest correlation  
 *       - toolchain metadata  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://cdn.example.com/build/app.js.map"
 *   "https://assets.example.com/ui/styles.css.map?v=17"
 *   "http://localhost:3000/debug/bundle.mjs.map"
 *
 *   // Invalid
 *   "https://example.com/app.js.map.html"     // disguised as .map
 *   "javascript:alert(1)"                     // unsafe scheme
 *   "https://user:pw@evil.com/app.cjs.map"    // credentials blocked
 *   "ftp://example.com/file.js.map"           // unsupported scheme
 *   ""
 *   ```
 */
export const urlSourceMap = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            // must be http/https
            if (u.protocol !== "http:" && u.protocol !== "https:") return false;

            // hostname required
            if (!u.hostname) return false;

            // no credentials
            if (u.username || u.password) return false;

            // validate extension
            const pn = u.pathname.toLowerCase();
            if (
                pn.endsWith(".js.map") ||
                pn.endsWith(".mjs.map") ||
                pn.endsWith(".cjs.map") ||
                pn.endsWith(".css.map")
            ) {
                return true;
            }

            return false;
        } catch {
            return false;
        }
    },
    "Expected an absolute HTTP/HTTPS URL ending with a valid source map extension."
);

/**
* OUTPUT TYPE — SOURCE MAP URL
*
* SUMMARY  
*   Represents the validated output of the `urlSourceMap` schema. Guarantees
*   that the URL refers to a structurally correct `.map` file used for
*   stacktrace symbolication, debugging, and build diagnostics.
*
* PURPOSE  
*   Used for:
*   - Sentry/Datadog/Rollbar sourcemap uploads  
*   - production symbolication  
*   - Worker/Bun/Node SSR stack mapping  
*   - debugging pipelines  
*   - safe artifact distribution  
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always absolute  
*   - Always HTTP/HTTPS  
*   - Always ends with `.js.map`, `.mjs.map`, `.cjs.map`, or `.css.map`  
*   - Never includes URL credentials  
*
* SEMANTIC NOTES  
*   Does **not** guarantee content validity — downstream systems must verify
*   that the sourcemap matches the actual build artifacts.
*
* EXAMPLE  
*   ```
*   const sm: UrlSourceMap =
*       parse(urlSourceMap, "https://cdn.example.com/build/app.js.map");
*   ```
*/
export type UrlSourceMap = v.InferOutput<typeof urlSourceMap>;

/**
 * MANIFEST URL SCHEMA (`manifest.json`, `site.webmanifest`,
 *                      `*.webmanifest`, `browserconfig.xml`,
 *                      `*.manifest`)
 *
 * SUMMARY  
 *   Validates that the input is a **strict, absolute HTTP/HTTPS URL** referencing
 *   a recognized web manifest file used by PWAs, browser metadata engines,
 *   theme installers, or structured configuration layers. Manifest files define
 *   critical application metadata and therefore require strict structural
 *   validation to prevent spoofing, misdelivery, or metadata hijacking.
 *
 *   Supported manifest patterns (case-insensitive):
 *     - manifest.json  
 *     - site.webmanifest  
 *     - *.webmanifest  
 *     - browserconfig.xml  
 *     - *.manifest (legacy HTML5 AppCache)  
 *
 * PURPOSE  
 *   Required for:
 *   - PWA bootstrapping  
 *   - add-to-homescreen flows  
 *   - theme & brand configuration  
 *   - browser metadata ingestion  
 *   - structured web app configuration  
 *   - runtime initialization manifests  
 *   - multi-tenant tenant-config URLs  
 *
 *   Prevents:
 *   - disguised non-manifest files  
 *   - redirection into malicious endpoints  
 *   - credential-in-URL leakage  
 *   - spoofed manifests used for phishing  
 *   - unsafe protocols  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute HTTP/HTTPS URLs  
 *   - optional query parameters  
 *   - optional fragments  
 *   - pathnames matching one of:
 *       - manifest.json  
 *       - site.webmanifest  
 *       - *.webmanifest  
 *       - browserconfig.xml  
 *       - *.manifest  
 *
 *   REJECTS:
 *   - empty strings  
 *   - malformed URLs  
 *   - missing hostnames  
 *   - embedded credentials (user:pass@)  
 *   - disguised manifests (`manifest.json.php`, etc.)  
 *   - unsupported schemes (javascript:, data:, ftp:, file:)  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original URL string**, unchanged, ensuring that the path
 *   structurally represents a valid manifest file.
 *
 * VALIDATION LOGIC  
 *   - Parse using WHATWG `URL`  
 *   - Enforce:
 *       ```
 *       protocol ∈ {"http:", "https:"}
 *       hostname non-empty
 *       username/password empty
 *
 *       pathname matches ANY:
 *         - endsWith("manifest.json")
 *         - endsWith(".webmanifest")
 *         - endsWith("site.webmanifest")
 *         - endsWith("browserconfig.xml")
 *         - endsWith(".manifest")
 *       ```
 *
 * SEMANTIC NOTES  
 *   - This schema only validates the **file naming structure**, not the manifest
 *     contents (JSON/XML validity, icon set correctness, theme colors, etc.).  
 *   - Downstream systems (PWA validators, CSP, app-config loaders) must verify
 *     integrity, MIME type, and PWA compliance.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://example.com/manifest.json"
 *   "https://cdn.example.com/app/site.webmanifest"
 *   "https://example.com/config/browserconfig.xml?v=5"
 *   "http://localhost:3000/legacy/app.manifest"
 *
 *   // Invalid
 *   "https://example.com/manifest.json.php"     // disguised
 *   "javascript:alert(1)"                       // unsafe scheme
 *   "https://user:pw@evil.com/site.webmanifest" // credentials disallowed
 *   "ftp://example.com/manifest.json"           // unsupported scheme
 *   ""
 *   ```
 */
export const urlManifest = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            // Must be http/https
            if (u.protocol !== "http:" && u.protocol !== "https:") return false;

            // Host required
            if (!u.hostname) return false;

            // Credentials forbidden
            if (u.username || u.password) return false;

            const p = u.pathname.toLowerCase();

            if (
                p.endsWith("manifest.json") ||
                p.endsWith("site.webmanifest") ||
                p.endsWith(".webmanifest") ||
                p.endsWith("browserconfig.xml") ||
                p.endsWith(".manifest")
            ) {
                return true;
            }

            return false;
        } catch {
            return false;
        }
    },
    "Expected a valid HTTP/HTTPS manifest URL (manifest.json, .webmanifest, browserconfig.xml, or .manifest)."
);

/**
* OUTPUT TYPE — MANIFEST URL
*
* SUMMARY  
*   Represents a validated URL referencing a recognized manifest file suitable
*   for PWA bootstrapping, browser configuration, application metadata, or
*   theme initialization.
*
* PURPOSE  
*   Used for:
*   - PWA installation flows  
*   - runtime bootstrap configuration  
*   - theme/brand manifests  
*   - browserconfig ingestion  
*   - metadata-driven UI boot  
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always absolute  
*   - Always HTTP/HTTPS  
*   - Always ends with a supported manifest pattern  
*   - Never includes credentials  
*
* SEMANTIC NOTES  
*   - This type guarantees **structural validity only**.  
*   - Manifest content correctness (JSON, XML validity) must be validated by
*     runtime systems.  
*
* EXAMPLE  
*   ```
*   const manifest: UrlManifest =
*       parse(urlManifest, "https://example.com/app/manifest.json");
*   ```
*/
export type UrlManifest = v.InferOutput<typeof urlManifest>;

/**
 * DOCUMENT URL SCHEMA (`*.pdf`, `*.docx`, `*.xlsx`, `*.pptx`, `*.rtf`,
 *                       `*.txt`, `*.csv`, `*.md`, `*.odt`, `*.ods`, `*.odp`,
 *                       `*.epub`)
 *
 * SUMMARY  
 *   Validates that the input is a **strict, absolute HTTP/HTTPS URL** referencing
 *   a recognized document-type file. Document URLs are commonly used in
 *   enterprise systems for reports, policy documents, legal filings, financial
 *   exports, user uploads, and machine-readable knowledge ingestion. Because
 *   documents can carry sensitive data and can be exploited via spoofed
 *   extensions or misdirected links, strict validation is essential.
 *
 *   Supported extensions (case-insensitive):
 *     - .pdf  
 *     - .doc, .docx  
 *     - .xls, .xlsx  
 *     - .ppt, .pptx  
 *     - .rtf  
 *     - .txt  
 *     - .csv  
 *     - .md  
 *     - .odt, .ods, .odp  
 *     - .epub  
 *
 * PURPOSE  
 *   Protects systems dealing with document ingestion:
 *   - document management systems (DMS)  
 *   - legal/financial upload portals  
 *   - report download endpoints  
 *   - knowledge-base ingestion  
 *   - data science pipelines (CSV, TXT)  
 *   - markdown-rendering portals  
 *   - export/download workflows  
 *
 *   Prevents:
 *   - disguised .pdf/.docx (.pdf.php, .pdf.html, etc.)  
 *   - SSRF URL tricks  
 *   - credentials-in-URL attacks  
 *   - non-document assets entering document pipelines  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute HTTP/HTTPS URLs  
 *   - optional query and fragments  
 *   - pathnames ending in a supported document extension  
 *
 *   REJECTS:
 *   - empty/whitespace-only strings  
 *   - unsupported schemes (javascript:, data:, ftp:, file:)  
 *   - missing hostnames  
 *   - embedded credentials (`user:pass@`)  
 *   - disguised extensions  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original, unmodified URL string**, guaranteed to reference a
 *   structurally correct document path.
 *
 * VALIDATION LOGIC  
 *   - Parsed using WHATWG `URL`  
 *   - Enforces:
 *       ```
 *       protocol is http: or https:
 *       hostname exists
 *       no username/password
 *       pathname endsWith any supported document extension
 *       ```
 *
 * SEMANTIC NOTES  
 *   - Structural correctness only — MIME type, encryption, embedded scripts,
 *     and document content validity must be checked downstream.  
 *   - Many document formats (e.g., PDF, DOCX) may embed active content; this
 *     schema does not guarantee content safety.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://cdn.example.com/docs/report.pdf"
 *   "https://example.com/uploads/file.docx?v=2"
 *   "http://localhost:3000/data/sample.csv"
 *   "https://example.com/ebooks/book.epub#page=3"
 *
 *   // Invalid
 *   "https://example.com/doc.pdf.html"       // disguised
 *   "javascript:alert(1)"                    // unsafe
 *   "https://user:pw@evil.com/report.pdf"    // credentials blocked
 *   "ftp://example.com/file.docx"            // unsupported scheme
 *   ""
 *   ```
 */
export const urlDocument = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            if (u.protocol !== "http:" && u.protocol !== "https:") return false;
            if (!u.hostname) return false;
            if (u.username || u.password) return false;

            const p = u.pathname.toLowerCase();

            if (
                p.endsWith(".pdf") ||
                p.endsWith(".doc") ||
                p.endsWith(".docx") ||
                p.endsWith(".xls") ||
                p.endsWith(".xlsx") ||
                p.endsWith(".ppt") ||
                p.endsWith(".pptx") ||
                p.endsWith(".rtf") ||
                p.endsWith(".txt") ||
                p.endsWith(".csv") ||
                p.endsWith(".md") ||
                p.endsWith(".odt") ||
                p.endsWith(".ods") ||
                p.endsWith(".odp") ||
                p.endsWith(".epub")
            ) {
                return true;
            }

            return false;
        } catch {
            return false;
        }
    },
    "Expected an absolute HTTP/HTTPS URL ending with a valid document extension."
);

/**
* OUTPUT TYPE — DOCUMENT URL
*
* SUMMARY  
*   Represents the validated output of the `urlDocument` schema. Guarantees
*   that the string refers to a structurally correct document URL suitable for
*   enterprise ingestion, rendering, or download workflows.
*
* PURPOSE  
*   Used in:
*   - document portals  
*   - legal/financial filings  
*   - data exports/imports  
*   - report generation systems  
*   - SSR document rendering  
*   - client downloads  
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always absolute  
*   - Always HTTP/HTTPS  
*   - Always ends with a supported document extension  
*   - Never includes credentials  
*
* SEMANTIC NOTES  
*   Content safety (malware, macros, active content) must be validated
*   separately by antivirus, sandboxing, or content scanners.
*
* EXAMPLE  
*   ```
*   const doc: UrlDocument =
*       parse(urlDocument, "https://cdn.example.com/docs/policy.pdf");
*   ```
*/
export type UrlDocument = v.InferOutput<typeof urlDocument>;

/**
 * MEDIA URL SCHEMA (Images, Audio, Video)
 *
 * SUMMARY  
 *   Validates that the input is a **strict, absolute HTTP/HTTPS URL** referencing
 *   a recognized media-asset file. This includes images, audio, video, and
 *   modern optimized formats. Media URLs are a critical component of UI/UX
 *   rendering, CDN asset distribution, content pipelines, and multimedia
 *   ingestion flows, and therefore require strict syntactic validation.
 *
 *   Supported extensions (case-insensitive):
 *
 *   IMAGES  
 *     - .png, .jpg, .jpeg, .gif, .svg, .webp, .avif, .apng  
 *     - .heic, .heif  
 *
 *   AUDIO  
 *     - .mp3, .wav, .ogg, .aac, .m4a, .flac  
 *
 *   VIDEO  
 *     - .mp4, .webm, .mov, .mkv, .avi, .m4v, .gifv  
 *
 * PURPOSE  
 *   Ensures URLs feeding into:
 *   - image render pipelines  
 *   - CDN asset endpoints  
 *   - media upload/ingestion  
 *   - transcoding/processing systems  
 *   - SSR media validation  
 *   - media streaming optimization  
 *   - metadata extractors (FFprobe, ImageMagick, EXIF readers)  
 *
 *   Prevents:
 *   - disguised executable payloads (`image.png.exe`)  
 *   - non-media files entering media engines  
 *   - unsafe protocols  
 *   - credential-in-URL attack vectors  
 *   - invalid/malformed URLs  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute HTTP/HTTPS URLs  
 *   - optional query parameters  
 *   - optional fragments  
 *   - pathnames ending in supported media extensions  
 *
 *   REJECTS:
 *   - malformed/bare strings  
 *   - missing hostnames  
 *   - disguised extensions  
 *   - ftp:, file:, javascript:, data:  
 *   - URLs containing username/password  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original URL string**, guaranteed to be a valid media URL.
 *
 * VALIDATION LOGIC  
 *   ```
 *   protocol ∈ {"http:", "https:"}
 *   hostname non-empty
 *   username/password empty
 *   pathname ∈ {imageExt, audioExt, videoExt}
 *   ```
 *
 * SEMANTIC NOTES  
 *   - Checks structural correctness only; does NOT validate MIME type.  
 *   - Media pipelines must verify:
 *       - real content type  
 *       - codec safety  
 *       - transcoding compatibility  
 *       - EXIF sanitation  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://cdn.example.com/img/banner.webp"
 *   "https://media.example.com/video/movie.mp4?v=3"
 *   "https://assets.example.com/audio/song.flac"
 *
 *   // Invalid
 *   "https://example.com/image.png.exe"
 *   "javascript:alert(1)"
 *   "ftp://assets.example.com/file.png"
 *   "https://user:pw@evil.com/img.jpg"
 *   ""
 *   ```
 */
export const urlMedia = v.custom(
    (value) => {
        if (typeof value !== "string" || value.trim() === "") return false;

        try {
            const u = new URL(value);

            if (u.protocol !== "http:" && u.protocol !== "https:") return false;
            if (!u.hostname) return false;
            if (u.username || u.password) return false;

            const p = u.pathname.toLowerCase();

            // Image
            const isImage =
                p.endsWith(".png") ||
                p.endsWith(".jpg") ||
                p.endsWith(".jpeg") ||
                p.endsWith(".gif") ||
                p.endsWith(".svg") ||
                p.endsWith(".webp") ||
                p.endsWith(".avif") ||
                p.endsWith(".apng") ||
                p.endsEndsWith(".heic") ||
                p.endsWith(".heif");

            // Audio
            const isAudio =
                p.endsWith(".mp3") ||
                p.endsWith(".wav") ||
                p.endsWith(".ogg") ||
                p.endsWith(".aac") ||
                p.endsWith(".m4a") ||
                p.endsWith(".flac");

            // Video
            const isVideo =
                p.endsWith(".mp4") ||
                p.endsWith(".webm") ||
                p.endsWith(".mov") ||
                p.endsWith(".mkv") ||
                p.endsWith(".avi") ||
                p.endsWith(".m4v") ||
                p.endsWith(".gifv");

            return isImage || isAudio || isVideo;
        } catch {
            return false;
        }
    },
    "Expected a valid HTTP/HTTPS media URL (image, audio, or video)."
);

/**
* OUTPUT TYPE — MEDIA URL
*
* SUMMARY  
*   Represents a syntactically valid HTTP/HTTPS URL referencing a supported
*   media asset (image, audio, video). Guarantees structural compliance for use
*   in media pipelines, CDNs, asset loaders, and UI renderers.
*
* PURPOSE  
*   Required for:
*   - image rendering  
*   - SSR hydration  
*   - CDN asset loading  
*   - video/audio playback  
*   - media ingestion systems  
*   - transcoding workflows  
*   - thumbnails & previews  
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always absolute  
*   - Always HTTP/HTTPS  
*   - Always ends with a recognized media extension  
*   - Never includes credentials  
*
* SEMANTIC NOTES  
*   - This schema does NOT guarantee that the file actually exists or matches
*     its extension. Downstream MIME detection is required.  
*
* EXAMPLE  
*   ```
*   const img: UrlMedia =
*       parse(urlMedia, "https://cdn.example.com/img/photo.avif");
*   ```
*/
export type UrlMedia = v.InferOutput<typeof urlMedia>;

/**
 * URL PATH SCHEMA
 *
 * SUMMARY  
 *   Validates that the input is a **strict RFC 3986 URL pathname**, without any
 *   protocol, hostname, search parameters, fragments, credentials, or authority
 *   components. A path must represent ONLY the hierarchical part of a URL:
 *
 *       "/"
 *       "/users"
 *       "/users/123"
 *       "/api/v1/items"
 *
 * PURPOSE  
 *   Critical for systems performing:
 *   - internal routing
 *   - SSR path validation
 *   - API endpoint registration
 *   - CDN key generation
 *   - server-side link normalization
 *   - access-control path allowlists
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - strings starting with `/`
 *   - containing only valid path characters:
 *       A–Z a–z 0–9 -._~ ! $ & ' ( ) * + , ; = : @ /
 *   - optional trailing slash
 *
 *   REJECTS:
 *   - empty strings
 *   - paths not beginning with `/`
 *   - any inclusion of:
 *       - protocol (`http:`)
 *       - hostnames (`example.com`)
 *       - ports (`:3000`)
 *       - search (`?a=1`)
 *       - fragments (`#x`)
 *       - credentials (`user:pass@`)
 *
 * OUTPUT CONTRACT  
 *   Returns the **same path string**, unchanged.
 *
 * SEMANTIC NOTES  
 *   This schema ensures **path-only semantics**. It does not allow relative
 *   references (`./a`, `../b`), full URLs, or query/fragment components.
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "/"
 *   "/users"
 *   "/api/v1/items"
 *
 *   // Invalid
 *   "users"
 *   "http://x.com"
 *   "/a/b?c=1"
 *   "/a/b#x"
 *   ```
 */
export const urlPath = v.custom(
    (value) => {
        if (typeof value !== "string") return false;
        if (!value.startsWith("/")) return false;

        // Reject full URL structure
        if (value.includes("://")) return false;
        if (value.includes("?")) return false;
        if (value.includes("#")) return false;
        if (value.includes("@")) return false;

        // RFC 3986 path validity
        const PATH_PATTERN = /^\/[A-Za-z0-9\-._~!$&'()*+,;=:@/]*$/;
        return PATH_PATTERN.test(value);
    },
    "Expected a valid RFC 3986 URL pathname beginning with '/'."
);

/**
* OUTPUT TYPE — URL PATH
*
* SUMMARY  
*   Represents a syntactically valid RFC-compliant pathname string suitable for
*   internal routing, SSR frameworks, CDN cache keys, REST endpoint mapping,
*   and ACL rule evaluation.
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always begins with `/`  
*   - Never includes protocol, hostname, query, or fragment  
*   - RFC 3986 path-character safe  
*
* EXAMPLE  
*   ```
*   const p: UrlPath = parse(urlPath, "/api/v1/items");
*   ```
*/
export type UrlPath = v.InferOutput<typeof urlPath>;

/**
 * URL QUERY STRING SCHEMA
 *
 * SUMMARY  
 *   Validates an RFC-compliant URL query string. This schema is purely for the
 *   **search/query component** of a URL, with optional leading `?`.
 *
 *       "?a=1&b=2"
 *       "a=1"
 *
 * PURPOSE  
 *   Used for:
 *   - analytics collection
 *   - canonicalization
 *   - URL builders
 *   - SSR routing
 *   - validation of client-sent query maps
 *   - HMAC-signed URLs
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - strings matching `key=value` pairs  
 *   - multiple pairs joined by `&`  
 *   - percent-encoded values  
 *   - optional leading `?`  
 *
 *   REJECTS:
 *   - whitespace-only  
 *   - invalid percent encoding  
 *   - fragments (`#...`)  
 *   - paths (`/users`)  
 *   - full URLs  
 *
 * OUTPUT CONTRACT  
 *   Returns the **normalized query string without leading '?'**.
 *
 * SEMANTIC NOTES  
 *   - Returned value is **just the query**, not the full URL.  
 *   - This schema does not convert pairs into objects—that comes later.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "?a=1&b=2"
 *   "a=1"
 *
 *   // Invalid
 *   "?a=1#x"
 *   "/users"
 *   "http://example.com?a=1"
 *   ```
 */
export const urlQuery = v.custom(
    (value) => {
        if (typeof value !== "string") return false;

        let q = value.startsWith("?") ? value.slice(1) : value;
        if (q === "") return true;

        if (q.includes("#")) return false;

        try {
            new URLSearchParams(q);
            return true;
        } catch {
            return false;
        }
    },
    "Expected a valid URL query string."
);

/**
* OUTPUT TYPE — URL QUERY STRING
*
* SUMMARY  
*   Represents a syntactically valid, normalized query string extracted from
*   the search portion of a URL.
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Never includes leading '?'  
*   - Never includes a fragment  
*
* EXAMPLE  
*   ```
*   const q: UrlQuery = parse(urlQuery, "?a=1&b=2");
*   // q === "a=1&b=2"
*   ```
*/
export type UrlQuery = v.InferOutput<typeof urlQuery>;

/**
 * URL FRAGMENT SCHEMA
 *
 * SUMMARY  
 *   Validates a **URL fragment identifier**, optionally prefixed with '#'.
 *
 * PURPOSE  
 *   Used for:
 *   - SPA hash routing  
 *   - documentation anchors  
 *   - deep-link anchors  
 *   - markdown header linking  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - strings like "#section1", "section1", "part-3", "a/b/c"  
 *
 *   REJECTS:
 *   - embedded '?'  
 *   - full URLs  
 *   - whitespace-only  
 *
 * OUTPUT CONTRACT  
 *   Returns the **fragment without leading '#'**.
 *
 * EXAMPLES  
 *   ```
 *   "#intro"
 *   "step-2"
 *   ```
 */
export const urlFragment = v.custom(
    (value) => {
        if (typeof value !== "string") return false;

        let f = value.startsWith("#") ? value.slice(1) : value;
        if (f.includes("?")) return false;
        if (f.includes("://")) return false;

        return /^[A-Za-z0-9\-._~!$&'()*+,;=:@/]*$/.test(f);
    },
    "Expected a valid URL fragment identifier."
);

/**
 * OUTPUT TYPE — URL FRAGMENT
 *
 * SUMMARY  
 *   Represents a valid, sanitized fragment identifier, without the leading '#'.
 *
 * CONTRACT GUARANTEES  
 *   - Always a string  
 *   - Contains only RFC 3986 fragment characters  
 *
 * EXAMPLE  
 *   ```
 *   const frag: UrlFragment = parse(urlFragment, "#part-1");
 *   ```
 */
export type UrlFragment = v.InferOutput<typeof urlFragment>;

/**
 * URL PROTOCOL SCHEMA
 *
 * SUMMARY  
 *   Validates a standalone URL protocol (scheme) per RFC 3986.
 *
 * PURPOSE  
 *   Required for:
 *   - URL sanitizers  
 *   - protocol allowlists  
 *   - CSP `upgrade-insecure-requests` rules  
 *   - SSR URL decomposition  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - "http:", "https:", "ws:", "wss:", "mailto:", "tel:", etc.
 *
 *   REJECTS:
 *   - missing ':'  
 *   - uppercase letters  
 *   - spaces  
 *   - invalid characters  
 *
 * OUTPUT CONTRACT  
 *   Returns the protocol string unchanged.
 *
 * EXAMPLES  
 *   ```
 *   "https:"
 *   "mailto:"
 *   ```
 */
export const urlProtocol = v.custom(
    (value) => {
        if (typeof value !== "string") return false;

        const PROTOCOL_PATTERN = /^[a-z][a-z0-9+\-.]*:$/;
        return PROTOCOL_PATTERN.test(value);
    },
    "Expected a valid RFC 3986 URL protocol."
);

/**
* OUTPUT TYPE — URL PROTOCOL
*
* SUMMARY  
*   A validated standalone URL scheme (protocol) per RFC 3986.
*
* CONTRACT  
*   - Always ends with ':'  
*   - Always lowercase  
*
* EXAMPLE  
*   ```
*   const p: UrlProtocol = parse(urlProtocol, "https:");
*   ```
*/
export type UrlProtocol = v.InferOutput<typeof urlProtocol>;

/**
 * HOSTNAME / HOST SCHEMA
 *
 * SUMMARY  
 *   Validates a **standalone RFC 3986-compliant host component**, which may be:
 *
 *   - A domain name (e.g., "example.com")
 *   - A multi-level subdomain ("a.b.c.example.co.uk")
 *   - A punycode IDN ("xn--bücher-kva.com" → "xn--bcher-kva.com")
 *   - An IPv4 address ("192.168.0.1")
 *   - An IPv6 address ("[2001:db8::1]")
 *
 *   This schema validates ONLY the **host** portion of a URL, not the authority,
 *   not the protocol, not the port, and not the path/query.
 *
 * PURPOSE  
 *   Required for:
 *   - CORS hostname allowlists  
 *   - CDN routing  
 *   - SSR host-based multi-tenancy  
 *   - CSP directives  
 *   - logging & analytics attribution  
 *   - reverse-proxy virtual hosts  
 *   - URL origin decomposition  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - valid domain names per RFC 1035 + RFC 5891  
 *   - punycode domains ("xn--")  
 *   - IPv4 addresses  
 *   - bracketed IPv6 addresses  
 *
 *   REJECTS:
 *   - protocols (http://example.com)  
 *   - ports ("example.com:3000")  
 *   - paths ("example.com/x")  
 *   - queries ("example.com?a=1")  
 *   - userinfo ("user:pass@example.com")  
 *   - Unicode domains (must be punycode-normalized before validation)  
 *   - wildcard hosts ("*.example.com") — separate schema will handle those  
 *
 * OUTPUT CONTRACT  
 *   Returns the original host string unchanged.
 *
 * VALIDATION LOGIC  
 *   - IPv4 pattern  
 *   - IPv6 bracket pattern  
 *   - Domain label validation:
 *       - 1–63 characters per label  
 *       - alphanumeric + hyphen  
 *       - label does not start or end with hyphen  
 *       - TLD alphabetic  
 *
 * SEMANTIC NOTES  
 *   - This schema intentionally does NOT normalize or downcase.  
 *   - Some systems require punycode input; others store Unicode. To preserve
 *     correctness and avoid unexpected transformations, **this validator does
 *     not perform IDNA normalization**.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "example.com"
 *   "sub.domain.example.co.uk"
 *   "192.168.1.1"
 *   "[2001:db8::1]"
 *   "xn--bcher-kva.com"
 *
 *   // Invalid
 *   "http://example.com"
 *   "example.com:8080"
 *   "*.example.com"
 *   "exa mple.com"
 *   "/example.com"
 *   ```
 */
export const urlHost = v.custom(
    (value) => {
        if (typeof value !== "string") return false;
        if (value.trim() === "") return false;

        // Reject protocols, paths, queries, fragments, ports
        if (value.includes("://")) return false;
        if (value.includes("/")) return false;
        if (value.includes("?")) return false;
        if (value.includes("#")) return false;
        if (value.includes("@")) return false;
        if (value.includes(":") && !value.startsWith("[")) return false; // Port or userinfo

        const vstr = value;

        // IPv6 in brackets
        if (vstr.startsWith("[") && vstr.endsWith("]")) {
            const inner = vstr.slice(1, -1);
            const IPV6_PATTERN = /^[0-9A-Fa-f:]+$/;
            return IPV6_PATTERN.test(inner);
        }

        // IPv4
        const IPV4_PATTERN =
            /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
        if (IPV4_PATTERN.test(vstr)) return true;

        // Domain name (punycode allowed)
        const DOMAIN_PATTERN =
            /^(?=.{1,253}$)([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)(\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

        return DOMAIN_PATTERN.test(vstr);
    },
    "Expected a valid RFC 3986 hostname (domain, IPv4, or bracketed IPv6)."
);

/**
* OUTPUT TYPE — URL HOST
*
* SUMMARY  
*   Represents a validated RFC-compliant hostname suitable for CORS,
*   CSP, routing, multi-tenancy, analytics attribution, and origin-based
*   authorization systems.
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always host-only (no scheme, no port, no path)  
*   - Always a valid domain, IPv4, or bracketed IPv6  
*
* EXAMPLE  
*   ```
*   const host: UrlHost = parse(urlHost, "api.example.com");
*   ```
*/
export type UrlHost = v.InferOutput<typeof urlHost>;

/**
 * PURE HOSTNAME SCHEMA (STRICT DNS HOSTS ONLY)
 *
 * SUMMARY  
 *   Validates a **pure DNS hostname** per RFC 1035 + RFC 5891 + RFC 3986. This
 *   schema accepts ONLY canonical domain names and punycode IDN hostnames.
 *
 *   Unlike `urlHost`, this schema does NOT allow:
 *   - IPv4 addresses  
 *   - IPv6 addresses  
 *   - bracketed hosts  
 *   - ports  
 *   - path/query/fragment  
 *   - userinfo  
 *   - protocol  
 *
 * PURPOSE  
 *   Required for:
 *   - strict domain-based allowlists  
 *   - CORS & CSP domain validation  
 *   - multi-tenant routing  
 *   - certificate hostname matching  
 *   - analytics attribution  
 *   - canonical domain registries  
 *   - DNS-verified configuration  
 *
 * CONTRACT — ACCEPTS:
 *   - domain.tld  
 *   - sub.domain.example  
 *   - xn--punycode-example  
 *   - case-insensitive domains  
 *
 * CONTRACT — REJECTS:
 *   - numeric IPv4 ("192.168.0.1")  
 *   - IPv6 ("[2001:db8::1]")  
 *   - ports ("example.com:3000")  
 *   - schemes ("http://example.com")  
 *   - paths ("example.com/x")  
 *   - queries ("example.com?a=1")  
 *   - Unicode IDNs ("bücher.de") — must be punycode  
 *   - wildcard domains ("*.example.com") — separate schema handles this  
 *
 * OUTPUT CONTRACT  
 *   Returns the original hostname unchanged.
 *
 * VALIDATION RULES  
 *   - 1–253 total characters  
 *   - 1–63 characters per label  
 *   - labels must match:
 *         ^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$
 *   - TLD must be alphabetic, punycode allowed ("xn--")  
 *
 * SEMANTIC NOTES  
 *   - This schema enforces **pure DNS hostnames only**.  
 *   - Does NOT perform Unicode → punycode conversion — upstream code must normalize.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "example.com"
 *   "api.service.example.co.uk"
 *   "xn--bcher-kva.com"
 *
 *   // Invalid
 *   "192.168.1.1"
 *   "[2001:db8::1]"
 *   "*.example.com"
 *   "http://example.com"
 *   "example.com:8080"
 *   "bücher.de"         // Unicode not allowed — must be punycode
 *   ```
 */
export const urlHostname = v.custom(
    (value) => {
        if (typeof value !== "string") return false;
        if (value.trim() === "") return false;

        // Reject protocol, path, query, fragment, userinfo, and port
        if (value.includes("://")) return false;
        if (value.includes("/")) return false;
        if (value.includes("?")) return false;
        if (value.includes("#")) return false;
        if (value.includes("@")) return false;
        if (value.includes(":")) return false;

        const vstr = value;

        // Reject IPv4
        const IPV4_PATTERN =
            /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
        if (IPV4_PATTERN.test(vstr)) return false;

        // Reject IPv6
        if (vstr.startsWith("[") && vstr.endsWith("]")) return false;

        // Domain name
        // RFC 1035 + punycode support
        const DOMAIN_PATTERN =
            /^(?=.{1,253}$)([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)(\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

        return DOMAIN_PATTERN.test(vstr);
    },
    "Expected a valid RFC-compliant DNS hostname (domain-only, no IP, no port)."
);

/**
* OUTPUT TYPE — DNS HOSTNAME
*
* SUMMARY  
*   Represents a validated, canonical DNS hostname suitable for strict
*   domain-level validation in security, networking, multi-tenancy, routing,
*   and analytics systems.
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always a DNS hostname (not IP)  
*   - No ports, no brackets, no path/query  
*   - RFC 1035 + RFC 5891 compliant  
*
* EXAMPLE  
*   ```
*   const host: UrlHostname = parse(urlHostname, "api.example.com");
*   ```
*/
export type UrlHostname = v.InferOutput<typeof urlHostname>;

/**
 * URL AUTHORITY SCHEMA
 *
 * SUMMARY  
 *   Validates the **Authority** component of a URL per RFC 3986, which takes
 *   the form:
 *
 *       [userinfo@]host[:port]
 *
 *   This schema validates ONLY the authority portion — it does NOT include:
 *   - protocol ("http://")
 *   - path ("/api")
 *   - query ("?x=1")
 *   - fragment ("#x")
 *
 *   The authority block is used in HTTP, proxy, and gateway contexts to route
 *   requests, compare origins, and manage cross-domain policy.
 *
 * PURPOSE  
 *   Required for:
 *   - reverse-proxy rule evaluation  
 *   - origin equivalence checks  
 *   - security filters  
 *   - normalized request metadata  
 *   - gateway routing logs  
 *   - CORS authority matching  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `hostname`
 *   - `hostname:port`
 *   - `user@hostname`
 *   - `user:pass@hostname`
 *   - `user@hostname:port`
 *   - IPv4/IPv6 hosts:
 *       `192.168.0.1`
 *       `[2001:db8::1]`
 *       `[2001:db8::1]:443`
 *
 *   REJECTS:
 *   - protocols (`http://x.com`)  
 *   - paths (`x.com/api`)  
 *   - queries (`x.com?a=1`)  
 *   - fragments (`x.com#x`)  
 *   - invalid ports  
 *   - Unicode hostnames (must be punycode)  
 *
 * OUTPUT CONTRACT  
 *   Returns the authority string unchanged.
 *
 * VALIDATION LOGIC  
 *   Steps:
 *   - split optional userinfo (`...@`)  
 *   - validate userinfo (RFC 3986 pchar rules)  
 *   - parse host portion:
 *       - IPv6: `[addr]`
 *       - IPv4: dotted decimal  
 *       - Domain: RFC 1035/5891  
 *   - validate optional port (1–65535)  
 *
 * SEMANTIC NOTES  
 *   - Although userinfo is discouraged, it is included for RFC adherence.  
 *   - Authority is the foundation of URL "origin" comparison.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "example.com"
 *   "example.com:443"
 *   "user@example.com"
 *   "user:pass@example.com:8080"
 *   "192.168.1.1:3000"
 *   "[2001:db8::1]:443"
 *
 *   // Invalid
 *   "http://example.com"
 *   "/path"
 *   "example.com/api"
 *   "example.com?x=1"
 *   "exa mple.com"
 *   ```
 */
export const urlAuthority = v.custom(
    (value) => {
        if (typeof value !== "string") return false;
        if (value.trim() === "") return false;

        // Cannot contain these
        if (value.includes("://")) return false;
        if (value.includes("/")) return false;
        if (value.includes("?")) return false;
        if (value.includes("#")) return false;

        let userinfo: string | null = null;
        let hostPort: string = value;

        // Extract userinfo
        if (value.includes("@")) {
            const parts = value.split("@");
            if (parts.length !== 2) return false;
            userinfo = parts[0];
            hostPort = parts[1];

            // Validate userinfo
            const USERINFO_PATTERN = /^[A-Za-z0-9\-._~!$&'()*+,;=:%]+$/;
            if (!USERINFO_PATTERN.test(userinfo)) return false;
        }

        // Split host and port
        let host: string;
        let port: string | null = null;

        // IPv6 bracketed host
        if (hostPort.startsWith("[") && hostPort.includes("]")) {
            const idx = hostPort.indexOf("]");
            host = hostPort.slice(0, idx + 1);
            port = hostPort.slice(idx + 1).startsWith(":")
                ? hostPort.slice(idx + 2)
                : null;
        } else {
            // Non-IPv6
            const parts = hostPort.split(":");
            if (parts.length > 2) return false;
            host = parts[0];
            port = parts.length === 2 ? parts[1] : null;
        }

        // Validate host using urlHost logic
        const IPV4_PATTERN =
            /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

        const DOMAIN_PATTERN =
            /^(?=.{1,253}$)([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)(\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

        const isIPv6 =
            host.startsWith("[") &&
            host.endsWith("]") &&
            /^[0-9A-Fa-f:]+$/.test(host.slice(1, -1));

        const isIPv4 = IPV4_PATTERN.test(host);
        const isDomain = DOMAIN_PATTERN.test(host);

        if (!isIPv4 && !isIPv6 && !isDomain) return false;

        // Validate port if present
        if (port !== null) {
            if (!/^[0-9]+$/.test(port)) return false;
            const n = Number(port);
            if (n < 1 || n > 65535) return false;
        }

        return true;
    },
    "Expected a valid RFC 3986 authority component."
);

/**
* OUTPUT TYPE — URL AUTHORITY
*
* SUMMARY  
*   Represents a validated RFC 3986-compliant authority block of a URL:
*   `[userinfo@]host[:port]`.
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always valid authority component  
*   - Never contains scheme/path/query/fragment  
*
* EXAMPLE  
*   ```
*   const auth: UrlAuthority =
*       parse(urlAuthority, "user:pw@[2001:db8::1]:443");
*   ```
*/
export type UrlAuthority = v.InferOutput<typeof urlAuthority>;

/**
 * URL PORT SCHEMA
 *
 * SUMMARY  
 *   Validates a standalone port number as used in URL authority components or
 *   network configuration. Ports must match the IANA-defined range:
 *
 *       1–65535
 *
 *   Port zero is explicitly *not* allowed here — a separate schema will exist
 *   for systems that support `0` as a wildcard/bind-any port.
 *
 * PURPOSE  
 *   Required for:
 *   - URL authority parsing  
 *   - origin comparisons  
 *   - reverse-proxy routing  
 *   - firewall/ACL configuration  
 *   - SSR/network-layer URL normalization  
 *   - database connection URL parsing  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - numeric strings with digits only  
 *   - values 1–65535  
 *
 *   REJECTS:
 *   - empty strings  
 *   - non-numeric characters  
 *   - negative numbers  
 *   - zero ("0")  
 *   - decimals  
 *   - signs (`+443`, `-1`)  
 *   - values > 65535  
 *
 * OUTPUT CONTRACT  
 *   Returns the **port string unchanged**.
 *
 * VALIDATION LOGIC  
 *   - Must match `/^[0-9]+$/`  
 *   - Convert to number  
 *   - Check `1 <= n <= 65535`  
 *
 * SEMANTIC NOTES  
 *   - Output remains a string to align with URL parsing (`URL.port`).  
 *   - Conversion to number occurs only for range validation.  
 *   - No whitespace trimming is performed — the input must be exact.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "80"
 *   "443"
 *   "65535"
 *
 *   // Invalid
 *   "0"
 *   "70000"
 *   "-1"
 *   "abcd"
 *   "443/"
 *   "443.0"
 *   ```
 */
export const urlPort = v.custom(
    (value) => {
        if (typeof value !== "string") return false;

        if (!/^[0-9]+$/.test(value)) return false;

        const n = Number(value);
        if (n < 1 || n > 65535) return false;

        return true;
    },
    "Expected a valid port (numeric string from 1 to 65535)."
);

/**
* OUTPUT TYPE — URL PORT
*
* SUMMARY  
*   Represents a validated port identifier suitable for authority components,
*   origin matching, reverse proxies, and network configuration logic.
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always matches /^[0-9]+$/  
*   - Always numeric in the range 1–65535  
*
* EXAMPLE  
*   ```
*   const p: UrlPort = parse(urlPort, "443");
*   ```
*/
export type UrlPort = v.InferOutput<typeof urlPort>;

/**
 * URL USERINFO SCHEMA
 *
 * SUMMARY  
 *   Validates the **userinfo** component of a URL authority block per RFC 3986.
 *   Userinfo appears in URLs in the form:
 *
 *       username
 *       username:password
 *
 *   Although deprecated for most modern systems due to credential leakage
 *   risks, userinfo still appears in legacy URLs, migration pipelines, and
 *   parsing operations — this schema ensures strict syntactic correctness.
 *
 * PURPOSE  
 *   Required for:
 *   - RFC-compliant URL parsing  
 *   - reverse-proxy authority decomposition  
 *   - legacy HTTP Basic/Digest migration  
 *   - security scanners  
 *   - data ingestion pipelines  
 *   - URL normalization systems  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `username`  
 *   - `username:password`  
 *   - both parts must follow RFC 3986 "pchar" rules:
 *       ALPHA / DIGIT / "-" / "." / "_" / "~"
 *       "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" /
 *       "," / ";" / "=" / ":" / "@"  (but "@" is delimiter at outer level)
 *
 *   REJECTS:
 *   - empties ("")  
 *   - whitespace  
 *   - leading or trailing ":"  
 *   - double or multiple ":" (only one password delimiter allowed)  
 *   - control characters  
 *   - any presence of "/" "?" "#"  
 *   - full authority blocks (user@host) — host must be validated separately  
 *
 * OUTPUT CONTRACT  
 *   Returns the validated userinfo string unchanged.
 *
 * VALIDATION LOGIC  
 *   - Split on ":"  
 *   - Max 2 parts  
 *   - Validate each part against RFC pchar rules  
 *
 * SECURITY NOTES  
 *   - This schema validates only syntax — it does NOT approve usage of userinfo
 *     in production systems.  
 *   - Many modern browsers strip userinfo silently — downstream systems must
 *     treat its presence as high risk.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "user"
 *   "user:pass"
 *   "john.doe"
 *   "svc-readonly:token-123"
 *
 *   // Invalid
 *   ":pass"
 *   "user:"
 *   "user:pa:ss"
 *   "user name"
 *   "user/password"
 *   "user#frag"
 *   ```
 */
export const urlUserInfo = v.custom(
    (value) => {
        if (typeof value !== "string") return false;

        // Reject obvious invalid characters
        if (value.includes("/") || value.includes("?") || value.includes("#"))
            return false;

        const parts = value.split(":");
        if (parts.length > 2) return false;

        const USER_PART_PATTERN =
            /^[A-Za-z0-9\-._~!$&'()*+,;=]+$/;

        // username required and must be valid
        if (!USER_PART_PATTERN.test(parts[0])) return false;

        // password optional
        if (parts.length === 2) {
            if (!USER_PART_PATTERN.test(parts[1])) return false;
        }

        return true;
    },
    "Expected a valid RFC 3986 userinfo string (username or username:password)."
);

/**
* OUTPUT TYPE — URL USERINFO
*
* SUMMARY  
*   Represents a validated RFC 3986-compliant userinfo string of the form:
*   `username` or `username:password`, suitable for URL parsing and
*   decomposition systems.
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Never empty  
*   - Matches RFC 3986 pchar rules  
*   - Contains at most one ':' delimiter  
*
* EXAMPLE  
*   ```
*   const u: UrlUserInfo = parse(urlUserInfo, "admin:secret");
*   ```
*/
export type UrlUserInfo = v.InferOutput<typeof urlUserInfo>;

/**
 * URL SEARCH PARAMS SCHEMA (NO LEADING "?")
 *
 * SUMMARY  
 *   Validates an RFC 3986-compliant query-parameter string **without** the
 *   leading `?`. This schema ensures strict compliance with URL query
 *   semantics:
 *
 *       key=value&key2=value2
 *
 *   and supports:
 *   - percent-encoded characters  
 *   - empty values (e.g., "a=")  
 *   - repeated keys (e.g., "a=1&a=2")  
 *   - keys without values (e.g., "flag")  
 *
 * PURPOSE  
 *   Required for:
 *   - canonical URL building  
 *   - query parsing & normalization  
 *   - analytics ingest  
 *   - HMAC signature construction  
 *   - SSR router parameter mapping  
 *   - safe query-string validation  
 *   - URL rewriting & sanitation  
 *   - search/filter parameter propagation  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - empty string ""  
 *   - valid `key=value` sequences  
 *   - valid percent encoding ("%20", "%2F", etc.)  
 *   - '&' separated pairs  
 *
 *   REJECTS:
 *   - leading "?"  
 *   - "#" characters  
 *   - invalid percent encoding ("%2", "%GG")  
 *   - control characters  
 *   - whitespace-only strings  
 *   - inclusion of path or protocol  
 *
 * OUTPUT CONTRACT  
 *   Returns the validated query-string **unchanged**.
 *
 * VALIDATION LOGIC  
 *   Uses:
 *   - strict check for leading '?' (forbidden here)  
 *   - rejects '#' (fragment delimiter)  
 *   - attempts parsing via `URLSearchParams`  
 *   - confirms round-tripping correctness for percent encoding  
 *
 * SEMANTIC NOTES  
 *   - This schema validates syntax only; normalization/ordering is separate.  
 *   - Ensures safety before feeding into analytics/search systems.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   ""
 *   "a=1"
 *   "q=hello%20world"
 *   "a=1&b=2"
 *   "flag"
 *
 *   // Invalid
 *   "?a=1"
 *   "a=1#frag"
 *   "%"
 *   "%ZZ"
 *   "http://example.com"
 *   ```
 */
export const urlSearchParams = v.custom(
    (value) => {
        if (typeof value !== "string") return false;

        // Cannot start with ? (that's urlQuery)
        if (value.startsWith("?")) return false;

        // Fragments not allowed
        if (value.includes("#")) return false;

        // Empty OK
        if (value === "") return true;

        // Validate via URLSearchParams
        try {
            const params = new URLSearchParams(value);

            // Validate percent-encoding by round-trip
            const reconstructed = params.toString();
            // reconstructed will never have a leading "?"
            // reconstructing differs if invalid encoding was present
            // (URLSearchParams strips or mutates invalid encodings)
            return reconstructed === value;
        } catch {
            return false;
        }
    },
    "Expected a valid RFC 3986 query-param string without leading '?'."
);

/**
* OUTPUT TYPE — URL SEARCH PARAMS
*
* SUMMARY  
*   Represents a validated, syntactically correct URLSearchParams-compatible
*   query-string fragment, safe for parsing, canonicalization, metadata
*   extraction, or query-state computation.
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Never includes '?'  
*   - Never includes '#'  
*   - Percent-encoding is guaranteed valid  
*   - Compatible with `new URLSearchParams(value)`  
*
* EXAMPLE  
*   ```
*   const p: UrlSearchParams =
*       parse(urlSearchParams, "a=1&b=hello%20world");
*   ```
*/
export type UrlSearchParams = v.InferOutput<typeof urlSearchParams>;

/**
 * URI TEMPLATE SCHEMA (RFC 6570 — Levels 1–4)
 *
 * SUMMARY  
 *   Validates a **URI Template** string following RFC 6570 syntax. A URI
 *   Template is a string that defines a URL pattern using variable expressions:
 *
 *       /users/{id}
 *       /api/{version}/items{?q,limit}
 *       /files/{+path}
 *       /search{?query*}
 *
 *   This schema validates **structural correctness**, not expansion semantics.
 *
 * PURPOSE  
 *   Required for:
 *   - OpenAPI / Swagger path validation  
 *   - REST routing definitions  
 *   - microservice service-discovery maps  
 *   - link templates in HATEOAS architectures  
 *   - templated build pipelines  
 *   - static site generation rules  
 *   - API gateway configuration  
 *   - metadata-driven router initialization  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any valid literal URL/path characters  
 *   - RFC 6570 template expressions:
 *         {var}
 *         {+var}
 *         {?var}
 *         {var,var2}
 *         {#fragment}
 *         {;semi*}
 *         {/segments*}
 *         {?keys*}
 *   - multiple template blocks  
 *
 *   REJECTS:
 *   - malformed expressions ("{", "}", "{var")  
 *   - illegal characters  
 *   - whitespace-only  
 *   - full URLs with protocols (templates are path-based)  
 *   - missing closing braces  
 *
 * OUTPUT CONTRACT  
 *   Returns the template string unchanged.
 *
 * VALIDATION LOGIC  
 *   Checks:
 *   - Balanced braces  
 *   - Valid operator prefix: + # . / ; ? &  
 *   - Valid variable-name characters (ALPHA / DIGIT / "_" / pct-encoded)  
 *   - Valid modifier: "*" or ":<length>"  
 *   - No forbidden characters in the literal portions  
 *
 * SEMANTIC NOTES  
 *   - This schema does NOT enforce variable name uniqueness.  
 *   - Does NOT evaluate templates — only validates structure.  
 *   - Designed for routing/metadata systems that rely on template correctness.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "/users/{id}"
 *   "/api/{version}/items{?q,limit}"
 *   "/files/{+path}"
 *   "/search{?query*}"
 *   "/repos/{owner}/{repo}"
 *
 *   // Invalid
 *   "{unclosed"
 *   "no brace}"
 *   "/users/{id"
 *   "/users/{id:}"
 *   "/users/{id:abc}"
 *   ```
 */
export const urlTemplate = v.custom(
    (value) => {
        if (typeof value !== "string") return false;
        if (value.trim() === "") return false;

        // Basic sanity: no protocols
        if (value.includes("://")) return false;
        if (value.includes("#") && !value.includes("{#")) return false; // fragment only allowed in template block

        // RFC 6570 literal safety
        const INVALID_LITERAL = /[\s<>"]/;
        if (INVALID_LITERAL.test(value)) return false;

        // Validate each {...} block
        const TEMPLATE_BLOCK_PATTERN = /\{([^}]*)\}/g;

        let match: RegExpExecArray | null;
        while ((match = TEMPLATE_BLOCK_PATTERN.exec(value)) !== null) {
            const content = match[1];

            // Allowed operator prefixes (+ # . / ; ? &), or none
            const OPERATOR_PREFIX = /^[+#./;?&]/;
            let inner = content;

            if (OPERATOR_PREFIX.test(inner[0])) {
                inner = inner.slice(1); // remove prefix
            }

            // Variables separated by "," are allowed
            const vars = inner.split(",");

            for (const vname of vars) {
                // Modifier "*" allowed
                const star = vname.endsWith("*");

                // Prefix modifiers "{var:3}"
                const prefixMatch = vname.match(/:([0-9]+)$/);
                const hasPrefix = Boolean(prefixMatch);

                let base = vname;
                if (star) base = base.slice(0, -1);
                if (hasPrefix) base = base.replace(/:[0-9]+$/, "");

                // Variable name must be valid
                const VARNAME_PATTERN = /^[A-Za-z0-9_]+(?:%[0-9A-Fa-f]{2})*$/;
                if (!VARNAME_PATTERN.test(base)) return false;

                // If prefix present, ensure numeric
                if (hasPrefix) {
                    const len = Number(prefixMatch![1]);
                    if (!(len > 0)) return false;
                }
            }
        }

        // Balanced braces check
        const openCount = (value.match(/\{/g) || []).length;
        const closeCount = (value.match(/\}/g) || []).length;
        if (openCount !== closeCount) return false;

        return true;
    },
    "Expected a valid RFC 6570 URI Template."
);

/**
* OUTPUT TYPE — URI TEMPLATE
*
* SUMMARY  
*   Represents a validated RFC 6570 URI Template string suitable for routers,
*   API gateways, OpenAPI path evaluation, hypermedia link systems, and any
*   metadata-driven routing architecture.
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always syntactically valid per RFC 6570  
*   - Template expressions are structurally correct  
*
* EXAMPLE  
*   ```
*   const t: UrlTemplate =
*       parse(urlTemplate, "/api/{version}/items{?q,limit}");
*   ```
*/
export type UrlTemplate = v.InferOutput<typeof urlTemplate>;

/**
 * IDEMPOTENT URL SCHEMA (SAFE FOR GET/HEAD)
 *
 * SUMMARY  
 *   Validates that a URL (absolute or relative) is **safe for idempotent HTTP
 *   operations**, such as GET and HEAD. This schema ensures the URL points to a
 *   resource that can be repeatedly fetched without modifying server state.
 *
 *   Idempotent URLs are critical for:
 *   - prefetch/preload
 *   - crawler indexing
 *   - SSR safe-fetch pipelines
 *   - CDN caching
 *   - retry-safe operations
 *   - content-addressed systems
 *   - safe cross-service polling
 *
 * PURPOSE  
 *   Prevents accidental or malicious invocation of:
 *   - destructive endpoints (`/delete`, `/reset`, `/purge`, `/shutdown`, etc.)
 *   - non-idempotent actions baked into query strings
 *   - javascript:, data:, blob: pseudo-URLs
 *   - fragment-only URLs (`#foo`)  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute HTTP/HTTPS URLs  
 *   - valid relative paths beginning with `/`  
 *   - optional query strings  
 *   - optional fragments  
 *
 *   REJECTS:
 *   - javascript:, data:, blob:, ftp:, file:  
 *   - fragment-only URLs  
 *   - endpoints containing destructive-action substrings:
 *       "delete", "destroy", "drop", "reset", "truncate", "purge",
 *       "shutdown", "kill", "admin", "write", "post", "update"
 *   - URLs with userinfo credentials  
 *   - whitespace-only  
 *
 * OUTPUT CONTRACT  
 *   Returns the **original URL string** if it is idempotent-safe.
 *
 * VALIDATION LOGIC  
 *   - Parse absolute URLs using WHATWG `URL`  
 *   - Relative URLs validated via regex  
 *   - Scheme must be http/https OR relative  
 *   - Disallow destructive substrings in path/query  
 *   - Disallow credentials  
 *
 * SEMANTIC NOTES  
 *   - This schema intentionally errs on the side of safety.  
 *   - Conservative interpretation ensures no destructive behavior is possible
 *     via GET/HEAD.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "/api/items"
 *   "https://example.com/assets/logo.png"
 *   "https://example.com/search?q=abc"
 *
 *   // Invalid
 *   "#section1"
 *   "javascript:alert(1)"
 *   "/admin/reset"
 *   "https://example.com/api/delete?id=1"
 *   "https://user:pw@evil.com/path"
 *   ```
 */
export const urlIdempotent = v.custom(
    (value) => {
        if (typeof value !== "string") return false;
        if (value.trim() === "") return false;

        // Fragment-only is not idempotent-safe
        if (value.startsWith("#")) return false;

        // Disallowed schemes (these are never fetch-safe)
        const LOWER = value.toLowerCase();
        if (
            LOWER.startsWith("javascript:") ||
            LOWER.startsWith("data:") ||
            LOWER.startsWith("blob:") ||
            LOWER.startsWith("file:") ||
            LOWER.startsWith("ftp:")
        ) {
            return false;
        }

        let url: URL | null = null;

        const isAbsolute = LOWER.startsWith("http://") || LOWER.startsWith("https://");

        if (isAbsolute) {
            try {
                url = new URL(value);
            } catch {
                return false;
            }

            // Credentials forbidden
            if (url.username || url.password) return false;

            // Path must not contain destructive patterns
            const destructive = [
                "delete",
                "destroy",
                "drop",
                "reset",
                "truncate",
                "purge",
                "shutdown",
                "kill",
                "admin",
                "write",
                "update",
                "post",
            ];

            const full = url.pathname.toLowerCase() + url.search.toLowerCase();

            for (const term of destructive) {
                if (full.includes(term)) return false;
            }

            return true;
        }

        // Relative path
        if (value.startsWith("/")) {
            const destructive = [
                "delete",
                "destroy",
                "drop",
                "reset",
                "truncate",
                "purge",
                "shutdown",
                "kill",
                "admin",
                "write",
                "update",
                "post",
            ];

            const LOWERVAL = value.toLowerCase();
            for (const term of destructive) {
                if (LOWERVAL.includes(term)) return false;
            }

            return true;
        }

        return false;
    },
    "Expected an idempotent-safe HTTP/HTTPS or relative URL."
);

/**
* OUTPUT TYPE — IDEMPOTENT-SAFE URL
*
* SUMMARY  
*   Represents a syntactically valid and semantically safe URL suitable for
*   GET/HEAD operations, repeated fetching, caching, prefetching, retry loops,
*   and non-mutating cross-service communication.
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always HTTP/HTTPS absolute OR relative  
*   - Never invokes destructive endpoints  
*   - Never uses javascript:, data:, blob:, file: schemes  
*   - Never includes credentials  
*   - Always safe for repeated fetches  
*
* EXAMPLE  
*   ```
*   const safe: UrlIdempotent =
*       parse(urlIdempotent, "https://example.com/search?q=test");
*   ```
*/
export type UrlIdempotent = v.InferOutput<typeof urlIdempotent>;

/**
 * URL RESOURCE SCHEMA (GENERAL-PURPOSE HTTP/HTTPS RESOURCE)
 *
 * SUMMARY  
 *   Validates that a value is a **syntactically correct, fetchable web resource
 *   URL**. This schema enforces only the core, foundational rules:
 *
 *   - URL must be HTTP or HTTPS  
 *   - URL must be absolute OR a valid leading-slash relative path  
 *   - No credentials (userinfo) allowed  
 *   - Must be a syntactically correct URL (if absolute)  
 *
 *   This schema is the **broadest safe default** for any resource-fetch
 *   operation, including:
 *   - static assets  
 *   - API endpoints  
 *   - metadata endpoints  
 *   - image/video/audio fetches  
 *   - JSON data endpoints  
 *   - resource introspection  
 *   - SSR / client-side fetch()  
 *   - configuration URLs  
 *
 * PURPOSE  
 *   Used as the canonical “any web resource URL” validator across:
 *   - fetch pipelines  
 *   - proxying systems  
 *   - CDNs and caching layers  
 *   - metadata ingestion  
 *   - crawlers and indexers  
 *   - server-rendering  
 *   - telemetry / logging  
 *   - resource prefetch/preload  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - absolute HTTP/HTTPS URLs  
 *   - valid relative paths beginning with `/`  
 *   - optional query parameters  
 *   - optional fragments  
 *
 *   REJECTS:
 *   - javascript:, data:, blob:, file:, ftp:, ws:, wss:  
 *   - fragment-only URLs (#foo)  
 *   - credentials (user:pass@)  
 *   - missing hostnames (for absolute URLs)  
 *   - malformed URLs  
 *
 * OUTPUT CONTRACT  
 *   Returns the URL string unchanged.
 *
 * VALIDATION LOGIC  
 *   - If absolute:
 *       - Parse using WHATWG URL  
 *       - protocol must be http/https  
 *       - host must be present  
 *       - no username/password  
 *
 *   - If relative:
 *       - must start with `/`  
 *       - must contain only path/query/fragment characters  
 *
 * SEMANTIC NOTES  
 *   - This schema deliberately does not restrict:
 *       - file types  
 *       - path structure  
 *       - idempotency  
 *       - existence  
 *       - content type  
 *
 *   - This is the broadest safe fetchable-resource schema.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "https://example.com/api/items"
 *   "https://cdn.example.com/assets/logo.svg?v=3"
 *   "/local/path"
 *   "/api/v1/resource?id=9#top"
 *
 *   // Invalid
 *   "javascript:alert(1)"
 *   "#fragonly"
 *   "ftp://example.com"
 *   "https://user:pw@evil.com/path"
 *   "api/relative-without-slash"
 *   ```
 */
export const urlResource = v.custom(
    (value) => {
        if (typeof value !== "string") return false;
        if (value.trim() === "") return false;

        const lower = value.toLowerCase();

        // Disallowed schemes
        if (
            lower.startsWith("javascript:") ||
            lower.startsWith("data:") ||
            lower.startsWith("blob:") ||
            lower.startsWith("file:") ||
            lower.startsWith("ftp:") ||
            lower.startsWith("ws:") ||
            lower.startsWith("wss:")
        ) {
            return false;
        }

        // Fragment-only not allowed
        if (value.startsWith("#")) return false;

        const isAbsolute = lower.startsWith("http://") || lower.startsWith("https://");

        if (isAbsolute) {
            try {
                const u = new URL(value);

                // No userinfo
                if (u.username || u.password) return false;

                // Hostname must exist
                if (!u.hostname) return false;

                return true;
            } catch {
                return false;
            }
        }

        // Relative resource paths
        if (value.startsWith("/")) {
            // RFC-safe path characters
            const PATH_PATTERN =
                /^\/[A-Za-z0-9\-._~!$&'()*+,;=:@/?#%]*$/;
            return PATH_PATTERN.test(value);
        }

        return false;
    },
    "Expected a valid HTTP/HTTPS or leading-slash relative resource URL."
);

/**
* OUTPUT TYPE — GENERIC RESOURCE URL
*
* SUMMARY  
*   Represents a syntactically valid HTTP/HTTPS or relative-path resource URL
*   that is safe to fetch from any web environment (browser, server, edge,
*   worker, proxy).
*
* CONTRACT GUARANTEES  
*   - Always a string  
*   - Always HTTP/HTTPS absolute OR /relative  
*   - Never contains credentials  
*   - Never uses unsafe schemes  
*
* EXAMPLE  
*   ```
*   const res: UrlResource =
*       parse(urlResource, "https://api.example.com/data.json");
*   ```
*/
export type UrlResource = v.InferOutput<typeof urlResource>;

/*
✅ SECTION 1 — CORE URL FORMS
	1.	URL-BASIC SCHEMA (https://example.com)
	2.	URL-STRICT SCHEMA (must include protocol + host)
	3.	URL-RELAXED SCHEMA (accepts relative or missing protocol)
	4.	URL-OPTIONAL SCHEMA
	5.	URL-NULLABLE SCHEMA
	6.	URL-DEFAULT SCHEMA (fallback URL)
	7.	URL-STRING-COERCE SCHEMA (string→URL)
	8.	URL-OBJECT-COERCE SCHEMA (URL→string)
	9.	URL-INSTANCE-SCHEMA (native URL object)
	10.	URL-VALIDATION-RESULT SCHEMA (parsed parts)

⸻

✅ SECTION 2 — PROTOCOL / SCHEME
	11.	URL-SCHEME-HTTP SCHEMA
	12.	URL-SCHEME-HTTPS SCHEMA
	13.	URL-SCHEME-FTP SCHEMA
	14.	URL-SCHEME-SFTP SCHEMA
	15.	URL-SCHEME-WS SCHEMA
	16.	URL-SCHEME-WSS SCHEMA
	17.	URL-SCHEME-DATA SCHEMA
	18.	URL-SCHEME-BLOB SCHEMA
	19.	URL-SCHEME-FILE SCHEMA
	20.	URL-SCHEME-CUSTOM SCHEMA (app://, ipfs://, etc.)
	21.	URL-SCHEME-VALIDATION SCHEMA
	22.	URL-SCHEME-WHITELIST SCHEMA
	23.	URL-SCHEME-BLACKLIST SCHEMA
	24.	URL-SCHEME-COERCE SCHEMA (append default protocol)
	25.	URL-SCHEME-NORMALIZE SCHEMA (force https)

⸻

✅ SECTION 3 — HOST / DOMAIN
	26.	URL-HOSTNAME SCHEMA
	27.	URL-HOSTNAME-STRICT SCHEMA (RFC DN rules)
	28.	URL-HOSTNAME-UNICODE SCHEMA
	29.	URL-HOSTNAME-PUNYCODE SCHEMA
	30.	URL-HOSTNAME-ASCII-SCHEMA
	31.	URL-HOSTNAME-COERCE SCHEMA
	32.	URL-DOMAIN-NAME SCHEMA
	33.	URL-SUBDOMAIN SCHEMA
	34.	URL-ROOT-DOMAIN SCHEMA
	35.	URL-TLD SCHEMA
	36.	URL-DOMAIN-VALIDATION SCHEMA
	37.	URL-DOMAIN-BLACKLIST SCHEMA
	38.	URL-DOMAIN-WHITELIST SCHEMA
	39.	URL-DOMAIN-PUBLIC-SUFFIX SCHEMA
	40.	URL-DOMAIN-CORPORATE-SCHEMA (intranet hostnames)

⸻

✅ SECTION 4 — PORT COMPONENT
	41.	URL-PORT SCHEMA
	42.	URL-PORT-OPTIONAL SCHEMA
	43.	URL-PORT-DEFAULT-SCHEMA (append 443 / 80)
	44.	URL-PORT-RANGE-SCHEMA (1–65535)
	45.	URL-PORT-NUMBER-SCHEMA
	46.	URL-PORT-COERCE-SCHEMA (string→number)
	47.	URL-PORT-VALIDATION-SCHEMA
	48.	URL-PORT-BLACKLIST-SCHEMA
	49.	URL-PORT-WHITELIST-SCHEMA
	50.	URL-PORT-IS-SECURE-SCHEMA (443 only)

⸻

✅ SECTION 5 — PATH / RESOURCE
	51.	URL-PATH SCHEMA
	52.	URL-PATH-NONEMPTY SCHEMA
	53.	URL-PATH-OPTIONAL SCHEMA
	54.	URL-PATH-DIRECTORY-SCHEMA (ends with /)
	55.	URL-PATH-FILE-SCHEMA
	56.	URL-PATH-EXTENSION-SCHEMA
	57.	URL-PATH-NORMALIZE-SCHEMA (//→/)
	58.	URL-PATH-STRIP-TRAILING-SLASH-SCHEMA
	59.	URL-PATH-ADD-TRAILING-SLASH-SCHEMA
	60.	URL-PATH-NO-TRAVERSAL-SCHEMA (.. blocked)
	61.	URL-PATH-SAFE-SCHEMA (no reserved chars)
	62.	URL-PATH-ENCODED-SCHEMA
	63.	URL-PATH-DECODED-SCHEMA
	64.	URL-PATH-SEGMENT-ARRAY-SCHEMA
	65.	URL-PATH-WILDCARD-SCHEMA (*)
	66.	URL-PATH-PATTERN-SCHEMA (regex match)
	67.	URL-PATH-API-RESOURCE-SCHEMA (/v1/items/{id})
	68.	URL-PATH-STATIC-ASSET-SCHEMA
	69.	URL-PATH-SAFE-PUBLIC-SCHEMA (no private files)
	70.	URL-PATH-CLEAN-COERCE-SCHEMA

⸻

✅ SECTION 6 — QUERY STRING
	71.	URL-QUERY-BASIC SCHEMA (?key=value)
	72.	URL-QUERY-PARAM-SCHEMA
	73.	URL-QUERY-OBJECT-SCHEMA
	74.	URL-QUERY-ARRAY-SCHEMA
	75.	URL-QUERY-STRING-COERCE SCHEMA (object↔string)
	76.	URL-QUERY-NORMALIZE-SCHEMA (sorted keys)
	77.	URL-QUERY-ENCODED-SCHEMA
	78.	URL-QUERY-DECODED-SCHEMA
	79.	URL-QUERY-ALLOWLIST-SCHEMA
	80.	URL-QUERY-DENYLIST-SCHEMA
	81.	URL-QUERY-REQUIRED-PARAMS SCHEMA
	82.	URL-QUERY-OPTIONAL-PARAMS SCHEMA
	83.	URL-QUERY-BOOLEAN-PARAM SCHEMA
	84.	URL-QUERY-NUMERIC-PARAM SCHEMA
	85.	URL-QUERY-DATE-PARAM SCHEMA
	86.	URL-QUERY-TOKEN-PARAM SCHEMA
	87.	URL-QUERY-SAFE-SCHEMA (no injection)
	88.	URL-QUERY-XSS-SAFE-SCHEMA
	89.	URL-QUERY-LIMIT-LENGTH-SCHEMA
	90.	URL-QUERY-DEFAULT-PARAMS SCHEMA

⸻

✅ SECTION 7 — FRAGMENT / HASH
	91.	URL-FRAGMENT-BASIC SCHEMA (#section)
	92.	URL-FRAGMENT-OPTIONAL SCHEMA
	93.	URL-FRAGMENT-COERCE SCHEMA
	94.	URL-FRAGMENT-SAFE-SCHEMA
	95.	URL-FRAGMENT-ENCODED-SCHEMA
	96.	URL-FRAGMENT-DECODED-SCHEMA
	97.	URL-FRAGMENT-PATTERN-SCHEMA
	98.	URL-FRAGMENT-ID-SCHEMA (DOM id)
	99.	URL-FRAGMENT-ALPHANUMERIC SCHEMA
	100.	URL-FRAGMENT-LENGTH-LIMIT SCHEMA

⸻

✅ SECTION 8 — AUTH COMPONENTS
	101.	URL-USERNAME SCHEMA
	102.	URL-PASSWORD SCHEMA
	103.	URL-CREDENTIALS-PAIR SCHEMA (user:pass@)
	104.	URL-AUTH-OPTIONAL SCHEMA
	105.	URL-AUTH-DISALLOWED SCHEMA
	106.	URL-AUTH-SAFE-SCHEMA (no plaintext)
	107.	URL-AUTH-OAUTH-TOKEN SCHEMA
	108.	URL-AUTH-API-KEY SCHEMA
	109.	URL-AUTH-SIGNATURE SCHEMA
	110.	URL-AUTH-BEARER-TOKEN SCHEMA

⸻

✅ SECTION 9 — FULL STRUCTURE OBJECTS
	111.	URL-STRUCT-FULL SCHEMA ({ protocol, host, path, query })
	112.	URL-STRUCT-PUBLIC SCHEMA (no auth)
	113.	URL-STRUCT-INTERNAL SCHEMA
	114.	URL-STRUCT-ABSOLUTE SCHEMA
	115.	URL-STRUCT-RELATIVE SCHEMA
	116.	URL-STRUCT-ORIGIN-SCHEMA
	117.	URL-STRUCT-RESOURCE-SCHEMA
	118.	URL-STRUCT-SERVICE-ENDPOINT-SCHEMA
	119.	URL-STRUCT-CDN-RESOURCE-SCHEMA
	120.	URL-STRUCT-IMAGE-ASSET-SCHEMA
	121.	URL-STRUCT-AUDIO-ASSET-SCHEMA
	122.	URL-STRUCT-VIDEO-ASSET-SCHEMA
	123.	URL-STRUCT-DOC-ASSET-SCHEMA
	124.	URL-STRUCT-API-ENDPOINT-SCHEMA
	125.	URL-STRUCT-INTERNAL-SERVICE-SCHEMA
	126.	URL-STRUCT-WEBHOOK-TARGET-SCHEMA
	127.	URL-STRUCT-OAUTH-REDIRECT-SCHEMA
	128.	URL-STRUCT-CALLBACK-SCHEMA
	129.	URL-STRUCT-S3-RESOURCE-SCHEMA
	130.	URL-STRUCT-R2-RESOURCE-SCHEMA
	131.	URL-STRUCT-GCS-RESOURCE-SCHEMA
	132.	URL-STRUCT-WORKER-DEPLOY-SCHEMA
	133.	URL-STRUCT-K8S-SERVICE-SCHEMA
	134.	URL-STRUCT-DATABASE-DSN-SCHEMA
	135.	URL-STRUCT-POSTGRES-DSN-SCHEMA
	136.	URL-STRUCT-REDIS-DSN-SCHEMA
	137.	URL-STRUCT-MONGO-DSN-SCHEMA
	138.	URL-STRUCT-ELASTIC-DSN-SCHEMA
	139.	URL-STRUCT-CLOUDFLARE-R2-SCHEMA
	140.	URL-STRUCT-SUPABASE-SCHEMA

⸻

✅ SECTION 10 — SECURITY / SANITIZATION
	141.	URL-SAFE-PUBLIC-SCHEMA (no PII)
	142.	URL-SAFE-INTERNAL-SCHEMA (allow localhost)
	143.	URL-SAFE-EXTERNAL-SCHEMA (deny private IP)
	144.	URL-SAFE-NO-AUTH-SCHEMA
	145.	URL-SAFE-NO-QUERY-TOKEN-SCHEMA
	146.	URL-SAFE-NO-PASSWORD-SCHEMA
	147.	URL-SAFE-NO-CREDENTIALS-SCHEMA
	148.	URL-SAFE-NO-INJECTION-SCHEMA
	149.	URL-SAFE-ESCAPED-SCHEMA
	150.	URL-SAFE-ENCODED-SCHEMA
	151.	URL-SAFE-SANITIZED-SCHEMA
	152.	URL-SAFE-XSS-SCHEMA
	153.	URL-SAFE-OPEN-REDIRECT-SCHEMA
	154.	URL-SAFE-REDIRECT-VALIDATION-SCHEMA
	155.	URL-SAFE-CORS-SCHEMA
	156.	URL-SAFE-CSP-SCHEMA
	157.	URL-SAFE-ORIGIN-CHECK-SCHEMA
	158.	URL-SAFE-SAMESITE-SCHEMA
	159.	URL-SAFE-DOWNLOAD-SCHEMA
	160.	URL-SAFE-ATTACHMENT-SCHEMA

⸻

✅ SECTION 11 — UTILITY / COERCION / ANALYTICS
	161.	URL-NORMALIZE-CASE-SCHEMA
	162.	URL-NORMALIZE-SLASHES-SCHEMA
	163.	URL-NORMALIZE-ENCODING-SCHEMA
	164.	URL-NORMALIZE-PORT-SCHEMA
	165.	URL-NORMALIZE-CANONICAL-SCHEMA
	166.	URL-RESOLVE-RELATIVE-SCHEMA
	167.	URL-RESOLVE-BASE-SCHEMA
	168.	URL-JOIN-PATH-SCHEMA
	169.	URL-SPLIT-PARTS-SCHEMA
	170.	URL-COMPARE-SCHEMA (equal normalized URLs)
	171.	URL-COMPARE-ORIGIN-SCHEMA
	172.	URL-COMPARE-PATH-SCHEMA
	173.	URL-MATCH-PATTERN-SCHEMA
	174.	URL-MATCH-GLOB-SCHEMA
	175.	URL-MATCH-REGEX-SCHEMA
	176.	URL-MATCH-WILDCARD-SCHEMA
	177.	URL-MATCH-DOMAIN-SCHEMA
	178.	URL-EXTRACT-DOMAIN-SCHEMA
	179.	URL-EXTRACT-HOST-SCHEMA
	180.	URL-EXTRACT-PARAM-SCHEMA
	181.	URL-EXTRACT-EXT-SCHEMA
	182.	URL-DETECT-SERVICE-SCHEMA (e.g. YouTube, GitHub)
	183.	URL-DETECT-RESOURCE-TYPE-SCHEMA (image/video/doc)
	184.	URL-CANONICALIZE-PUBLIC-LINK-SCHEMA
	185.	URL-SHORTENED-DETECT-SCHEMA (bit.ly etc.)
	186.	URL-EXPAND-SHORTLINK-SCHEMA
	187.	URL-TRACE-REDIRECT-SCHEMA
	188.	URL-FETCH-METADATA-SCHEMA (HTTP HEAD probe)
	189.	URL-VALID-RESOURCE-CHECK-SCHEMA
	190.	URL-CHECK-LIVE-SCHEMA (HTTP 200)
	191.	URL-CHECK-SSL-VALID-SCHEMA
	192.	URL-CHECK-CNAME-RESOLVES-SCHEMA
	193.	URL-CHECK-DNS-RESOLVES-SCHEMA
	194.	URL-CHECK-SECURE-REDIRECT-SCHEMA
	195.	URL-CHECK-CERT-EXPIRY-SCHEMA
	196.	URL-CHECK-REACHABILITY-SCHEMA
	197.	URL-CHECK-BLACKLIST-SCHEMA (malware)
	198.	URL-CHECK-PHISHING-SCHEMA
	199.	URL-CHECK-CONTENT-TYPE-SCHEMA
	200.	URL-CHECK-CONTENT-HASH-SCHEMA

*/