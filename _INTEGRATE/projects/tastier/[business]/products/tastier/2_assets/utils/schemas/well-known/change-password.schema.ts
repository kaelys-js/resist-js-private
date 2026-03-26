import {
    InferOutput,
    parse,
    pipe,
    regex,
    string,
    url,
} from "valibot";

import { RegExpSchema, type TextFileOutput } from "../../../../0_config/src/utils/schemas/common.schema";

import { CONTROL_CHARACTERS, EMPTY_STRING, HTTP_CACHE_CONTROL_DIRECTIVES, HTTP_HEADERS, HTTP_STATUS_LINES, HTTP_VERSIONS } from "../../../../0_config/src/utils/common/constants";

import { ERROR_MESSAGE_KEYS } from "../common.schema";

export const CHANGE_PASSWORD_URL_REGEX: RegExp = /^https?:\/\/[^?#]+\/change-password$/
parse(RegExpSchema, CHANGE_PASSWORD_URL_REGEX)

export const ChangePasswordUrlSchema = pipe(
    string(ERROR_MESSAGE_KEYS.CHANGE_PASSWORD_URL_NOT_STRING),
    url(ERROR_MESSAGE_KEYS.CHANGE_PASSWORD_URL_NOT_URL),
    regex(
        CHANGE_PASSWORD_URL_REGEX,
        ERROR_MESSAGE_KEYS.CHANGE_PASSWORD_URL_INVALID
    )
);

export type ChangePasswordUrl = InferOutput<typeof ChangePasswordUrlSchema>;

export function changePasswordToHttpText(
    url: ChangePasswordUrl
): TextFileOutput {
    parse(ChangePasswordUrlSchema, url)

    return [
        `${HTTP_VERSIONS.HTTP_1_1} ${HTTP_STATUS_LINES.SEE_OTHER}`,
        `${HTTP_HEADERS.LOCATION}: ${url}`,
        `${HTTP_HEADERS.CACHE_CONTROL}: ${HTTP_CACHE_CONTROL_DIRECTIVES.NO_STORE}`,
        EMPTY_STRING,
        EMPTY_STRING
    ].join(CONTROL_CHARACTERS.CRLF) as TextFileOutput;
}

export function output(config: ChangePasswordUrl): TextFileOutput {
    return changePasswordToHttpText(config)
} 