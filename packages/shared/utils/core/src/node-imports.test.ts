/**
 * Tests for lazy Node.js module accessors.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { nodeOs, nodeFs, nodePath, nodeUrl, nodeNet, nodeChildProcess } from './node-imports';

describe('node-imports', () => {
  it('nodeOs is defined in Node environment', () => {
    expect(nodeOs).toBeDefined();
  });

  it('nodeFs is defined in Node environment', () => {
    expect(nodeFs).toBeDefined();
  });

  it('nodePath is defined in Node environment', () => {
    expect(nodePath).toBeDefined();
  });

  it('nodeUrl is defined in Node environment', () => {
    expect(nodeUrl).toBeDefined();
  });

  it('nodeNet is defined in Node environment', () => {
    expect(nodeNet).toBeDefined();
  });

  it('nodeChildProcess is defined in Node environment', () => {
    expect(nodeChildProcess).toBeDefined();
  });

  it('nodePath has join and resolve functions', () => {
    expect(nodePath!.join).toBeTypeOf('function');
    expect(nodePath!.resolve).toBeTypeOf('function');
  });

  it('nodeFs has readFileSync and writeFileSync functions', () => {
    expect(nodeFs!.readFileSync).toBeTypeOf('function');
    expect(nodeFs!.writeFileSync).toBeTypeOf('function');
  });
});
