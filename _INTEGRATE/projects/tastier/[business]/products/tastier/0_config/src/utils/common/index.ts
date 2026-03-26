// TODO: Alias Imports
import z from "zod";

import { parse, safeParse, type BaseSchema, type InferOutput, type SafeParseResult } from "valibot";

import { COMMENT_TOKENS, GLOBAL_ERROR_CONTEXT_SCHEMA_VERSION, HEADER_CACHE_CONTROL_FAILURE_VALUES, HEADER_EXPIRES_VALUES, HEADER_PRAGMA_VALUES, HEADER_REFERRER_POLICY_VALUES, HEADER_VARY_VALUES, HEADER_X_CONTENT_TYPE_OPTIONS_VALUES, HEADER_X_FRAME_OPTIONS_VALUES, HEADER_X_ROBOTS_TAG_VALUES, HTTP_HEADERS, HTTP_MIME_TYPES, HTTP_MIME_TYPES_CHARSETS, HTTP_STATUS_CODES, HTTP_STATUS_LINES, SEVERITY } from "./constants";

import {
    type Anything,
    type AppErrorInput,
    ERROR_MESSAGE_KEYS,
    type ErrorPhase,
    type ExecutionContext,
    type FailureHeaders,
    type GlobalErrorContext,
    type NonNegativeInteger,
    type NormalizedIssue,
    type Pathname,
    type RequestId,
    type ResponseHeaders,
    type ResponseHeadersIn,
    type ResponseHeadersInput,
    type SecurityHeaders,
    type ServerTimingHeader,
    type SpanTimer,
    type SpanTimerDuration,
    type SpanTimerPhase,
    Timestamp,
    TimestampSchema,
    type ValibotIssueLike,
    type Void,
    appErrorInputSchema,
    baseErrorContextSchema,
    executionContextSchema,
    failureHeadersSchema,
    pathnameSchema,
    responseHeadersInputSchema,
    responseHeadersSchema,
    securityHeadersSchema,
    spanTimerPhaseSchema,
    spanTimerSchema
} from "../schemas/common.schema";

import { globalConfigSchema, type GlobalConfig } from "../schemas/config.schema.json"

export function getGlobalConfig(): Readonly<GlobalConfig> {
    return Object.freeze(parse(globalConfigSchema, <GlobalConfig>{
        // TODO: Implement
    }))
}

export function getExecutionContext(
    request: Request,
): Readonly<ExecutionContext> {
    return Object.freeze(z.parse(executionContextSchema, <ExecutionContext>{
        request,
        spanTimer: createSpanTimer()
    }));
}

export function getISOTimestamp(): Timestamp {
    return parse(TimestampSchema, new Date().toISOString())
}

export function getGlobalErrorContext(ctx: ExecutionContext | Request): Readonly<GlobalErrorContext> {
    if (!(ctx instanceof Request)) {
        z.parse(executionContextSchema, ctx)
    }
    // @ts-expect-error OK.
    const request: Request = ctx.request ?? ctx

    const { owner, runtime, environment, serviceName, serviceVersion, deploymentId }: GlobalConfig = getGlobalConfig()

    return Object.freeze(parse(baseErrorContextSchema, <GlobalErrorContext>{
        runtime,
        environment,
        serviceName,
        serviceVersion,
        deploymentId,
        severity: SEVERITY.ERROR,
        timestamp: getISOTimestamp(),
        schemaVersion: GLOBAL_ERROR_CONTEXT_SCHEMA_VERSION.CURRENT,
        correlationId: getCorrelationId(request),
        owner,
    }))
}

export function getRequestPathname(request: Request): Pathname {
    return parse(pathnameSchema, <Pathname>new URL(request.url).pathname);
}

export function getCorrelationId(request: Request): RequestId {
    return request.headers.get(HTTP_HEADERS.CF_RAY) ?? crypto.randomUUID()
}

export function generateRequestId(): RequestId {
    return crypto.randomUUID();
}

export function createSpanTimer(): SpanTimer {
    const active: Map<SpanTimerPhase, SpanTimerDuration> = new Map();

    const completed: Map<SpanTimerPhase, NonNegativeInteger> = new Map();

    function markStart(phase: SpanTimerPhase): SpanTimerDuration {
        parse(spanTimerPhaseSchema, phase)

        if (active.has(phase) === true) {
            throw new Error(
                ERROR_MESSAGE_KEYS.SPAN_TIMER_PHASE_ALREADY_STARTED.replace('{{phase}}', phase)
            );
        }

        const start: SpanTimerDuration = performance.now()

        active.set(phase, start);

        return start;
    }

    function markEnd(phase: SpanTimerPhase): Void {
        parse(spanTimerPhaseSchema, phase)

        const recordedStart: SpanTimerDuration | undefined = active.get(phase);

        if (recordedStart === undefined) {
            throw new Error(
                ERROR_MESSAGE_KEYS.SPAN_TIMER_PHASE_NOT_STARTED.replace('{{phase}}', phase)
            );
        }

        const duration: SpanTimerDuration = performance.now() - recordedStart;

        active.delete(phase);
        completed.set(phase, duration);
    }

    function toServerTimingHeader(): ServerTimingHeader {
        if (active.size > 0) {
            const unfinished: SpanTimerPhase = [...active.keys()].join(COMMENT_TOKENS.COMMA);

            throw new Error(
                ERROR_MESSAGE_KEYS.SPAN_TIMER_PHASES_INCOMPLETE.replace('{{unfinished}}', unfinished)
            );
        }

        return [...completed.entries()]
            .map(([phase, duration]: [SpanTimerPhase, SpanTimerDuration]) => {
                return `${phase};dur=${duration.toFixed(2)}`
            })
            .join(COMMENT_TOKENS.COMMA);
    }

    return Object.freeze(z.parse(spanTimerSchema, <SpanTimer>{
        markStart,
        markEnd,
        toServerTimingHeader
    }));
}

export function normalizeIssues(
    input: unknown,
    messageFallback: string = "Application error"
): readonly NormalizedIssue[] {
    if (Array.isArray(input) === true && input.every(isValibotIssue) === true) {
        return input.map((issue) => {
            return (<NormalizedIssue>{
                kind: "validation",
                message: String(issue.message ?? "Validation failed"),
                path: issue.path
            })
        });
    }

    if (input instanceof Error) {
        return [{
            kind: "exception",
            message: input.message || messageFallback,
            code: input.name
        }];
    }

    if (input !== undefined) {
        return [{
            kind: "runtime",
            message: "Non-Error value thrown"
        }];
    }

    return [{
        kind: "domain",
        message: messageFallback
    }];
}

function isValibotIssue(value: unknown): value is ValibotIssueLike {
    return (
        typeof value === "object" &&
        value !== null &&
        "message" in value &&
        "path" in value
    );
}

export class AppError extends Error {
    readonly phase: ErrorPhase;
    readonly issues: readonly NormalizedIssue[];
    readonly cause?: unknown;

    constructor(parameters: AppErrorInput) {
        parse(appErrorInputSchema, parameters)

        const { cause, issues, message = "Application error", phase }: AppErrorInput = parameters

        super(message, {
            cause
        });

        this.name = "AppError";
        this.phase = phase;
        this.cause = cause;
        this.issues =
            issues !== undefined
                ? normalizeIssues(issues, message)
                : normalizeIssues(cause, message);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }
}

export function validateInput<
    S extends BaseSchema<Anything, Anything, Anything>
>(
    schema: S,
    input: unknown,
    phase: ErrorPhase
): Readonly<InferOutput<S>> {
    const result: SafeParseResult<S> = safeParse(schema, input);

    if (result.success === false) {
        throw new AppError({ phase, cause: result.issues });
    }

    return result.output;
}

export function captureException(
    ctx: ExecutionContext | Request,
    error: AppError
): Void {
    console.error(error.message, {
        error,
        ...getGlobalErrorContext(ctx)
    });
}

export function getStandardSecurityResponseHeaders(request: Request): HeadersInit {
    const headers: SecurityHeaders = parse(securityHeadersSchema, <SecurityHeaders>{
        X_CONTENT_TYPE_OPTIONS: HEADER_X_CONTENT_TYPE_OPTIONS_VALUES.NOSNIFF,
        X_FRAME_OPTIONS: HEADER_X_FRAME_OPTIONS_VALUES.DENY,
        REFERRER_POLICY: HEADER_REFERRER_POLICY_VALUES.NO_REFERRER,
        X_REQUEST_ID: generateRequestId(),
        X_CORRELATION_ID: getCorrelationId(request)
    })

    return Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [
            HTTP_HEADERS[key as keyof typeof HTTP_HEADERS],
            value
        ])
    );
}

export function getStandardFailureResponseHeaders(request: Request): HeadersInit {
    const headers: FailureHeaders = parse(failureHeadersSchema, <FailureHeaders>{
        ...getStandardSecurityResponseHeaders(request),

        CONTENT_TYPE: `${HTTP_MIME_TYPES.TEXT_PLAIN}${HTTP_MIME_TYPES_CHARSETS.UTF_8}`,
        CACHE_CONTROL: HEADER_CACHE_CONTROL_FAILURE_VALUES.DEFAULT,
        PRAGMA: HEADER_PRAGMA_VALUES.NO_CACHE,
        EXPIRES: HEADER_EXPIRES_VALUES.ZERO,
        X_ROBOTS_TAG: `${HEADER_X_ROBOTS_TAG_VALUES.NO_INDEX}${COMMENT_TOKENS.COMMA}${HEADER_X_ROBOTS_TAG_VALUES.NO_FOLLOW}`,
    })

    return Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [
            HTTP_HEADERS[key as keyof typeof HTTP_HEADERS],
            value
        ])
    );
}

export function failureResponse(request: Request): Response {
    return new Response(`${HTTP_STATUS_LINES.INTERNAL_SERVER_ERROR}: ${getCorrelationId(request)}`, {
        status: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        headers: getStandardFailureResponseHeaders(request)
    });
}

export function getResponseHeaders(parameters: ResponseHeadersInput): HeadersInit {
    const { type, cacheTtl, contentLength }: ResponseHeadersInput = parse(responseHeadersInputSchema, parameters)

    const headers: ResponseHeaders = parse(responseHeadersSchema, <ResponseHeadersIn>{
        CONTENT_TYPE: type,
        CACHE_CONTROL: cacheTtl,
        VARY: HEADER_VARY_VALUES.ACCEPT_ENCODING,
        CONTENT_LENGTH: contentLength
    })

    return Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [
            HTTP_HEADERS[key as keyof typeof HTTP_HEADERS],
            value
        ])
    );
}