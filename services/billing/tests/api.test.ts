import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';

describe('Billing API', () => {
  describe('POST /api/customers', () => {
    it('creates a customer with valid data', async () => {
      const res = await request(app)
        .post('/api/customers')
        .send({
          email: 'agent@coastalcrest.com',
          name: 'Test Agent',
          tenantId: '00000000-0000-0000-0000-000000000001',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe('agent@coastalcrest.com');
      expect(res.body.data.id).toMatch(/^cus_mock_/);
    });

    it('rejects invalid email', async () => {
      const res = await request(app)
        .post('/api/customers')
        .send({
          email: 'not-an-email',
          name: 'Test',
          tenantId: '00000000-0000-0000-0000-000000000001',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/subscriptions', () => {
    it('creates a subscription', async () => {
      // First create a customer
      const custRes = await request(app)
        .post('/api/customers')
        .send({
          email: 'sub-test@example.com',
          name: 'Sub Test',
          tenantId: '00000000-0000-0000-0000-000000000001',
        });
      const customerId = custRes.body.data.id;

      const res = await request(app)
        .post('/api/subscriptions')
        .send({
          customerId,
          planCode: 'pro_monthly',
          billingInterval: 'monthly',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.billingInterval).toBe('monthly');
    });

    it('rejects invalid billing interval', async () => {
      const res = await request(app)
        .post('/api/subscriptions')
        .send({
          customerId: 'cus_test',
          planCode: 'pro',
          billingInterval: 'weekly',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/checkout/sessions', () => {
    it('creates a checkout session', async () => {
      const custRes = await request(app)
        .post('/api/customers')
        .send({
          email: 'checkout@example.com',
          name: 'Checkout Test',
          tenantId: '00000000-0000-0000-0000-000000000001',
        });
      const customerId = custRes.body.data.id;

      const res = await request(app)
        .post('/api/checkout/sessions')
        .send({
          customerId,
          planCode: 'pro_monthly',
          billingInterval: 'monthly',
          successUrl: 'https://app.crestdesk.com/billing/success',
          cancelUrl: 'https://app.crestdesk.com/billing/cancel',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.url).toBeDefined();
    });
  });

  describe('Usage API', () => {
    it('records and retrieves usage', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000002';

      // Record usage
      const recordRes = await request(app)
        .post('/api/usage/record')
        .send({ tenantId, eventType: 'api_calls', count: 5 });
      expect(recordRes.status).toBe(201);
      expect(recordRes.body.data.currentCount).toBe(5);

      // Record more
      await request(app)
        .post('/api/usage/record')
        .send({ tenantId, eventType: 'api_calls', count: 3 });

      // Get usage
      const getRes = await request(app).get(`/api/usage/${tenantId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.events.api_calls).toBe(8);
      expect(getRes.body.data.total).toBe(8);
    });

    it('resets usage', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000003';

      await request(app)
        .post('/api/usage/record')
        .send({ tenantId, eventType: 'transactions', count: 10 });

      await request(app).delete(`/api/usage/${tenantId}`);

      const getRes = await request(app).get(`/api/usage/${tenantId}`);
      expect(getRes.body.data.total).toBe(0);
    });
  });

  describe('Webhook endpoint', () => {
    it('handles mock webhook', async () => {
      const res = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 'mock_signature')
        .set('Content-Type', 'application/json')
        .send('{}');
      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });

    it('rejects webhook without signature', async () => {
      const res = await request(app)
        .post('/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .send('{}');
      expect(res.status).toBe(400);
    });
  });
});
