import { livekitIdentityFromQuery } from "@/shared/utils/livekit/identityFromQuery";
import { livekitTokenGenerate } from "@/shared/utils/livekit/tokenGenerate";

/**
 * Handles a request to generate a LiveKit token for a user joining a room.
 * 
 * @param query - URL query parameters, expected to include identity and room.
 * @param env - Environment configuration (e.g., API keys).
 * @returns An object containing a LiveKit token.
 */
async function livekitTokenRouteHandler({ query, env }) {
  const { identity, room }: LivekitIdentity = livekitIdentityFromQuery(query)

  return { token: await livekitTokenGenerate({ identity, room, env }) };
}

export { livekitTokenRouteHandler }