/**
 * Mock payment provider — in-memory implementation for development/testing.
 * No external dependencies (no Stripe keys needed).
 */
import { v4 as uuid } from 'uuid';
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

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  private customers = new Map<string, Customer>();
  private subscriptions = new Map<string, Subscription>();
  private invoices = new Map<string, Invoice>();

  // ---------- Customer operations ---------- //

  async createCustomer(params: CreateCustomerParams): Promise<Customer> {
    const customer: Customer = {
      id: `cus_mock_${uuid().slice(0, 8)}`,
      email: params.email,
      name: params.name,
      metadata: params.metadata ?? {},
      createdAt: new Date().toISOString(),
    };
    this.customers.set(customer.id, customer);
    return customer;
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    return this.customers.get(customerId) ?? null;
  }

  async updateCustomer(customerId: string, params: Partial<CreateCustomerParams>): Promise<Customer> {
    const customer = this.customers.get(customerId);
    if (!customer) throw new Error(`Customer ${customerId} not found`);

    const updated = {
      ...customer,
      ...(params.email !== undefined && { email: params.email }),
      ...(params.name !== undefined && { name: params.name }),
      ...(params.metadata !== undefined && { metadata: { ...customer.metadata, ...params.metadata } }),
    };
    this.customers.set(customerId, updated);
    return updated;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    this.customers.delete(customerId);
  }

  // ---------- Subscription operations ---------- //

  async createSubscription(params: CreateSubscriptionParams): Promise<Subscription> {
    const now = new Date();
    const periodEnd = new Date(now);
    if (params.billingInterval === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const subscription: Subscription = {
      id: `sub_mock_${uuid().slice(0, 8)}`,
      customerId: params.customerId,
      planCode: params.planCode,
      status: 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      billingInterval: params.billingInterval,
      createdAt: now.toISOString(),
    };
    this.subscriptions.set(subscription.id, subscription);

    // Create initial invoice
    const invoice: Invoice = {
      id: `inv_mock_${uuid().slice(0, 8)}`,
      customerId: params.customerId,
      subscriptionId: subscription.id,
      amountDue: 0,
      amountPaid: 0,
      currency: 'usd',
      status: 'paid',
      invoiceUrl: null,
      periodStart: now.toISOString(),
      periodEnd: periodEnd.toISOString(),
      createdAt: now.toISOString(),
    };
    this.invoices.set(invoice.id, invoice);

    return subscription;
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    return this.subscriptions.get(subscriptionId) ?? null;
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd = true): Promise<Subscription> {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) throw new Error(`Subscription ${subscriptionId} not found`);

    const updated: Subscription = {
      ...sub,
      status: atPeriodEnd ? sub.status : 'canceled',
      cancelAtPeriodEnd: atPeriodEnd,
    };
    this.subscriptions.set(subscriptionId, updated);
    return updated;
  }

  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) throw new Error(`Subscription ${subscriptionId} not found`);

    const updated: Subscription = {
      ...sub,
      status: 'active',
      cancelAtPeriodEnd: false,
    };
    this.subscriptions.set(subscriptionId, updated);
    return updated;
  }

  // ---------- Checkout ---------- //

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
    return {
      id: `cs_mock_${uuid().slice(0, 8)}`,
      url: `${params.successUrl}?session_id=cs_mock_${uuid().slice(0, 8)}`,
    };
  }

  // ---------- Invoices ---------- //

  async listInvoices(customerId: string, limit = 10): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter((inv) => inv.customerId === customerId)
      .slice(0, limit);
  }

  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    return this.invoices.get(invoiceId) ?? null;
  }

  // ---------- Webhooks ---------- //

  validateWebhook(_payload: string | Buffer, _signature: string): WebhookEvent {
    return {
      id: `evt_mock_${uuid().slice(0, 8)}`,
      type: 'mock.event',
      data: {},
    };
  }
}
