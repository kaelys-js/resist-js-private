import {
    InferOutput,
    parse,
    pipe,
    regex,
    strictObject,
    string,
} from "valibot";

import { RegExpSchema, type TextFileOutput } from "../../../../0_config/src/utils/schemas/common.schema";

import { CONTROL_CHARACTERS } from "../../../../0_config/src/utils/common/constants";

import { ERROR_MESSAGE_KEYS } from "../common.schema";

export const PGP_KEY_REGEX: RegExp = /^-----BEGIN PGP PUBLIC KEY BLOCK-----\r?\n[\s\S]+?\r?\n-----END PGP PUBLIC KEY BLOCK-----\r?\n?$/
parse(RegExpSchema, PGP_KEY_REGEX)

export const PgpPublicKeyBlockSchema = pipe(
    string(ERROR_MESSAGE_KEYS.PGP_PUBLIC_KEY_BLOCK_NOT_STRING),
    regex(
        PGP_KEY_REGEX,
        ERROR_MESSAGE_KEYS.PGP_PUBLIC_KEY_BLOCK_INVALID_ARMOR
    )
);

export type PgpPublicKeyBlock = InferOutput<typeof PgpPublicKeyBlockSchema>;

export const PgpKeySchema = strictObject({
    publicKey: PgpPublicKeyBlockSchema,
},
    ERROR_MESSAGE_KEYS.PGP_KEY_DOCUMENT_INVALID
);

export type PgpKey = InferOutput<typeof PgpKeySchema>;

export function pgpKeyToText(data: PgpKey): TextFileOutput {
    parse(PgpKeySchema, data);

    return `${data.publicKey}${CONTROL_CHARACTERS.CRLF}` as TextFileOutput;
}

export function output(config: PgpKey): TextFileOutput {
    return pgpKeyToText(config)
} 