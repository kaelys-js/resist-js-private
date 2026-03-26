import {
    array,
    InferOutput,
    literal,
    minLength,
    parse,
    picklist,
    pipe,
    regex,
    strictObject,
    string,
} from "valibot";

import { HttpsUrlSchema, NonNegativeIntegerSchema, RegExpSchema, type NonNegativeInteger } from "../../../../0_config/src/utils/schemas/common.schema";

import { ERROR_MESSAGE_KEYS } from "../common.schema";

export const TIMESTAMP_REGEX: RegExp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
parse(RegExpSchema, TIMESTAMP_REGEX)

export const TimestampSchema = pipe(
    string(ERROR_MESSAGE_KEYS.GPC_JSON_TIMESTAMP_TYPE),
    regex(TIMESTAMP_REGEX, ERROR_MESSAGE_KEYS.GPC_JSON_TIMESTAMP_FORMAT)
);

export const GPC_HONOR_VALUES: readonly ["sale", "sharing", "targeted_advertising"] = [
    "sale",
    "sharing",
    "targeted_advertising",
] as const;

export const GPCHonorSchema = picklist(
    GPC_HONOR_VALUES,
    ERROR_MESSAGE_KEYS.GPC_JSON_HONOR_INVALID
);

export type GPCHonor = InferOutput<typeof GPCHonorSchema>;

export const GPC_APPLIES_TO_VALUES: readonly ["api", "mobile_web", "web"] = [
    "api",
    "mobile_web",
    "web",
] as const;

export const GPCAppliesToSchema = picklist(
    GPC_APPLIES_TO_VALUES,
    ERROR_MESSAGE_KEYS.GPC_JSON_APPLIES_TO_INVALID
);

export type GPCAppliesTo = InferOutput<typeof GPCAppliesToSchema>;

export const GPC_SCOPE_GLOBAL: "global" = "global";

export const GPCScopeSchema = picklist(
    [GPC_SCOPE_GLOBAL],
    ERROR_MESSAGE_KEYS.GPC_JSON_SCOPE_INVALID
);

export type GPCScope = InferOutput<typeof GPCScopeSchema>;

export const MIN_GPC_HONORS: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, MIN_GPC_HONORS)

export const MIN_GPC_APPLIES_TO: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, MIN_GPC_APPLIES_TO)

export const GPCHonorsSchema = pipe(
    array(GPCHonorSchema, ERROR_MESSAGE_KEYS.GPC_JSON_HONORS_ARRAY_INVALID),
    minLength(MIN_GPC_HONORS, ERROR_MESSAGE_KEYS.GPC_JSON_HONORS_MIN_LENGTH)
);

export const GPCAppliesToListSchema = pipe(
    array(GPCAppliesToSchema, ERROR_MESSAGE_KEYS.GPC_JSON_APPLIES_TO_ARRAY_INVALID),
    minLength(MIN_GPC_APPLIES_TO, ERROR_MESSAGE_KEYS.GPC_JSON_APPLIES_TO_MIN_LENGTH)
);

export const GPCSchema = strictObject({
    $schema: HttpsUrlSchema,
    gpc: literal(true, ERROR_MESSAGE_KEYS.GPC_JSON_FLAG_TRUE),
    lastUpdated: TimestampSchema,
    honors: GPCHonorsSchema,
    appliesTo: GPCAppliesToListSchema,
    scope: GPCScopeSchema,
    policy: HttpsUrlSchema,
}, ERROR_MESSAGE_KEYS.GPC_JSON_STRICT_OBJECT);

export type GPC = InferOutput<typeof GPCSchema>;

export function output(config: GPC): GPC {
    return parse(GPCSchema, config)
} 