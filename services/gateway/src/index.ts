/**
 * dd-trace MUST be required before any other module.
 */
import 'dd-trace/init';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { defaultLimiter } from './middleware/rate-limiter';
import { globalErrorHandler } from './middleware/error-handler';
import { logger } from './lib/logger';

import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import tenantRoutes from './routes/tenant';
import complianceRoutes from './routes/compliance';
import flagsRoutes from './routes/flags';
import transactionsRoutes from './routes/transactions';
import documentsRoutes from './routes/documents';
import formsRoutes from './routes/forms';
import checklistsRoutes from './routes/checklists';
import signingRoutes from './routes/signing';
import signPublicRoutes from './routes/sign-public';
import closingPackagesRoutes from './routes/closing-packages';

const app = express();

// ---- Middleware (order matters) --------------------------------- //

// 1. CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  }),
);

// 2. Helmet
app.use(helmet());

// 3. Compression
app.use(compression());

// 4. Cookie parser (must come before routes that read cookies)
app.use(cookieParser());

// 5. Rate limiter
app.use(defaultLimiter);

// 6. JSON body parser
app.use(express.json({ limit: '1mb' }));

// ---- Health check (unauthenticated) ----------------------------- //

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gateway', timestamp: new Date().toISOString() });
});

// ---- Route groups ----------------------------------------------- //

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/tenant', tenantRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/flags', flagsRoutes);
app.use('/api/v1/transactions', transactionsRoutes);
app.use('/api/v1/documents', documentsRoutes);
app.use('/api/v1/forms', formsRoutes);
app.use('/api/v1/compliance-checklists', checklistsRoutes);
app.use('/api/v1/signing', signingRoutes);
app.use('/api/v1/sign', signPublicRoutes);
app.use('/api/v1/closing-packages', closingPackagesRoutes);

// ---- Global error handler (must be registered last) ------------- //

app.use(globalErrorHandler);

// ---- Start server ----------------------------------------------- //

const PORT = parseInt(process.env.GATEWAY_PORT ?? '4000', 10);

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'CrestDesk Gateway listening');
});

export default app;
