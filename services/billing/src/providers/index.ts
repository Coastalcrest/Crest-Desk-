/**
 * Provider factory — returns Stripe provider if keys exist, otherwise mock.
 */
import { logger } from '../lib/logger';
import type { PaymentProvider } from './payment-provider';
import { MockPaymentProvider } from './mock-provider';
import { StripePaymentProvider } from './stripe-provider';

export type { PaymentProvider } from './payment-provider';
export type {
  Customer,
  Subscription,
  Invoice,
  CheckoutSession,
  WebhookEvent,
  CreateCustomerParams,
  CreateSubscriptionParams,
  CreateCheckoutSessionParams,
} from './payment-provider';

let _provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (_provider) return _provider;

  if (process.env.STRIPE_SECRET_KEY) {
    logger.info('Using Stripe payment provider');
    _provider = new StripePaymentProvider();
  } else {
    logger.info('Using mock payment provider (set STRIPE_SECRET_KEY for production)');
    _provider = new MockPaymentProvider();
  }

  return _provider;
}

/** Reset provider (for testing). */
export function resetPaymentProvider(): void {
  _provider = null;
}
