// CrestDesk Transactions Service
// Must be first import for Datadog APM
import 'dd-trace/init';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './lib/logger';

const app = express();
const port = process.env.PORT ?? 4001;

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'crestdesk-transactions' });
});

// TODO: Mount service-specific routes

app.listen(port, () => {
  logger.info({ port }, 'Transactions service started');
});

export { app };
