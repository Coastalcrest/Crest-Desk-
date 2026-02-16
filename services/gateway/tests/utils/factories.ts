/**
 * Test data factories for generating realistic test fixtures.
 */
import { v4 as uuid } from 'uuid';

export function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    tenantId: '00000000-0000-0000-0000-000000000001',
    email: `test-${Date.now()}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    role: 'agent',
    status: 'active',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$salt$hash',
    licensedStates: ['OR'],
    licenseNumbers: { OR: 'OR-TEST-001' },
    mfaEnabled: false,
    mfaSecret: null,
    preferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

export function buildTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    name: 'Test Brokerage',
    companyName: 'Test Brokerage LLC',
    domain: 'test.crestdesk.com',
    plan: 'professional',
    status: 'active',
    settings: { timezone: 'America/Los_Angeles', defaultState: 'OR' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    tenantId: '00000000-0000-0000-0000-000000000001',
    agentId: '00000000-0000-0000-0000-000000000011',
    transactionType: 'buy',
    status: 'active',
    propertyAddress: '123 Test St',
    propertyCity: 'Portland',
    propertyState: 'OR',
    propertyZip: '97201',
    price: '500000',
    commissionRate: '2.5',
    notes: 'Test transaction',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

export function buildContact(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    tenantId: '00000000-0000-0000-0000-000000000001',
    ownerId: '00000000-0000-0000-0000-000000000011',
    firstName: 'John',
    lastName: 'Doe',
    email: `contact-${Date.now()}@example.com`,
    phone: '(503) 555-0000',
    contactType: 'buyer',
    source: 'referral',
    status: 'active',
    mailingAddress: { street: '456 Oak Ave', city: 'Portland', state: 'OR', zip: '97201' },
    tags: ['test'],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

export function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    userId: '00000000-0000-0000-0000-000000000010',
    tenantId: '00000000-0000-0000-0000-000000000001',
    refreshToken: 'mock-refresh-token',
    userAgent: 'vitest',
    ipAddress: '127.0.0.1',
    expiresAt: new Date(Date.now() + 7 * 24 * 3600000),
    createdAt: new Date(),
    ...overrides,
  };
}

export function buildBillingRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    tenantId: '00000000-0000-0000-0000-000000000001',
    agentId: '00000000-0000-0000-0000-000000000011',
    billingType: 'desk_fee',
    amount: '500.00',
    billingPeriodStart: '2024-01-01',
    billingPeriodEnd: '2024-01-31',
    invoiceDate: '2024-01-01',
    dueDate: '2024-01-31',
    paidStatus: 'unpaid',
    paymentDate: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}
