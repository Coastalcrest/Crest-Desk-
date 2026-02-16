/**
 * Mock database utilities for unit tests.
 *
 * Provides mock implementations of the Drizzle ORM query builder chain
 * and the withTenantContext function.
 */
import { vi } from 'vitest';

// Mock query chain — each method returns `this` to allow chaining
export function createMockQueryChain(data: unknown[] = []) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(data),
    then: vi.fn().mockImplementation((resolve: any) => resolve(data)),
    // Make it thenable (Promise-like)
    [Symbol.toPrimitive]: () => data,
  };
  // Allow the chain itself to resolve as a promise
  Object.defineProperty(chain, 'then', {
    value: (resolve: any, reject: any) => Promise.resolve(data).then(resolve, reject),
    writable: true,
  });
  return chain;
}

/**
 * Create a mock for `withTenantContext`.
 * The callback receives a mock transaction object (tx).
 * The mock tx can be configured to return specific data per query.
 */
export function createMockWithTenantContext() {
  return vi.fn().mockImplementation(
    async (_tenantId: string, callback: (tx: any) => Promise<any>) => {
      const tx = createMockQueryChain();
      return callback(tx);
    },
  );
}

/**
 * Helper to mock a specific module path.
 * Returns the mock so tests can configure return values.
 */
export function mockDbModule() {
  const mockDb = createMockQueryChain();
  const mockWithTenantContext = createMockWithTenantContext();

  vi.mock('../../src/lib/db', () => ({
    db: mockDb,
    withTenantContext: mockWithTenantContext,
  }));

  return { db: mockDb, withTenantContext: mockWithTenantContext };
}
