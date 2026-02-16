/**
 * External Integration Abstractions
 *
 * Provider-pattern abstractions for external services. Each integration
 * has an interface, a real implementation, and a mock implementation.
 * The mock is used when credentials are not configured.
 */

export * from './email-provider';
export * from './social-provider';
export * from './property-data-provider';
