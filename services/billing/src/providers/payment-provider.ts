/**
 * Payment provider interface — abstracts Stripe, mock, or future providers.
 */

export interface CreateCustomerParams {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  metadata: Record<string, string>;
  createdAt: string;
}

export interface CreateSubscriptionParams {
  customerId: string;
  planCode: string;
  billingInterval: 'monthly' | 'yearly';
  metadata?: Record<string, string>;
}

export interface Subscription {
  id: string;
  customerId: string;
  planCode: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  billingInterval: 'monthly' | 'yearly';
  createdAt: string;
}

export interface CreateCheckoutSessionParams {
  customerId: string;
  planCode: string;
  billingInterval: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export interface Invoice {
  id: string;
  customerId: string;
  subscriptionId: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  invoiceUrl: string | null;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: string;

  // Customer operations
  createCustomer(params: CreateCustomerParams): Promise<Customer>;
  getCustomer(customerId: string): Promise<Customer | null>;
  updateCustomer(customerId: string, params: Partial<CreateCustomerParams>): Promise<Customer>;
  deleteCustomer(customerId: string): Promise<void>;

  // Subscription operations
  createSubscription(params: CreateSubscriptionParams): Promise<Subscription>;
  getSubscription(subscriptionId: string): Promise<Subscription | null>;
  cancelSubscription(subscriptionId: string, atPeriodEnd?: boolean): Promise<Subscription>;
  resumeSubscription(subscriptionId: string): Promise<Subscription>;

  // Checkout
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession>;

  // Invoices
  listInvoices(customerId: string, limit?: number): Promise<Invoice[]>;
  getInvoice(invoiceId: string): Promise<Invoice | null>;

  // Webhooks
  validateWebhook(payload: string | Buffer, signature: string): WebhookEvent;
}
