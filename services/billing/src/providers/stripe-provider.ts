/**
 * Stripe payment provider — production implementation.
 * Requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET environment variables.
 */
import type {
  PaymentProvider,
  CreateCustomerParams,
  Customer,
  CreateSubscriptionParams,
  Subscription,
  CreateCheckoutSessionParams,
  CheckoutSession,
  Invoice,
  WebhookEvent,
} from './payment-provider';

// Stripe types are optional — the provider only instantiates when keys exist
let stripe: any = null;

function getStripe(): any {
  if (!stripe) {
    try {
      // Dynamic import to avoid hard dependency
      const Stripe = require('stripe');
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new Error('STRIPE_SECRET_KEY not set');
      stripe = new Stripe(key, { apiVersion: '2024-10-28.acacia' });
    } catch (err) {
      throw new Error(`Stripe initialization failed: ${(err as Error).message}`);
    }
  }
  return stripe;
}

function mapCustomer(sc: any): Customer {
  return {
    id: sc.id,
    email: sc.email ?? '',
    name: sc.name ?? '',
    metadata: sc.metadata ?? {},
    createdAt: new Date(sc.created * 1000).toISOString(),
  };
}

function mapSubscription(ss: any): Subscription {
  return {
    id: ss.id,
    customerId: ss.customer as string,
    planCode: ss.metadata?.planCode ?? ss.items?.data?.[0]?.price?.lookup_key ?? '',
    status: ss.status,
    currentPeriodStart: new Date(ss.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(ss.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: ss.cancel_at_period_end,
    billingInterval: ss.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
    createdAt: new Date(ss.created * 1000).toISOString(),
  };
}

function mapInvoice(si: any): Invoice {
  return {
    id: si.id,
    customerId: si.customer as string,
    subscriptionId: si.subscription as string | null,
    amountDue: si.amount_due,
    amountPaid: si.amount_paid,
    currency: si.currency,
    status: si.status,
    invoiceUrl: si.hosted_invoice_url ?? null,
    periodStart: new Date(si.period_start * 1000).toISOString(),
    periodEnd: new Date(si.period_end * 1000).toISOString(),
    createdAt: new Date(si.created * 1000).toISOString(),
  };
}

export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';

  // ---------- Customer operations ---------- //

  async createCustomer(params: CreateCustomerParams): Promise<Customer> {
    const s = getStripe();
    const customer = await s.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata,
    });
    return mapCustomer(customer);
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    try {
      const s = getStripe();
      const customer = await s.customers.retrieve(customerId);
      if (customer.deleted) return null;
      return mapCustomer(customer);
    } catch {
      return null;
    }
  }

  async updateCustomer(customerId: string, params: Partial<CreateCustomerParams>): Promise<Customer> {
    const s = getStripe();
    const customer = await s.customers.update(customerId, {
      ...(params.email !== undefined && { email: params.email }),
      ...(params.name !== undefined && { name: params.name }),
      ...(params.metadata !== undefined && { metadata: params.metadata }),
    });
    return mapCustomer(customer);
  }

  async deleteCustomer(customerId: string): Promise<void> {
    const s = getStripe();
    await s.customers.del(customerId);
  }

  // ---------- Subscription operations ---------- //

  async createSubscription(params: CreateSubscriptionParams): Promise<Subscription> {
    const s = getStripe();
    const subscription = await s.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.planCode }],
      metadata: { planCode: params.planCode, ...params.metadata },
    });
    return mapSubscription(subscription);
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    try {
      const s = getStripe();
      const subscription = await s.subscriptions.retrieve(subscriptionId);
      return mapSubscription(subscription);
    } catch {
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd = true): Promise<Subscription> {
    const s = getStripe();
    if (atPeriodEnd) {
      const subscription = await s.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return mapSubscription(subscription);
    }
    const subscription = await s.subscriptions.cancel(subscriptionId);
    return mapSubscription(subscription);
  }

  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    const s = getStripe();
    const subscription = await s.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
    return mapSubscription(subscription);
  }

  // ---------- Checkout ---------- //

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
    const s = getStripe();
    const session = await s.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      line_items: [{ price: params.planCode, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });
    return { id: session.id, url: session.url ?? '' };
  }

  // ---------- Invoices ---------- //

  async listInvoices(customerId: string, limit = 10): Promise<Invoice[]> {
    const s = getStripe();
    const result = await s.invoices.list({ customer: customerId, limit });
    return result.data.map(mapInvoice);
  }

  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      const s = getStripe();
      const invoice = await s.invoices.retrieve(invoiceId);
      return mapInvoice(invoice);
    } catch {
      return null;
    }
  }

  // ---------- Webhooks ---------- //

  validateWebhook(payload: string | Buffer, signature: string): WebhookEvent {
    const s = getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not set');
    const event = s.webhooks.constructEvent(payload, signature, secret);
    return {
      id: event.id,
      type: event.type,
      data: event.data.object as Record<string, unknown>,
    };
  }
}
