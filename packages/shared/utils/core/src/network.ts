/**
 * Network Utilities
 *
 * General-purpose network utilities for port availability checking
 * and LAN discovery. No CLI dependencies — suitable for use in any context.
 *
 * All functions return `Result<T>` — input is validated via
 * `safeParse`, I/O errors are caught and returned as structured errors.
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import type { Server } from 'node:net';
import type { NetworkInterfaceInfo } from 'node:os';

import * as v from 'valibot';

import {
  BoolSchema,
  HostnameSchema,
  Ipv4AddressArraySchema,
  PortSchema,
  PositiveIntegerSchema,
  type Bool,
  type Hostname,
  type Ipv4AddressArray,
  type NonNegativeInteger,
  type Port,
  type PositiveInteger,
} from '@/schemas/common';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { requireRuntime } from '@/utils/core/environment';
import {
  type OptionalNodeNet,
  type OptionalNodeOs,
  nodeNet,
  nodeOs,
} from '@/utils/core/node-imports';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

/**
 * Schema for network interfaces map returned by `os.networkInterfaces()`.
 *
 * Uses `v.unknown()` for array elements because `NetworkInterfaceInfo` is
 * a Node.js platform type. The function validates its own output via
 * `ok(Ipv4AddressArraySchema, results)`.
 */
const NetworkInterfacesMapSchema = v.record(v.string(), v.optional(v.array(v.unknown())));

/** Map of network interface name to its info array. @see {@link NetworkInterfacesMapSchema} */
type NetworkInterfacesMap = Record<string, NetworkInterfaceInfo[] | undefined>;

// =============================================================================
// Port Availability
// =============================================================================

/**
 * Check if a port is available for binding.
 *
 * Attempts to listen on `127.0.0.1` with a temporary TCP server.
 * Returns `ok(false)` when the port is in use — this is expected
 * behavior, not an error.
 *
 * @param port - TCP port number to check (1–65 535).
 * @returns `Promise<Result<Bool>>` — `true` if available, `false` if in use,
 *          or `VALIDATION.SCHEMA_FAILED` on invalid input.
 *
 * @example
 * ```typescript
 * const check = await isPortAvailable(3000);
 * if (!check.ok) return check;
 * if (check.data) { // port is free }
 * ```
 */
export async function isPortAvailable(port: Port): Promise<Result<Bool>> {
  const net: OptionalNodeNet = nodeNet;
  if (!net) return requireRuntime('isPortAvailable', 'node');
  const portResult: Result<Port> = safeParse(PortSchema, port);
  if (!portResult.ok) return portResult;

  return new Promise<Bool>((resolve: (value: Bool) => void) => {
    const server: Server = net.createServer();

    server.once('error', () => {
      resolve(ok(BoolSchema, false));
    });

    server.once('listening', () => {
      server.close();
      resolve(ok(BoolSchema, true));
    });

    server.listen(portResult.data, '127.0.0.1');
  });
}

/**
 * Find an available port starting from a preferred port.
 *
 * Scans sequentially from `preferredPort` up to `preferredPort + maxAttempts - 1`,
 * stopping at 65 535. Returns the first available port, or
 * `NETWORK.PORT_UNAVAILABLE` if none found.
 *
 * @param preferredPort - Port number to start scanning from (1–65 535).
 * @param maxAttempts - Maximum number of ports to try. Defaults to `100`.
 * @returns `Promise<Result<Port>>` — an available port, or
 *          `VALIDATION.SCHEMA_FAILED` / `NETWORK.PORT_UNAVAILABLE` on error.
 *
 * @example
 * ```typescript
 * const found = await findAvailablePort(3000);
 * if (!found.ok) return found;
 * found.data; // available port number
 * ```
 */
export async function findAvailablePort(
  preferredPort: Port,
  maxAttempts: PositiveInteger = 100,
): Promise<Result<Port>> {
  const net: OptionalNodeNet = nodeNet;
  if (!net) return requireRuntime('findAvailablePort', 'node');
  const portResult: Result<Port> = safeParse(PortSchema, preferredPort);
  if (!portResult.ok) return portResult;

  const attemptsResult: Result<PositiveInteger> = safeParse(PositiveIntegerSchema, maxAttempts);
  if (!attemptsResult.ok) return attemptsResult;

  for (let attempt: number = 0; attempt < attemptsResult.data; attempt++) {
    const candidate: number = portResult.data + attempt;

    if (candidate > 65535) break;

    const candidateResult: Result<Port> = safeParse(PortSchema, candidate);
    if (!candidateResult.ok) continue;

    const check: Result<Bool> = await isPortAvailable(candidateResult.data);
    if (!check.ok) return check;

    if (check.data) return ok(PortSchema, candidateResult.data);
  }

  return err(ERRORS.NETWORK.PORT_UNAVAILABLE, {
    meta: { preferredPort, maxAttempts },
  });
}

/**
 * Check if a port is available (synchronous version).
 *
 * Uses a synchronous `listen` / `close` on a TCP server.
 * Less reliable than the async version but useful for quick checks.
 * Returns `ok(false)` when the port is in use — not an error.
 *
 * @param port - TCP port number to check (1–65 535).
 * @returns `Result<Bool>` — `true` if available, `false` if in use,
 *          or `VALIDATION.SCHEMA_FAILED` on invalid input.
 *
 * @example
 * ```typescript
 * const check = isPortAvailableSync(3000);
 * if (!check.ok) return check;
 * if (check.data) { // port is free }
 * ```
 */
export function isPortAvailableSync(port: Port): Result<Bool> {
  const net: OptionalNodeNet = nodeNet;
  if (!net) return requireRuntime('isPortAvailableSync', 'node');
  const portResult: Result<Port> = safeParse(PortSchema, port);
  if (!portResult.ok) return portResult;

  const server: Server = net.createServer();

  try {
    server.listen(portResult.data, '127.0.0.1');
    server.close();
    return ok(BoolSchema, true);
  } catch {
    return ok(BoolSchema, false);
  }
}

// =============================================================================
// LAN Discovery
// =============================================================================

/**
 * Get all non-internal IPv4 addresses for the local machine.
 *
 * Enumerates network interfaces and returns addresses that are
 * external (non-loopback) and IPv4.
 *
 * @returns `Result<Ipv4AddressArray>` — array of LAN IP addresses
 *          (e.g., `['192.168.1.42', '10.0.0.5']`). Empty array if none found.
 *
 * @example
 * ```typescript
 * const ips = getLocalIpAddresses();
 * if (!ips.ok) return ips;
 * for (const ip of ips.data) { ... }
 * ```
 */
export function getLocalIpAddresses(): Result<Ipv4AddressArray> {
  const os: OptionalNodeOs = nodeOs;
  if (!os) return requireRuntime('getLocalIpAddresses', 'node');
  let nets: NetworkInterfacesMap;
  try {
    nets = os.networkInterfaces();
  } catch (e: unknown) {
    return err(ERRORS.IO.READ_FAILED, {
      meta: { path: 'networkInterfaces' },
      cause: fromUnknownError(e),
    });
  }

  const results: Ipv4AddressArray = [];

  for (const interfaces of Object.values(nets)) {
    if (!interfaces) continue;
    for (const iface of interfaces) {
      if (!iface.internal && iface.family === 'IPv4') {
        results.push(iface.address);
      }
    }
  }

  return ok(Ipv4AddressArraySchema, results);
}

/**
 * Get the machine's mDNS hostname (e.g., `'my-machine.local'`).
 *
 * Appends `.local` if not already present. Resolves on
 * Bonjour/Avahi-capable devices without DNS setup.
 *
 * @returns `Result<Hostname>` — the local mDNS hostname.
 *
 * @example
 * ```typescript
 * const host = getLocalHostname();
 * if (!host.ok) return host;
 * host.data; // 'my-machine.local'
 * ```
 */
export function getLocalHostname(): Result<Hostname> {
  const os: OptionalNodeOs = nodeOs;
  if (!os) return requireRuntime('getLocalHostname', 'node');
  let h: Hostname;
  try {
    h = os.hostname();
  } catch (e: unknown) {
    return err(ERRORS.IO.READ_FAILED, {
      meta: { path: 'hostname' },
      cause: fromUnknownError(e),
    });
  }

  return ok(HostnameSchema, h.endsWith('.local') ? h : `${h}.local`);
}
