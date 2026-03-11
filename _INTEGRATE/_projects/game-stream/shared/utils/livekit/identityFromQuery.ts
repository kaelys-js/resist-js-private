import { randomUUID } from 'node:crypto'

/**
 * Extracts identity and room values from query parameters.
 * If identity is missing, generates a guest ID.
 * If room is missing, defaults to 'default'.
 * 
 * @param query - Query parameters from the request
 * @returns An object containing a valid identity and room
 */
function livekitIdentityFromQuery(query) {
    // TODO: schema input

    const identity = query.identity || `guest-${randomUUID().replaceAll('-', '')}`; // TODO: type
    const room = query.room || 'default'; // TODO: type

    // TODO: schema return
    return { identity, room }
}

export { livekitIdentityFromQuery }