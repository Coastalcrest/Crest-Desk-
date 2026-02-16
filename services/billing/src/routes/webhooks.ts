/**
 * Payment webhook processing routes.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { logger } from '../lib/logger';
import { getPaymentProvider } from '../providers';

const router = Router();

/**
 * POST /webhooks/stripe
 * Handles Stripe webhook events. Must use raw body parsing.
 */
router.post('/stripe', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      return res.status(400).json({ error: { code: 'MISSING_SIGNATURE', message: 'Missing stripe-signature header' } });
    }

    const provider = getPaymentProvider();

    // Mock provider returns a stub event for testing
    if (provider.name === 'mock') {
      logger.info('Mock webhook received (no processing)');
      return res.json({ received: true });
    }

    const event = provider.validateWebhook(req.body, signature);

    logger.info({ eventId: event.id, eventType: event.type }, 'Webhook event received');

    // Handle specific event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        logger.info({ eventType: event.type, data: event.data }, 'Subscription event');
        // TODO: Sync subscription status to database
        break;

      case 'customer.subscription.deleted':
        logger.info({ eventType: event.type, data: event.data }, 'Subscription deleted');
        // TODO: Mark subscription as canceled in database
        break;

      case 'invoice.payment_succeeded':
        logger.info({ eventType: event.type }, 'Payment succeeded');
        // TODO: Record payment in database
        break;

      case 'invoice.payment_failed':
        logger.warn({ eventType: event.type }, 'Payment failed');
        // TODO: Mark subscription as past_due, send notification
        break;

      case 'checkout.session.completed':
        logger.info({ eventType: event.type }, 'Checkout completed');
        // TODO: Activate subscription from checkout
        break;

      default:
        logger.info({ eventType: event.type }, 'Unhandled webhook event type');
    }

    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, 'Webhook processing failed');
    res.status(400).json({ error: { code: 'WEBHOOK_ERROR', message: 'Webhook processing failed' } });
  }
});

export default router;
