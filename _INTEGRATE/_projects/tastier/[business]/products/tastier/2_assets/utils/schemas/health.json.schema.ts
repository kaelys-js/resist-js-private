import {
    type InferOutput,
    parse,
    picklist,
    strictObject,
} from "valibot";

import {
    TimestampSchema,
    VersionSchema,
    CommitShortSchema,
    UptimeSecondsSchema,
    SchemaUrlJsonSchema,
} from "../../../0_config/src/utils/schemas/common.schema";

import { ERROR_MESSAGE_KEYS } from "./common.schema";

export const HEALTH_CHECK_STATE_VALUES: readonly [
    "fail",
    "maintenance",
    "pass",
    "warn",
    "unknown",
] = [
    "fail",
    "maintenance",
    "pass",
    "warn",
    "unknown",
] as const;

export const HealthCheckStateSchema = picklist(
    HEALTH_CHECK_STATE_VALUES,
    ERROR_MESSAGE_KEYS.HEALTH_JSON_CHECK_STATE_INVALID,
);

export type HealthCheckState = InferOutput<typeof HealthCheckStateSchema>;

export const HealthChecksSchema = strictObject(
    {
        self: HealthCheckStateSchema,
        api: HealthCheckStateSchema,
        analytics: HealthCheckStateSchema,
        assets: HealthCheckStateSchema,
        app: HealthCheckStateSchema,
        marketing: HealthCheckStateSchema,
    },
    ERROR_MESSAGE_KEYS.HEALTH_JSON_CHECKS_OBJECT_INVALID
)

export type HealthChecks = InferOutput<typeof HealthChecksSchema>

export const HealthJSONSchema = strictObject(
    {
        $schema: SchemaUrlJsonSchema,
        status: HealthCheckStateSchema,
        timestamp: TimestampSchema,
        checks: HealthChecksSchema,
        version: VersionSchema,
        commit: CommitShortSchema,
        uptimeSeconds: UptimeSecondsSchema,
    },
    ERROR_MESSAGE_KEYS.HEALTH_JSON_OBJECT
);

export type HealthJSON = InferOutput<typeof HealthJSONSchema>;

export function output(config: HealthJSON): HealthJSON {
    return parse(HealthJSONSchema, config)
}