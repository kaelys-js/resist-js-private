import { AccessToken } from 'livekit-server-sdk';

/**
 * Generates a LiveKit JWT token allowing a user to join a specified room.
 *
 * @param options.identity - The user identity (unique identifier)
 * @param options.room - The room name the user is allowed to join
 * @param options.env - Environment object containing LiveKit credentials
 * @returns A JWT token as a string
 */
async function livekitTokenGenerate(options): Promise<string> {
  const { identity: string, room: string, env: any } = options
  // TODO: schema input

  const at = new AccessToken(env.API_KEY, env.API_SECRET, { identity }); // TODO: type

  at.addGrant({ roomJoin: true, room });

  // TODO: schema return
  return await at.toJwt();
}

export { livekitTokenGenerate }