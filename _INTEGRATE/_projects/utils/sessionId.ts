export function generateSessionId() {
    // Best entropy source possible per environment
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    // Fallback for Node <16 or weird serverless runtimes
    try {
        const c = require("crypto");
        return c.randomUUID ? c.randomUUID() : c.randomBytes(16).toString("hex");
    } catch { }

    // Absolute last resort
    return (
        "sess-" +
        Math.random().toString(36).slice(2) +
        "-" +
        Date.now().toString(36)
    );
}

export function getRequestSessionId(req: any): string {
    // --- Cloudflare Worker / Fetch API ---
    if (req instanceof Request) {
        return (
            req.headers.get("x-session-id") ??
            req.headers.get("x-request-id") ??
            generateSessionId()
        );
    }

    // --- Bun / Elysia / Hono ---
    if (req?.headers?.get) {
        return (
            req.headers.get("x-session-id") ??
            req.headers.get("x-request-id") ??
            generateSessionId()
        );
    }

    // --- Express & Node HTTP ---
    if (req?.headers) {
        return (
            req.headers["x-session-id"] ??
            req.headers["x-request-id"] ??
            generateSessionId()
        );
    }

    // --- Fallback ---
    return generateSessionId();
}

export const PROCESS_SESSION_ID = (() => {
    return generateSessionId();
})();

export function getSessionInfo(req?: any) {
    const requestId = req ? getRequestSessionId(req) : null;

    return {
        processSessionId: PROCESS_SESSION_ID,
        requestSessionId: requestId,
        traceId: requestId ?? PROCESS_SESSION_ID,
        spanId: generateSessionId(), // used for sub-operations
        timestamp: Date.now()
    };
}