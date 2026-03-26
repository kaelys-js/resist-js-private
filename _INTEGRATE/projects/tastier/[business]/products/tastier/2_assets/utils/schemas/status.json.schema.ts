import {
    array,
    type InferOutput,
    maxValue,
    minLength,
    minValue,
    nullable,
    number,
    optional,
    parse,
    picklist,
    pipe,
    record,
    regex,
    strictObject,
    string,
    uuid,
} from "valibot";

import { HttpsUrlSchema, NonNegativeIntegerSchema, RegExpSchema, type NonNegativeInteger } from "../../../0_config/src/utils/schemas/common.schema";

import { ERROR_MESSAGE_KEYS } from "./common.schema";

export const RFC_3339_UTC_TIMESTAMP_REGEX: RegExp =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
parse(RegExpSchema, RFC_3339_UTC_TIMESTAMP_REGEX)

export const StatusJSONTimestampSchema = pipe(
    string(ERROR_MESSAGE_KEYS.STATUS_JSON_TIMESTAMP_STRING_TYPE),
    regex(
        RFC_3339_UTC_TIMESTAMP_REGEX,
        ERROR_MESSAGE_KEYS.STATUS_JSON_TIMESTAMP_RFC_3339_UTC_FORMAT
    )
);

export type StatusJSONTimestamp = InferOutput<typeof StatusJSONTimestampSchema>;

export const StatusJSONSystemStatusSchema = picklist([
    "operational",
    "degraded",
    "partial_outage",
    "major_outage",
], ERROR_MESSAGE_KEYS.STATUS_JSON_SYSTEM_STATUS_STRICT_OBJECT_INVALID);

export type StatusJSONSystemStatus = InferOutput<typeof StatusJSONSystemStatusSchema>;

export const StatusJSONComponentStatusSchema = picklist([
    "operational",
    "degraded",
    "partial_outage",
    "major_outage",
], ERROR_MESSAGE_KEYS.STATUS_JSON_COMPONENT_STATUS_INVALID);

export type StatusJSONComponentStatus = InferOutput<typeof StatusJSONComponentStatusSchema>;

export const StatusJSONComponentIdSchema = picklist([
    "self",
    "app",
    "marketing",
    "images",
    "analytics",
    "api",
    "assets"
], ERROR_MESSAGE_KEYS.STATUS_JSON_COMPONENT_ID_STRICT_OBJECT_VIOLATION);

export type StatusJSONComponentId = InferOutput<typeof StatusJSONComponentIdSchema>;

export const StatusJSONIncidentStatusSchema = picklist([
    "investigating",
    "identified",
    "monitoring",
    "resolved",
], ERROR_MESSAGE_KEYS.STATUS_JSON_INCIDENT_STATUS_INVALID_VALUE);

export type StatusJSONIncidentStatus = InferOutput<typeof StatusJSONIncidentStatusSchema>;

export const StatusJSONImpactSchema = picklist([
    "none",
    "partial",
    "major",
], ERROR_MESSAGE_KEYS.STATUS_JSON_IMPACT_INVALID);

export type StatusJSONImpact = InferOutput<typeof StatusJSONImpactSchema>;

export const StatusJSONMaintenanceStatusSchema = picklist([
    "scheduled",
    "in_progress",
    "completed",
    "cancelled",
], ERROR_MESSAGE_KEYS.STATUS_JSON_MAINTENANCE_STATUS_INVALID);

export type StatusJSONMaintenanceStatus = InferOutput<typeof StatusJSONMaintenanceStatusSchema>;

export const LOCALE_REGEX: RegExp = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
parse(RegExpSchema, LOCALE_REGEX)

export const StatusJSONLocaleSchema = pipe(
    string(ERROR_MESSAGE_KEYS.STATUS_JSON_LOCALE_NOT_STRING),
    regex(
        LOCALE_REGEX,
        ERROR_MESSAGE_KEYS.STATUS_JSON_LOCALE_INVALID_FORMAT
    )
);

export type StatusJSONLocale = InferOutput<typeof StatusJSONLocaleSchema>;

export const StatusJSONLocalizedTextSchema = record(
    StatusJSONLocaleSchema,
    string(ERROR_MESSAGE_KEYS.STATUS_JSON_LOCALIZED_TEXT_VALUE_INVALID),
    ERROR_MESSAGE_KEYS.STATUS_JSON_LOCALIZED_TEXT_RECORD_INVALID,
);

export type StatusJSONLocalizedText = InferOutput<typeof StatusJSONLocalizedTextSchema>;

export const StatusJSONIncidentUpdateSchema = strictObject({
    timestamp: StatusJSONTimestampSchema,
    status: StatusJSONIncidentStatusSchema,
    message: StatusJSONLocalizedTextSchema,
}, ERROR_MESSAGE_KEYS.STATUS_JSON_INCIDENT_UPDATE_SCHEMA_INVALID);

export type StatusJSONIncidentUpdate = InferOutput<typeof StatusJSONIncidentUpdateSchema>;

export const MIN_COMPONENT_COUNT: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, MIN_COMPONENT_COUNT)

export const StatusJSONIncidentIdSchema = pipe(
    string(ERROR_MESSAGE_KEYS.STATUS_JSON_INCIDENT_ID_INVALID_TYPE),
    uuid(ERROR_MESSAGE_KEYS.STATUS_JSON_INCIDENT_ID_INVALID_UUID)
);

export const StatusJSONIncidentComponentsSchema = pipe(
    array(StatusJSONComponentIdSchema),
    minLength(
        MIN_COMPONENT_COUNT,
        ERROR_MESSAGE_KEYS.STATUS_JSON_INCIDENT_COMPONENTS_MIN_LENGTH
    )
);

export const StatusJSONIncidentUpdatesSchema = array(
    StatusJSONIncidentUpdateSchema,
    ERROR_MESSAGE_KEYS.STATUS_JSON_INCIDENT_UPDATES_INVALID_TYPE
);

export type StatusJSONIncidentId = InferOutput<typeof StatusJSONIncidentIdSchema>;

export type StatusJSONIncidentComponents = InferOutput<
    typeof StatusJSONIncidentComponentsSchema
>;

export type StatusJSONIncidentUpdates = InferOutput<
    typeof StatusJSONIncidentUpdatesSchema
>;

export const StatusJSONIncidentSchema = strictObject(
    {
        id: StatusJSONIncidentIdSchema,
        status: StatusJSONIncidentStatusSchema,
        impact: StatusJSONImpactSchema,
        components: StatusJSONIncidentComponentsSchema,
        startedAt: StatusJSONTimestampSchema,
        updatedAt: StatusJSONTimestampSchema,
        resolvedAt: optional(StatusJSONTimestampSchema),
        description: StatusJSONLocalizedTextSchema,
        updates: StatusJSONIncidentUpdatesSchema
    },
    ERROR_MESSAGE_KEYS.STATUS_JSON_INCIDENT_STRICT_OBJECT_VIOLATION
);

export type StatusJSONIncident = InferOutput<typeof StatusJSONIncidentSchema>;

export const StatusJSONMaintenanceUpdateSchema = strictObject({
    timestamp: StatusJSONTimestampSchema,
    status: StatusJSONMaintenanceStatusSchema,
    message: StatusJSONLocalizedTextSchema,
}, ERROR_MESSAGE_KEYS.STATUS_JSON_MAINTENANCE_UPDATE_STRICT_OBJECT_INVALID);

export const MIN_COMPONENTS: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, MIN_COMPONENTS)

export const StatusJSONMaintenanceIdSchema = string(
    ERROR_MESSAGE_KEYS.STATUS_JSON_MAINTENANCE_ID_REQUIRED
);

export type StatusJSONMaintenanceId = InferOutput<typeof StatusJSONMaintenanceIdSchema>;

export const StatusJSONMaintenanceComponentsSchema = pipe(
    array(StatusJSONComponentIdSchema),
    minLength(
        MIN_COMPONENTS,
        ERROR_MESSAGE_KEYS.STATUS_JSON_MAINTENANCE_COMPONENTS_MIN_LENGTH
    )
);

export type StatusJSONMaintenanceComponents = InferOutput<typeof StatusJSONMaintenanceComponentsSchema>;

export const StatusJSONMaintenanceStartedAtSchema = nullable(
    StatusJSONTimestampSchema
);

export type StatusJSONMaintenanceStartedAt = InferOutput<typeof StatusJSONMaintenanceStartedAtSchema>;

export const StatusJSONMaintenanceCompletedAtSchema = nullable(
    StatusJSONTimestampSchema
);

export type StatusJSONMaintenanceCompletedAt = InferOutput<typeof StatusJSONMaintenanceCompletedAtSchema>;

export const StatusJSONMaintenanceUpdatesSchema = array(
    StatusJSONMaintenanceUpdateSchema,
    ERROR_MESSAGE_KEYS.STATUS_JSON_MAINTENANCE_UPDATES_INVALID
);

export type StatusJSONMaintenanceUpdates = InferOutput<typeof StatusJSONMaintenanceUpdatesSchema>;

export const StatusJSONMaintenanceSchema = strictObject(
    {
        id: StatusJSONMaintenanceIdSchema,
        status: StatusJSONMaintenanceStatusSchema,
        impact: StatusJSONImpactSchema,
        components: StatusJSONMaintenanceComponentsSchema,
        scheduledStart: StatusJSONTimestampSchema,
        scheduledEnd: StatusJSONTimestampSchema,
        startedAt: StatusJSONMaintenanceStartedAtSchema,
        completedAt: StatusJSONMaintenanceCompletedAtSchema,
        description: StatusJSONLocalizedTextSchema,
        updates: StatusJSONMaintenanceUpdatesSchema
    },
    ERROR_MESSAGE_KEYS.STATUS_JSON_MAINTENANCE_STRICT_OBJECT
);

export type StatusJSONMaintenance = InferOutput<typeof StatusJSONMaintenanceSchema>;

export const StatusJSONComponentsSchema = strictObject({
    self: StatusJSONComponentStatusSchema,
    app: StatusJSONComponentStatusSchema,
    marketing: StatusJSONComponentStatusSchema,
    images: StatusJSONComponentStatusSchema,
    analytics: StatusJSONComponentStatusSchema,
    api: StatusJSONComponentStatusSchema,
}, ERROR_MESSAGE_KEYS.STATUS_JSON_COMPONENTS_STRICT_OBJECT_INVALID);

export type StatusJSONComponents = InferOutput<typeof StatusJSONComponentsSchema>;

export const UPTIME_PERCENTAGE_MIN_VALUE: number = 0;
parse(NonNegativeIntegerSchema, UPTIME_PERCENTAGE_MIN_VALUE)

export const UPTIME_PERCENTAGE_MAX_VALUE: number = 100;
parse(NonNegativeIntegerSchema, UPTIME_PERCENTAGE_MAX_VALUE)

export const StatusJSONUptimePercentageSchema = pipe(
    number(ERROR_MESSAGE_KEYS.STATUS_JSON_UPTIME_PERCENTAGE_TYPE),
    minValue(UPTIME_PERCENTAGE_MIN_VALUE, ERROR_MESSAGE_KEYS.STATUS_JSON_UPTIME_PERCENTAGE_MIN),
    maxValue(UPTIME_PERCENTAGE_MAX_VALUE, ERROR_MESSAGE_KEYS.STATUS_JSON_UPTIME_PERCENTAGE_MAX)
);

export type StatusJSONUptimePercentage = InferOutput<typeof StatusJSONUptimePercentageSchema>;

export const StatusJSONUptimeSchema = strictObject({
    last24h: StatusJSONUptimePercentageSchema,
    last7d: StatusJSONUptimePercentageSchema,
    last30d: StatusJSONUptimePercentageSchema,
}, ERROR_MESSAGE_KEYS.STATUS_JSON_UPTIME_STRICT_OBJECT_INVALID);

export type StatusJSONUptime = InferOutput<typeof StatusJSONUptimeSchema>;

export const StatusJSONIncidentsArraySchema = array(
    StatusJSONIncidentSchema,
    ERROR_MESSAGE_KEYS.STATUS_JSON_INCIDENTS_ARRAY_INVALID
);

export type StatusJSONIncidentsArray = InferOutput<typeof StatusJSONIncidentsArraySchema>;

export const StatusJSONMaintenanceArraySchema = array(
    StatusJSONMaintenanceSchema,
    ERROR_MESSAGE_KEYS.STATUS_JSON_MAINTENANCE_ARRAY_INVALID
);

export type StatusJSONMaintenanceArray = InferOutput<typeof StatusJSONMaintenanceArraySchema>;

export const StatusJSONStatusSchema = strictObject({
    $schema: HttpsUrlSchema,
    status: StatusJSONSystemStatusSchema,

    components: StatusJSONComponentsSchema,

    incidents: StatusJSONIncidentsArraySchema,
    maintenance: StatusJSONMaintenanceArraySchema,
    uptime: StatusJSONUptimeSchema,
    statusPage: HttpsUrlSchema,
    support: HttpsUrlSchema,
    lastUpdated: StatusJSONTimestampSchema,
}, ERROR_MESSAGE_KEYS.STATUS_JSON_STATUS_STRICT_OBJECT_INVALID)

export type StatusJSONStatus = InferOutput<typeof StatusJSONStatusSchema>;

export function output(config: StatusJSONStatus): StatusJSONStatus {
    return parse(StatusJSONStatusSchema, config)
}