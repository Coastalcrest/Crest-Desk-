import { describe, it, expect, beforeEach } from 'vitest';
import { MockPaymentProvider } from '../src/providers/mock-provider';

describe('MockPaymentProvider', () => {
  let provider: MockPaymentProvider;

  beforeEach(() => {
    provider = new MockPaymentProvider();
  });

  describe('Customer operations', () => {
    it('creates a customer', async () => {
      const customer = await provider.createCustomer({
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(customer.id).toMatch(/^cus_mock_/);
      expect(customer.email).toBe('test@example.com');
      expect(customer.name).toBe('Test User');
    });

    it('retrieves a customer', async () => {
      const created = await provider.createCustomer({ email: 'test@example.com', name: 'Test' });
      const retrieved = await provider.getCustomer(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
    });

    it('returns null for non-existent customer', async () => {
      const result = await provider.getCustomer('nonexistent');
      expect(result).toBeNull();
    });

    it('updates a customer', async () => {
      const created = await provider.createCustomer({ email: 'test@example.com', name: 'Test' });
      const updated = await provider.updateCustomer(created.id, { email: 'new@example.com' });
      expect(updated.email).toBe('new@example.com');
      expect(updated.name).toBe('Test');
    });

    it('deletes a customer', async () => {
      const created = await provider.createCustomer({ email: 'test@example.com', name: 'Test' });
      await provider.deleteCustomer(created.id);
      const result = await provider.getCustomer(created.id);
      expect(result).toBeNull();
    });
  });

  describe('Subscription operations', () => {
    it('creates a monthly subscription', async () => {
      const customer = await provider.createCustomer({ email: 'test@example.com', name: 'Test' });
      const subscription = await provider.createSubscription({
        customerId: customer.id,
        planCode: 'pro_monthly',
        billingInterval: 'monthly',
      });
      expect(subscription.id).toMatch(/^sub_mock_/);
      expect(subscription.status).toBe('active');
      expect(subscription.billingInterval).toBe('monthly');
    });

    it('creates a yearly subscription', async () => {
      const customer = await provider.createCustomer({ email: 'test@example.com', name: 'Test' });
      const subscription = await provider.createSubscription({
        customerId: customer.id,
        planCode: 'pro_yearly',
        billingInterval: 'yearly',
      });
      expect(subscription.billingInterval).toBe('yearly');
    });

    it('cancels a subscription at period end', async () => {
      const customer = await provider.createCustomer({ email: 'test@example.com', name: 'Test' });
      const sub = await provider.createSubscription({
        customerId: customer.id,
        planCode: 'pro_monthly',
        billingInterval: 'monthly',
      });

      const canceled = await provider.cancelSubscription(sub.id, true);
      expect(canceled.cancelAtPeriodEnd).toBe(true);
      expect(canceled.status).toBe('active'); // Still active until period end
    });

    it('cancels a subscription immediately', async () => {
      const customer = await provider.createCustomer({ email: 'test@example.com', name: 'Test' });
      const sub = await provider.createSubscription({
        customerId: customer.id,
        planCode: 'pro_monthly',
        billingInterval: 'monthly',
      });

      const canceled = await provider.cancelSubscription(sub.id, false);
      expect(canceled.status).toBe('canceled');
    });

    it('resumes a canceled subscription', async () => {
      const customer = await provider.createCustomer({ email: 'test@example.com', name: 'Test' });
      const sub = await provider.createSubscription({
        customerId: customer.id,
        planCode: 'pro_monthly',
        billingInterval: 'monthly',
      });

      await provider.cancelSubscription(sub.id, true);
      const resumed = await provider.resumeSubscription(sub.id);
      expect(resumed.status).toBe('active');
      expect(resumed.cancelAtPeriodEnd).toBe(false);
    });
  });

  describe('Checkout', () => {
    it('creates a checkout session', async () => {
      const customer = await provider.createCustomer({ email: 'test@example.com', name: 'Test' });
      const session = await provider.createCheckoutSession({
        customerId: customer.id,
        planCode: 'pro_monthly',
        billingInterval: 'monthly',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
      });
      expect(session.id).toMatch(/^cs_mock_/);
      expect(session.url).toContain('https://app.example.com/success');
    });
  });

  describe('Invoices', () => {
    it('lists invoices for a customer', async () => {
      const customer = await provider.createCustomer({ email: 'test@example.com', name: 'Test' });
      // Creating a subscription also creates an invoice
      await provider.createSubscription({
        customerId: customer.id,
        planCode: 'pro_monthly',
        billingInterval: 'monthly',
      });

      const invoices = await provider.listInvoices(customer.id);
      expect(invoices.length).toBe(1);
      expect(invoices[0]!.customerId).toBe(customer.id);
    });
  });

  describe('Webhooks', () => {
    it('validates a mock webhook', () => {
      const event = provider.validateWebhook('payload', 'signature');
      expect(event.id).toMatch(/^evt_mock_/);
      expect(event.type).toBe('mock.event');
    });
  });
});
