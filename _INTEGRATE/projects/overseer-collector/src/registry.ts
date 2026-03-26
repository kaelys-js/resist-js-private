import type { CollectorDefinition } from './types.js';

// Collector registry - import all collectors here
// Each collector file in collectors/ should be imported and added to this map

const collectors = new Map<string, CollectorDefinition>();

// Register a collector
export function register<T>(collector: CollectorDefinition<T>): void {
  if (collectors.has(collector.id)) {
    throw new Error(`Collector "${collector.id}" is already registered`);
  }
  collectors.set(collector.id, collector as CollectorDefinition);
}

// Get a collector by ID
export function getCollector(id: string): CollectorDefinition | undefined {
  return collectors.get(id);
}

// Get all registered collectors
export function getAllCollectors(): CollectorDefinition[] {
  return Array.from(collectors.values());
}

// Get collector IDs
export function getCollectorIds(): string[] {
  return Array.from(collectors.keys());
}

// Find collectors matching a cron expression
export function getCollectorsByCron(cron: string): CollectorDefinition[] {
  return getAllCollectors().filter((c) => {
    if (c.schedule.type === 'cron') {
      return c.schedule.expression === cron;
    }
    return false;
  });
}

// Convert interval to cron-like identifier for matching
export function intervalToCronId(minutes: number): string {
  if (minutes === 1) return '* * * * *';
  if (minutes < 60) return `*/${minutes} * * * *`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `0 */${hours} * * *`;
  return `0 0 */${Math.floor(hours / 24)} * *`;
}
