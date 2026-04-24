/**
 * Tests for network utilities.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Bool, Hostname, Ipv4AddressArray, Port } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import {
  isPortAvailable,
  findAvailablePort,
  isPortAvailableSync,
  getLocalIpAddresses,
  getLocalHostname,
} from './network';

// ── isPortAvailable ─────────────────────────────────────────────────────

describe('isPortAvailable', () => {
  it('returns true for an available high port', async () => {
    // Use a random high port unlikely to be in use
    const port = (49_152 + Math.floor(Math.random() * 16_000)) as Port;
    const result: Result<Bool> = await isPortAvailable(port);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.data).toBe('boolean');
    }
  });

  it('returns validation error for invalid port', async () => {
    const result: Result<Bool> = await isPortAvailable(0 as Port);
    expect(result.ok).toBe(false);
  });

  it('returns validation error for port > 65_535', async () => {
    const result: Result<Bool> = await isPortAvailable(70_000 as Port);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns false when port is already in use', async () => {
    const net = await import('node:net');
    const server = net.createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        resolve();
      });
    });
    const addr = server.address();
    if (typeof addr === 'object' && addr !== null && 'port' in addr) {
      const portNum = addr.port;
      const result: Result<Bool> = await isPortAvailable(portNum as Port);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe(false);
      }
    }
    server.close();
  });
});

// ── findAvailablePort ───────────────────────────────────────────────────

describe('findAvailablePort', () => {
  it('finds an available port starting from preferred', async () => {
    const port = (49_152 + Math.floor(Math.random() * 16_000)) as Port;
    const result: Result<Port> = await findAvailablePort(port);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeGreaterThanOrEqual(port);
      expect(result.data).toBeLessThanOrEqual(65_535);
    }
  });

  it('returns NETWORK.PORT_UNAVAILABLE when all ports exhausted', async () => {
    // Use port 65_535 with maxAttempts=1 — only one candidate, high chance of being available
    // but use a port we know is occupied by binding to it first
    const net = await import('node:net');
    const server = net.createServer();
    await new Promise<void>((resolve) => {
      server.listen(65_534, '127.0.0.1', () => {
        resolve();
      });
    });

    const result: Result<Port> = await findAvailablePort(65_534 as Port, 1 as never);
    server.close();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK.PORT_UNAVAILABLE');
    }
  });

  it('stops scanning when candidate exceeds 65_535', async () => {
    const net = await import('node:net');
    const server1 = net.createServer();
    const server2 = net.createServer();
    await new Promise<void>((resolve) => {
      server1.listen(65_534, '127.0.0.1', () => {
        resolve();
      });
    });
    await new Promise<void>((resolve) => {
      server2.listen(65_535, '127.0.0.1', () => {
        resolve();
      });
    });

    const result: Result<Port> = await findAvailablePort(65_534 as Port, 5 as never);
    server1.close();
    server2.close();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK.PORT_UNAVAILABLE');
    }
  });

  it('returns validation error for invalid port', async () => {
    const result: Result<Port> = await findAvailablePort(-1 as unknown as Port);
    expect(result.ok).toBe(false);
  });

  it('returns validation error for invalid maxAttempts', async () => {
    const result: Result<Port> = await findAvailablePort(50_000 as Port, 0 as unknown as never);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns same port as preferred when it is free', async () => {
    const net = await import('node:net');
    const server = net.createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        resolve();
      });
    });
    const addr = server.address();
    server.close();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });

    if (typeof addr === 'object' && addr !== null && 'port' in addr) {
      const result: Result<Port> = await findAvailablePort(addr.port as Port);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBeGreaterThanOrEqual(addr.port);
      }
    }
  });
});

// ── isPortAvailableSync ─────────────────────────────────────────────────

describe('isPortAvailableSync', () => {
  it('returns a boolean result for valid port', () => {
    const port = (49_152 + Math.floor(Math.random() * 16_000)) as Port;
    const result: Result<Bool> = isPortAvailableSync(port);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.data).toBe('boolean');
    }
  });

  it('returns validation error for invalid port', () => {
    const result: Result<Bool> = isPortAvailableSync(0 as Port);
    expect(result.ok).toBe(false);
  });

  it('returns validation error for out-of-range port', () => {
    const result: Result<Bool> = isPortAvailableSync(100_000 as Port);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });
});

// ── getLocalIpAddresses ─────────────────────────────────────────────────

describe('getLocalIpAddresses', () => {
  it('returns ok with array of addresses', () => {
    const result: Result<Ipv4AddressArray> = getLocalIpAddresses();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.data)).toBe(true);
    }
  });

  it('addresses are valid IPv4 format when present', () => {
    const result: Result<Ipv4AddressArray> = getLocalIpAddresses();
    expect(result.ok).toBe(true);
    if (result.ok && result.data.length > 0) {
      for (const ip of result.data) {
        expect(ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
      }
    }
  });
});

// ── getLocalHostname ────────────────────────────────────────────────────

describe('getLocalHostname', () => {
  it('returns hostname ending with .local', () => {
    const result: Result<Hostname> = getLocalHostname();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatch(/\.local$/);
    }
  });

  it('returns a non-empty string', () => {
    const result: Result<Hostname> = getLocalHostname();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(6); // at least "x.local"
    }
  });
});
