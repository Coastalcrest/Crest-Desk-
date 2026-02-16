// CrestDesk Billing Service
// Must be first import for Datadog APM
import 'dd-trace/init';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './lib/logger';
import { getPaymentProvider } from './providers';
import subscriptionRoutes from './routes/subscriptions';
import webhookRoutes from './routes/webhooks';
import usageRoutes from './routes/usage';

const app = express();
const port = process.env.PORT ?? 4006;

app.use(cors());
app.use(helmet());

// Stripe webhooks need raw body; mount before json parser
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// JSON parsing for all other routes
app.use(express.json());

// Mount API routes
app.use('/api', subscriptionRoutes);
app.use('/api/usage', usageRoutes);

// Health check
app.get('/health', (_req, res) => {
  const provider = getPaymentProvider();
  res.json({
    status: 'healthy',
    service: 'crestdesk-billing',
    version: '1.0.0',
    paymentProvider: provider.name,
  });
});

// Liveness probe
app.get('/health/live', (_req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (_req, res) => {
  // In production, check Stripe connectivity
  const provider = getPaymentProvider();
  res.json({ status: 'ready', provider: provider.name });
});

app.listen(port, () => {
  const provider = getPaymentProvider();
  logger.info({ port, provider: provider.name }, 'Billing service started');
});

export { app };
