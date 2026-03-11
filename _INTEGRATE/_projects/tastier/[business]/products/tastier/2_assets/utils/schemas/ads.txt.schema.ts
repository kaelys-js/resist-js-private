import {
    array,
    InferOutput,
    optional,
    parse,
    picklist,
    pipe,
    regex,
    strictObject,
    string,
} from "valibot";

import { RegExpSchema, type TextFileOutput, type UnicodeString } from "../../../0_config/src/utils/schemas/common.schema";

import { COMMENT_TOKENS, CONTROL_CHARACTERS, EMPTY_STRING } from "../../../0_config/src/utils/common/constants";

import { ERROR_MESSAGE_KEYS } from "./common.schema";

export const ADS_TXT_COMMENT_REGEX: RegExp = /^#.*$/
parse(RegExpSchema, ADS_TXT_COMMENT_REGEX)

export const AdsTxtCommentSchema = pipe(
    string(ERROR_MESSAGE_KEYS.ADS_TXT_COMMENT_NOT_STRING),
    regex(
        ADS_TXT_COMMENT_REGEX,
        ERROR_MESSAGE_KEYS.ADS_TXT_COMMENT_INVALID_FORMAT
    )
);

export type AdsTxtComment = InferOutput<typeof AdsTxtCommentSchema>;

export const ADS_TXT_AD_SYSTEM_DOMAIN_REGEX: RegExp = /^[a-z0-9.-]+\.[a-z]{2,}$/i;
parse(RegExpSchema, ADS_TXT_AD_SYSTEM_DOMAIN_REGEX)

export const ADS_TXT_PUBLISHER_ID_REGEX: RegExp = /^[A-Za-z0-9._-]+$/;
parse(RegExpSchema, ADS_TXT_PUBLISHER_ID_REGEX)

export const ADS_TXT_CERT_AUTH_ID_REGEX: RegExp = /^[A-Za-z0-9]+$/;
parse(RegExpSchema, ADS_TXT_CERT_AUTH_ID_REGEX)

export const ADS_TXT_RELATIONSHIP_VALUES: readonly ["DIRECT", "RESELLER"] = [
    "DIRECT",
    "RESELLER"
] as const;

export const AdsTxtAdSystemDomainSchema = pipe(
    string(ERROR_MESSAGE_KEYS.ADS_TXT_AD_SYSTEM_DOMAIN_NOT_STRING),
    regex(ADS_TXT_AD_SYSTEM_DOMAIN_REGEX, ERROR_MESSAGE_KEYS.ADS_TXT_AD_SYSTEM_DOMAIN_INVALID)
);

export type AdsTxtAdSystemDomain = InferOutput<typeof AdsTxtAdSystemDomainSchema>;

export const AdsTxtPublisherIdSchema = pipe(
    string(ERROR_MESSAGE_KEYS.ADS_TXT_PUBLISHER_ID_NOT_STRING),
    regex(ADS_TXT_PUBLISHER_ID_REGEX, ERROR_MESSAGE_KEYS.ADS_TXT_PUBLISHER_ID_INVALID)
);

export type AdsTxtPublisherId = InferOutput<typeof AdsTxtPublisherIdSchema>;

export const AdsTxtRelationshipSchema = picklist(
    ADS_TXT_RELATIONSHIP_VALUES,
    ERROR_MESSAGE_KEYS.ADS_TXT_RELATIONSHIP_INVALID
);

export type AdsTxtRelationship = InferOutput<typeof AdsTxtRelationshipSchema>;

export const AdsTxtCertificationAuthorityIdSchema = optional(
    pipe(
        string(ERROR_MESSAGE_KEYS.ADS_TXT_CERT_AUTH_ID_NOT_STRING),
        regex(
            ADS_TXT_CERT_AUTH_ID_REGEX,
            ERROR_MESSAGE_KEYS.ADS_TXT_CERT_AUTH_ID_INVALID
        )
    )
);

export type AdsTxtCertificationAuthorityId = InferOutput<typeof AdsTxtCertificationAuthorityIdSchema>;

export const AdsTxtEntrySchema = strictObject({
    adSystemDomain: AdsTxtAdSystemDomainSchema,
    publisherId: AdsTxtPublisherIdSchema,
    relationship: AdsTxtRelationshipSchema,
    certificationAuthorityId: AdsTxtCertificationAuthorityIdSchema,
}, ERROR_MESSAGE_KEYS.ADS_TXT_ENTRY_STRICT_OBJECT_INVALID);

export type AdsTxtEntry = InferOutput<typeof AdsTxtEntrySchema>;

export const AdsTxtHeaderSchema = array(AdsTxtCommentSchema, ERROR_MESSAGE_KEYS.ADS_TXT_HEADER_STRICT_OBJECT_INVALID);

export type AdsTxtHeader = InferOutput<typeof AdsTxtHeaderSchema>;

export const AdsTxtEntriesSchema = array(AdsTxtEntrySchema, ERROR_MESSAGE_KEYS.ADS_TXT_STRICT_OBJECT_VIOLATION);

export type AdsTxtEntries = InferOutput<typeof AdsTxtEntriesSchema>;

export const ADS_TXT_DATE_REGEX: RegExp = /^\d{4}-\d{2}-\d{2}$/;
parse(RegExpSchema, ADS_TXT_DATE_REGEX)

export const AdsTxtLastUpdatedSchema = pipe(
    string(ERROR_MESSAGE_KEYS.ADS_TXT_LAST_UPDATED_TYPE),
    regex(ADS_TXT_DATE_REGEX, ERROR_MESSAGE_KEYS.ADS_TXT_LAST_UPDATED_FORMAT)
);

export type AdsTxtLastUpdated = InferOutput<typeof AdsTxtLastUpdatedSchema>;

export const AdsTxtSchema = strictObject({
    header: AdsTxtHeaderSchema,
    entries: AdsTxtEntriesSchema,
    lastUpdated: AdsTxtLastUpdatedSchema,
}, ERROR_MESSAGE_KEYS.ADS_TXT_STRICT_OBJECT_INVALID);

export type AdsTxt = InferOutput<typeof AdsTxtSchema>;

export function adsTxtToText(data: AdsTxt): TextFileOutput {
    parse(AdsTxtSchema, data);

    const lines: UnicodeString[] = [];

    for (const comment of data.header) {
        lines.push(comment);
    }

    if (data.header.length > 0) {
        lines.push(EMPTY_STRING);
    }

    lines.push(`${COMMENT_TOKENS.LINE_HASH} Last updated: ${data.lastUpdated}`);
    lines.push(EMPTY_STRING);

    for (const entry of data.entries) {
        const parts: UnicodeString[] = [
            entry.adSystemDomain,
            entry.publisherId,
            entry.relationship,
        ];

        if (entry.certificationAuthorityId !== undefined) {
            parts.push(entry.certificationAuthorityId);
        }

        lines.push(parts.join(COMMENT_TOKENS.COMMA));
    }

    return `${lines.join(CONTROL_CHARACTERS.NEWLINE)}${CONTROL_CHARACTERS.NEWLINE}` as TextFileOutput;
}

export function output(config: AdsTxt): TextFileOutput {
    return adsTxtToText(config)
}