import {
    array,
    InferOutput,
    integer,
    minLength,
    minValue,
    number,
    parse,
    picklist,
    pipe,
    regex,
    strictObject,
    string,
} from "valibot";

import { NonNegativeIntegerSchema, RegExpSchema, type NonNegativeInteger, type TextFileOutput, type UnicodeString } from "../../../../0_config/src/utils/schemas/common.schema";

import { CONTROL_CHARACTERS } from "../../../../0_config/src/utils/common/constants";

import { ERROR_MESSAGE_KEYS } from "../common.schema";

export const MTA_STS_TXT_MX_REGEX: RegExp = /^(\*\.)?(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/
parse(RegExpSchema, MTA_STS_TXT_MX_REGEX)

export const MTA_STS_MX_SCHEMA = pipe(
    string(ERROR_MESSAGE_KEYS.MTA_STS_TXT_MX_EXPECTED_STRING),
    regex(
        MTA_STS_TXT_MX_REGEX,
        ERROR_MESSAGE_KEYS.MTA_STS_TXT_MX_INVALID_HOSTNAME
    )
);

export const MTA_STS_VERSION_VALUES: readonly ["STSv1"] = ["STSv1"] as const;

export const MTA_STS_MODE_VALUES: readonly ["enforce", "testing", "none"] = ["enforce", "testing", "none"] as const;

export const MTA_STS_MIN_MX_ENTRIES: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, MTA_STS_MIN_MX_ENTRIES)

export const MTA_STS_MIN_MAX_AGE: NonNegativeInteger = 0;
parse(NonNegativeIntegerSchema, MTA_STS_MIN_MAX_AGE)

export const MtaStsVersionSchema = picklist(
    MTA_STS_VERSION_VALUES,
    ERROR_MESSAGE_KEYS.MTA_STS_TXT_VERSION_INVALID
);

export const MtaStsModeSchema = picklist(
    MTA_STS_MODE_VALUES,
    ERROR_MESSAGE_KEYS.MTA_STS_TXT_MODE_INVALID
);

export const MTA_STS_MX_PATTERN_MIN_LENGTH: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, MTA_STS_MX_PATTERN_MIN_LENGTH)

export const MtaStsMxPatternSchema = pipe(
    string(ERROR_MESSAGE_KEYS.MTA_STS_TXT_MX_PATTERN_TYPE),
    minLength(MTA_STS_MX_PATTERN_MIN_LENGTH, ERROR_MESSAGE_KEYS.MTA_STS_TXT_MX_PATTERN_MIN_LENGTH)
);

export const MtaStsMxSchema = strictObject({
    pattern: MtaStsMxPatternSchema,
}, ERROR_MESSAGE_KEYS.MTA_STS_MX_STRICT_OBJECT_INVALID);

export const MtaStsMxListSchema = pipe(
    array(
        MtaStsMxSchema,
        ERROR_MESSAGE_KEYS.MTA_STS_TXT_MX_ARRAY_TYPE
    ),
    minLength(MTA_STS_MIN_MX_ENTRIES, ERROR_MESSAGE_KEYS.MTA_STS_TXT_MX_ARRAY_MIN_LENGTH)
);

export const MtaStsMaxAgeSchema = pipe(
    number(ERROR_MESSAGE_KEYS.MTA_STS_TXT_MAX_AGE_TYPE),
    integer(ERROR_MESSAGE_KEYS.MTA_STS_TXT_MAX_AGE_INTEGER),
    minValue(MTA_STS_MIN_MAX_AGE, ERROR_MESSAGE_KEYS.MTA_STS_TXT_MAX_AGE_MIN)
);

export const MtaStsSchema = strictObject({
    version: MtaStsVersionSchema,
    mode: MtaStsModeSchema,
    mx: MtaStsMxListSchema,
    maxAge: MtaStsMaxAgeSchema,
}, ERROR_MESSAGE_KEYS.MTA_STS_STRICT_OBJECT_INVALID);

export type MtaStsVersion = InferOutput<typeof MtaStsVersionSchema>;
export type MtaStsMode = InferOutput<typeof MtaStsModeSchema>;
export type MtaStsMxPattern = InferOutput<typeof MtaStsMxPatternSchema>;
export type MtaStsMx = InferOutput<typeof MtaStsMxSchema>;
export type MtaStsMxList = InferOutput<typeof MtaStsMxListSchema>;
export type MtaStsMaxAge = InferOutput<typeof MtaStsMaxAgeSchema>;
export type MtaSts = InferOutput<typeof MtaStsSchema>;

export function mtaStsToText(data: MtaSts): TextFileOutput {
    parse(MtaStsSchema, data)

    const lines: UnicodeString[] = [];

    const MTA_STS_TXT_CONSTANTS = Object.freeze({
        MaxAge: "max_age",
        Mode: "mode",
        MX: "mx",
        Version: "version",
    } as const);

    lines.push(`${MTA_STS_TXT_CONSTANTS.Version} ${data.version}`);
    lines.push(`${MTA_STS_TXT_CONSTANTS.Mode}: ${data.mode}`);

    for (const mx of data.mx) {
        lines.push(`${MTA_STS_TXT_CONSTANTS.MX}: ${mx}`);
    }

    lines.push(`${MTA_STS_TXT_CONSTANTS.MaxAge}: ${data.maxAge}`);

    return `${lines.join(CONTROL_CHARACTERS.NEWLINE)}${CONTROL_CHARACTERS.NEWLINE}` as TextFileOutput;
}

export function output(config: MtaSts): TextFileOutput {
    return mtaStsToText(config)
} 