/**
 * Subscription management routes.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { getPaymentProvider } from '../providers';

const router = Router();

// ---------- Validation Schemas ---------- //

const createCustomerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  tenantId: z.string().uuid(),
  metadata: z.record(z.string()).optional(),
});

const createSubscriptionSchema = z.object({
  customerId: z.string().min(1),
  planCode: z.string().min(1),
  billingInterval: z.enum(['monthly', 'yearly']),
  metadata: z.record(z.string()).optional(),
});

const cancelSubscriptionSchema = z.object({
  atPeriodEnd: z.boolean().default(true),
});

const createCheckoutSchema = z.object({
  customerId: z.string().min(1),
  planCode: z.string().min(1),
  billingInterval: z.enum(['monthly', 'yearly']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

// ---------- Customer Routes ---------- //

router.post('/customers', async (req: Request, res: Response) => {
  try {
    const body = createCustomerSchema.parse(req.body);
    const provider = getPaymentProvider();
    const customer = await provider.createCustomer({
      email: body.email,
      name: body.name,
      metadata: { tenantId: body.tenantId, ...body.metadata },
    });
    logger.info({ customerId: customer.id }, 'Customer created');
    res.status(201).json({ data: customer });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: err.errors } });
    }
    logger.error({ err }, 'Create customer failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create customer' } });
  }
});

router.get('/customers/:id', async (req: Request, res: Response) => {
  try {
    const provider = getPaymentProvider();
    const customer = await provider.getCustomer(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    }
    res.json({ data: customer });
  } catch (err) {
    logger.error({ err }, 'Get customer failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get customer' } });
  }
});

router.delete('/customers/:id', async (req: Request, res: Response) => {
  try {
    const provider = getPaymentProvider();
    await provider.deleteCustomer(req.params.id);
    logger.info({ customerId: req.params.id }, 'Customer deleted');
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Delete customer failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete customer' } });
  }
});

// ---------- Subscription Routes ---------- //

router.post('/subscriptions', async (req: Request, res: Response) => {
  try {
    const body = createSubscriptionSchema.parse(req.body);
    const provider = getPaymentProvider();
    const subscription = await provider.createSubscription({
      customerId: body.customerId,
      planCode: body.planCode,
      billingInterval: body.billingInterval,
      metadata: body.metadata,
    });
    logger.info({ subscriptionId: subscription.id }, 'Subscription created');
    res.status(201).json({ data: subscription });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: err.errors } });
    }
    logger.error({ err }, 'Create subscription failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create subscription' } });
  }
});

router.get('/subscriptions/:id', async (req: Request, res: Response) => {
  try {
    const provider = getPaymentProvider();
    const subscription = await provider.getSubscription(req.params.id);
    if (!subscription) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Subscription not found' } });
    }
    res.json({ data: subscription });
  } catch (err) {
    logger.error({ err }, 'Get subscription failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get subscription' } });
  }
});

router.post('/subscriptions/:id/cancel', async (req: Request, res: Response) => {
  try {
    const body = cancelSubscriptionSchema.parse(req.body);
    const provider = getPaymentProvider();
    const subscription = await provider.cancelSubscription(req.params.id, body.atPeriodEnd);
    logger.info({ subscriptionId: req.params.id, atPeriodEnd: body.atPeriodEnd }, 'Subscription canceled');
    res.json({ data: subscription });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: err.errors } });
    }
    logger.error({ err }, 'Cancel subscription failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel subscription' } });
  }
});

router.post('/subscriptions/:id/resume', async (req: Request, res: Response) => {
  try {
    const provider = getPaymentProvider();
    const subscription = await provider.resumeSubscription(req.params.id);
    logger.info({ subscriptionId: req.params.id }, 'Subscription resumed');
    res.json({ data: subscription });
  } catch (err) {
    logger.error({ err }, 'Resume subscription failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to resume subscription' } });
  }
});

// ---------- Checkout ---------- //

router.post('/checkout/sessions', async (req: Request, res: Response) => {
  try {
    const body = createCheckoutSchema.parse(req.body);
    const provider = getPaymentProvider();
    const session = await provider.createCheckoutSession(body);
    logger.info({ sessionId: session.id }, 'Checkout session created');
    res.status(201).json({ data: session });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: err.errors } });
    }
    logger.error({ err }, 'Create checkout session failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create checkout session' } });
  }
});

// ---------- Invoices ---------- //

router.get('/customers/:customerId/invoices', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const provider = getPaymentProvider();
    const invoices = await provider.listInvoices(req.params.customerId, limit);
    res.json({ data: invoices });
  } catch (err) {
    logger.error({ err }, 'List invoices failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list invoices' } });
  }
});

router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const provider = getPaymentProvider();
    const invoice = await provider.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    }
    res.json({ data: invoice });
  } catch (err) {
    logger.error({ err }, 'Get invoice failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get invoice' } });
  }
});

export default router;
