export async function collectRequestInfo(input: any): Promise<any> {
    try {
        const req = normalizeRequest(input);
        const env = typeof process !== "undefined" ? process.env : {};

        return {
            timestamp: Date.now(),

            /* ============================================================
               BASIC REQUEST INFO
            ============================================================ */
            method: req.method ?? null,
            url: req.url ?? null,
            path: safePath(req.url),
            query: parseQuery(req.url),

            /* ============================================================
               HEADERS
            ============================================================ */
            headers: req.headers ? Object.fromEntries(req.headers.entries()) : {},

            /* ============================================================
               IP / GEO / NETWORK (best effort)
            ============================================================ */
            ip: detectIP(req, env),
            geo: detectGeo(req),
            forwarded: detectForwardHeaders(req),

            /* ============================================================
               RUNTIME DETECTION
            ============================================================ */
            runtime: detectRuntime(env),
            server: detectServerFramework(input),
            container: detectContainer(env),
            cloud: detectCloud(env),

            /* ============================================================
               BODY (safe snapshot, non-streaming)
            ============================================================ */
            body: await safeBody(req),

            /* ============================================================
               PERFORMANCE (Cloudflare / Workers)
            ============================================================ */
            cf: detectCloudflareCF(req),

            /* ============================================================
               TLS / SECURITY (best effort)
            ============================================================ */
            security: detectSecurity(input, req),

            /* ============================================================
               COOKIES
            ============================================================ */
            cookies: parseCookies(req),

            /* ============================================================
               CONTENT NEGOTIATION
            ============================================================ */
            accepts: detectAccept(req),

            /* ============================================================
               USER AGENT BREAKDOWN
            ============================================================ */
            userAgent: detectUserAgent(req),

            /* ============================================================
               PROXY / CDN DETECTION
            ============================================================ */
            cdn: detectCDN(req),

            /* ============================================================
               SESSION-LIKE SIGNALS
            ============================================================ */
            session: detectSession(req),

            /* ============================================================
               REQUEST SIZE + LIMITS
            ============================================================ */
            size: detectSize(req)
        };

    } catch (err: any) {
        return {
            ok: false,
            error: {
                message: err?.message || "Unknown error",
                stack: err?.stack
            }
        };
    }
}


function normalizeRequest(input: any) {
    // Cloudflare Worker / Fetch API
    if (input instanceof Request) return input;

    // Hono context
    if (input?.req?.raw instanceof Request) return input.req.raw;

    // Node.js IncomingMessage
    if (input?.headers && input?.method) {
        const url = input.url?.startsWith("http")
            ? input.url
            : `http://${input.headers.host || "localhost"}${input.url}`;

        const headers = new Headers(
            Object.entries(input.headers)
                .map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v || ""])
        );

        return new Request(url, {
            method: input.method,
            headers,
            body: input.body
        });
    }

    // Bun server request
    if (input?.method && input?.url && input?.headers?.get) return input;

    throw new Error("Unsupported request type");
}
function safePath(url?: string) {
    try { return new URL(url!).pathname; }
    catch { return null; }
}

function parseQuery(url?: string) {
    try {
        const u = new URL(url!);
        return Object.fromEntries(u.searchParams.entries());
    } catch { return {}; }
}

async function safeBody(req: Request) {
    try {
        const type = req.headers.get("content-type") || "";
        if (type.includes("application/json"))
            return await req.clone().json().catch(() => null);
        if (type.includes("x-www-form-urlencoded"))
            return Object.fromEntries(await req.clone().formData());
        if (type.includes("text"))
            return await req.clone().text();
        return null;
    } catch { return null; }
}

function parseCookies(req: Request) {
    const cookie = req.headers.get("cookie");
    if (!cookie) return {};
    return Object.fromEntries(cookie.split(";").map(c => {
        const [k, v] = c.trim().split("=");
        return [k, decodeURIComponent(v || "")];
    }));
}
function detectIP(req: Request, env: any) {
    const h = req.headers;

    return (
        h.get("cf-connecting-ip") ||
        h.get("x-real-ip") ||
        h.get("x-client-ip") ||
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        env.USER_IP ||
        null
    );
}
function detectGeo(req: Request) {
    const h = req.headers;

    return {
        country: h.get("cf-ipcountry") ||
            h.get("x-vercel-ip-country") ||
            h.get("x-country") ||
            null,
        city: h.get("cf-ipcity") || null,
        region: h.get("cf-region") || null,
        continent: h.get("cf-continent") || null,
        lat: h.get("cf-latitude") || null,
        lon: h.get("cf-longitude") || null,
        postal: h.get("cf-postal-code") || null,
        colo: h.get("cf-ray") || null
    };
}

function detectForwardHeaders(req: Request) {
    const h = req.headers;

    return {
        forwarded: h.get("forwarded") || null,
        via: h.get("via") || null,
        forwardedFor: h.get("x-forwarded-for") || null,
        forwardedHost: h.get("x-forwarded-host") || null,
        forwardedProto: h.get("x-forwarded-proto") || null,
    };
}

function detectCloudflareCF(req: any) {
    const cf = req.cf;
    if (!cf) return null;
    return {
        city: cf.city,
        country: cf.country,
        colo: cf.colo,
        region: cf.region,
        timezone: cf.timezone,
        latitude: cf.latitude,
        longitude: cf.longitude,
        botScore: cf.botManagement?.score ?? null
    };
}

function detectRuntime(env: any) {
    if (typeof Bun !== "undefined") return "bun";
    if (typeof Deno !== "undefined") return "deno";
    if (env.WORKERS_RUNTIME || typeof caches !== "undefined") return "cloudflare-worker";
    if (env.AWS_LAMBDA_FUNCTION_NAME) return "aws-lambda";
    if (env.VERCEL) return "vercel";
    if (env.NETLIFY) return "netlify";
    if (env.GOOGLE_CLOUD_PROJECT) return "gcp";
    if (env.AZURE_FUNCTIONS_ENVIRONMENT) return "azure-functions";
    if (process?.versions?.node) return "node";
    return "unknown";
}

function detectServerFramework(input: any) {
    if (input?.constructor?.name === "HonoRequest") return "hono";
    if (input?.req?.raw instanceof Request) return "hono";
    if (input?.originalUrl !== undefined && input?.res) return "express";
    if (input?.server?.server?.fastify) return "fastify";
    if (input?._validationError) return "nest";
    if (input?.env?.Bindings) return "cloudflare-stack";
    return "unknown";
}

function detectContainer(env: any) {
    return {
        docker: !!env.DOCKER_CONTAINER || !!env.CONTAINER || false,
        k8s: !!env.KUBERNETES_SERVICE_HOST,
        pod: env.HOSTNAME ?? null
    };
}
function detectCloud(env: any) {
    return {
        aws: !!env.AWS_LAMBDA_FUNCTION_NAME,
        gcp: !!env.GOOGLE_CLOUD_PROJECT,
        azure: !!env.AZURE_FUNCTIONS_ENVIRONMENT,
        vercel: !!env.VERCEL,
        netlify: !!env.NETLIFY,
        render: !!env.RENDER,
        flyio: !!env.FLY_APP_NAME,
        cloudflare: !!env.WORKERS_RUNTIME || !!env.CF_PAGES
    };
}

function detectSecurity(input: any, req: Request) {
    const h = req.headers;
    return {
        https: req.url?.startsWith("https"),
        hsts: h.get("strict-transport-security") || null,
        csp: h.get("content-security-policy") || null,
        referrerPolicy: h.get("referrer-policy") || null
    };
}

function detectAccept(req: Request) {
    const h = req.headers;
    return {
        accept: h.get("accept"),
        language: h.get("accept-language"),
        encoding: h.get("accept-encoding"),
        charset: h.get("accept-charset")
    };
}

function detectUserAgent(req: Request) {
    const ua = req.headers.get("user-agent") || "";
    return { raw: ua };
}

function detectCDN(req: Request) {
    const h = req.headers;

    return {
        cloudflare: !!h.get("cf-ray"),
        vercel: !!h.get("x-vercel-id"),
        fastly: !!h.get("fastly-debug-digest"),
        akamai: !!h.get("akamai-origin-hop"),
        cloudfront: !!h.get("x-amz-cf-id")
    };
}

function detectSession(req: Request) {
    const cookie = req.headers.get("cookie") || "";
    return {
        hasSessionCookie: /session|sid|token|auth/i.test(cookie),
        raw: cookie
    };
}

function detectSize(req: Request) {
    const ct = req.headers.get("content-length");
    return {
        contentLength: ct ? Number(ct) : null
    };
}