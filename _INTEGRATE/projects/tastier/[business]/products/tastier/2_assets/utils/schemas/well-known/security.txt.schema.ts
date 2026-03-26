import {
    array,
    check,
    InferOutput,
    minLength,
    parse,
    pipe,
    regex,
    strictObject,
    string,
} from "valibot";

import { HttpsUrlSchema, NonNegativeIntegerSchema, RegExpSchema, type NonNegativeInteger, type TextFileOutput, type UnicodeString } from "../../../../0_config/src/utils/schemas/common.schema";

import { COMMENT_TOKENS, CONTROL_CHARACTERS } from "../../../../0_config/src/utils/common/constants";

import { ERROR_MESSAGE_KEYS } from "../common.schema";

export const MAILTO_REGEX: RegExp = /^mailto:[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
parse(RegExpSchema, MAILTO_REGEX)

export const SecurityTxtMailtoSchema = pipe(
    string(ERROR_MESSAGE_KEYS.SECURITY_TXT_MAILTO_TYPE_INVALID),
    regex(MAILTO_REGEX, ERROR_MESSAGE_KEYS.SECURITY_TXT_MAILTO_FORMAT_INVALID)
);

export type SecurityTxtMailto = InferOutput<typeof SecurityTxtMailtoSchema>;

export const SECURITY_CONTACT_REGEX = /^(mailto:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|https:\/\/\S+)$/;
parse(RegExpSchema, SECURITY_CONTACT_REGEX)

export const SecurityTxtContactSchema = pipe(
    string(ERROR_MESSAGE_KEYS.SECURITY_TXT_CONTACT_EXPECTED_STRING),
    regex(
        SECURITY_CONTACT_REGEX,
        ERROR_MESSAGE_KEYS.SECURITY_TXT_CONTACT_INVALID_FORMAT
    )
);

export type SecurityTxtContact = InferOutput<typeof SecurityTxtContactSchema>;

export const LANGUAGE_TAG_REGEX: RegExp = /^[A-Za-z]{2,3}(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|\d{3}))?(?:-[A-Za-z0-9]{5,8})*$/;
parse(RegExpSchema, LANGUAGE_TAG_REGEX)

export const SecurityTxtLanguageTagSchema = pipe(
    string(ERROR_MESSAGE_KEYS.SECURITY_TXT_LANGUAGE_TAG_NOT_STRING),
    regex(
        LANGUAGE_TAG_REGEX,
        ERROR_MESSAGE_KEYS.SECURITY_TXT_LANGUAGE_TAG_INVALID_FORMAT
    )
);

export type SecurityTxtLanguageTag = InferOutput<typeof SecurityTxtLanguageTagSchema>;

export const TIMESTAMP_REGEX: RegExp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
parse(RegExpSchema, TIMESTAMP_REGEX)

export const SecurityTxtTimestampSchema = pipe(
    string(ERROR_MESSAGE_KEYS.SECURITY_TXT_TIMESTAMP_NOT_STRING),
    regex(
        TIMESTAMP_REGEX,
        ERROR_MESSAGE_KEYS.SECURITY_TXT_TIMESTAMP_INVALID_RFC3339_UTC
    )
);

export type SecurityTxtTimestamp = InferOutput<typeof SecurityTxtTimestampSchema>;

export const SECURITY_TXT_CANONICAL_REGEX: RegExp = /^https:\/\/[^?#]+\/\.well-known\/security\.txt$/;
parse(RegExpSchema, SECURITY_TXT_CANONICAL_REGEX)

export const SecurityTxtCanonicalSchema = pipe(
    HttpsUrlSchema,
    regex(
        SECURITY_TXT_CANONICAL_REGEX,
        ERROR_MESSAGE_KEYS.SECURITY_TXT_CANONICAL_URL
    )
);

export type SecurityTxtCanonical = InferOutput<typeof SecurityTxtCanonicalSchema>;

export const MIN_REQUIRED_ENTRIES: NonNegativeInteger = 1;
parse(NonNegativeIntegerSchema, MIN_REQUIRED_ENTRIES)

export const SecurityTxtSchema = pipe(
    strictObject({
        contact: pipe(
            array(SecurityTxtContactSchema),
            minLength(MIN_REQUIRED_ENTRIES, ERROR_MESSAGE_KEYS.SECURITY_TXT_CONTACT_MIN_LENGTH)
        ),
        canonical: SecurityTxtCanonicalSchema,
        preferredLanguages: pipe(
            array(SecurityTxtLanguageTagSchema),
            minLength(MIN_REQUIRED_ENTRIES, ERROR_MESSAGE_KEYS.SECURITY_TXT_PREFERRED_LANGUAGES_MIN_LENGTH)
        ),
        policy: HttpsUrlSchema,
        encryption: HttpsUrlSchema,
        acknowledgments: HttpsUrlSchema,
        hiring: HttpsUrlSchema,
        expires: SecurityTxtTimestampSchema,
    }, ERROR_MESSAGE_KEYS.SECURITY_TXT_STRICT_OBJECT_INVALID),
    check(
        (value): boolean => {
            const expiresMs: NonNegativeInteger = Date.parse(value.expires);
            const nowMs: NonNegativeInteger = Date.now();

            return Number.isNaN(expiresMs) === false && expiresMs > nowMs;
        },
        ERROR_MESSAGE_KEYS.SECURITY_TXT_EXPIRES_FUTURE_UTC
    )
);

export type SecurityTxt =
    InferOutput<typeof SecurityTxtSchema>;

export function securityTxtToText(data: SecurityTxt): TextFileOutput {
    parse(SecurityTxtSchema, data)

    const SECURITY_TXT_CONSTANTS = Object.freeze({
        Contact: "Contact",
        Canonical: "Canonical",
        PreferredLanguages: "Preferred-Languages",
        Policy: "Policy",
        Encryption: "Encryption",
        Acknowledgments: "Acknowledgments",
        Hiring: "Hiring",
        Expires: "Expires",
    } as const);

    const lines: UnicodeString[] = [];

    for (const contact of data.contact) {
        lines.push(`${SECURITY_TXT_CONSTANTS.Contact}: ${contact}`);
    }

    lines.push(`${SECURITY_TXT_CONSTANTS.Canonical}: ${data.canonical}`);
    lines.push(
        `${SECURITY_TXT_CONSTANTS.PreferredLanguages}: ${data.preferredLanguages.join(COMMENT_TOKENS.COMMA)}`
    );
    lines.push(`${SECURITY_TXT_CONSTANTS.Policy}: ${data.policy}`);
    lines.push(`${SECURITY_TXT_CONSTANTS.Encryption}: ${data.encryption}`);
    lines.push(`${SECURITY_TXT_CONSTANTS.Acknowledgments}: ${data.acknowledgments}`);
    lines.push(`${SECURITY_TXT_CONSTANTS.Hiring}: ${data.hiring}`);
    lines.push(`${SECURITY_TXT_CONSTANTS.Expires}: ${data.expires}`);

    return `${lines.join(CONTROL_CHARACTERS.NEWLINE)}${CONTROL_CHARACTERS.NEWLINE}` as TextFileOutput
}

export function output(config: SecurityTxt): TextFileOutput {
    return securityTxtToText(config)
}