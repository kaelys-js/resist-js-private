import { number, string, minValue, maxValue, minLength, pipe, regex } from 'valibot';

const hostRegex =
  /^(localhost|(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))$/;

export const bindSchema = pipe(
  string(),
  regex(hostRegex, 'Invalid host format. Must be a valid IPv4 or hostname.')
);
const portSchema = pipe(number(), minValue(1), maxValue(65535));
const livekitApiKeySchema = pipe(string(), minLength(20));
const livekitApiSecretSchema = pipe(string(), minLength(32));

export {
    bindSchema,
    portSchema,
    livekitApiKeySchema,
    livekitApiSecretSchema
}