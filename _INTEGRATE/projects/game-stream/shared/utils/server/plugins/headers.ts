type BestPracticeHeadersOptions = {
    mode?: 'dev' | 'prod';
    cors?: boolean;
    credentials?: boolean;
    csp?: boolean;
    apiVersion?: string;
    maskServerHeader?: boolean;
    allowedOrigins?: string[];
    enableETag?: boolean;
};

export function bestPracticeHeaders({
    mode = 'prod',
    cors = true,
    credentials = false,
    csp = true,
    apiVersion = 'v1',
    maskServerHeader = true,
    allowedOrigins = ['http://localhost:3000'],
    enableETag = false
}: BestPracticeHeadersOptions = {}) {
    return new Elysia({
        name: 'best-practice-headers',

        // CORS Preflight
        onBeforeHandle({ request, set }) {
            if (request.method === 'OPTIONS') {
                const origin = request.headers.get('origin') || '';
                if (allowedOrigins.includes(origin)) {
                    set.status = 204;
                    set.headers = {
                        'Access-Control-Allow-Origin': origin,
                        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        ...(credentials && { 'Access-Control-Allow-Credentials': 'true' }),
                        'Content-Length': '0'
                    };
                    return new Response(null, { status: 204 });
                }
                set.status = 403;
                return new Response('Forbidden origin', { status: 403 });
            }
        },

        onRequest({ request, set, store }) {
            set.headers ??= {};

            const origin = request.headers.get('origin') || '';
            const isAllowedOrigin = allowedOrigins.includes(origin);

            const requestId = request.headers.get('x-request-id') || randomUUID();
            set.headers['X-Request-ID'] = requestId;
            store.requestId = requestId;

            const strictCSP = "default-src 'none'; base-uri 'none'; frame-ancestors 'none';";
            const relaxedCSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";

            const securityHeaders: Record<string, string> = {
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'Referrer-Policy': 'no-referrer',
                'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'require-corp',
                'Cross-Origin-Resource-Policy': 'same-origin',
                'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
                'X-Permitted-Cross-Domain-Policies': 'none',
                'X-API-Version': apiVersion,
                'Cache-Control': 'no-store',
                'Content-Type': 'application/json',
                'X-Robots-Tag': 'noindex, nofollow',
                'Expect-CT': 'enforce, max-age=86400',
                ...(csp && {
                    'Content-Security-Policy': mode === 'prod' ? strictCSP : relaxedCSP
                }),
                ...(maskServerHeader && { 'Server': '' })
            };

            const corsHeaders: Record<string, string> = cors && isAllowedOrigin
                ? {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    ...(credentials && { 'Access-Control-Allow-Credentials': 'true' })
                }
                : {};

            // Optionally add ETag (mock hash for static resources)
            if (enableETag && request.method === 'GET') {
                // In practice, hash the content or use a caching layer
                set.headers['ETag'] = `"v-${apiVersion}-${requestId}"`;
                set.headers['Last-Modified'] = new Date().toUTCString();
            }

            Object.assign(set.headers, securityHeaders, corsHeaders);

            if (mode === 'dev') {
                set.headers['X-Dev-Mode'] = 'true';
            }

            // Bot detection (example only)
            const ua = request.headers.get('user-agent') || '';
            const botPattern = /\b(?:bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|discordbot|whatsapp|telegrambot|preview|python-requests|okhttp|go-http-client|axios|wget|curl|scrapy|postman)\b/i;

            if (botPattern.test(ua)) {
                set.headers['X-Bot-Detected'] = 'true';
            }
        },

        // Graceful error handler
        onError({ error, code, set, store }) {
            console.error(`Request ID ${store.requestId || '-'}:`, error);

            set.status = 500;
            set.headers = {
                'Content-Type': 'application/json',
                'X-Request-ID': store.requestId || 'unknown'
            };

            return {
                error: 'Internal Server Error',
                requestId: store.requestId || null
            };
        }
    });
}