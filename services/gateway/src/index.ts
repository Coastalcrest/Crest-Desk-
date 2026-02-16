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
import reviewQueueRoutes from './routes/review-queue';
import aiReviewRoutes from './routes/ai-review';
import contactsRoutes from './routes/contacts';
import dealsRoutes from './routes/deals';
import followUpRoutes from './routes/follow-up';
import leadSourcesRoutes from './routes/lead-sources';
import commissionsRoutes from './routes/commissions';
import expensesRoutes from './routes/expenses';
import vendorsRoutes from './routes/vendors';
import billingRoutes from './routes/billing';
import reportsRoutes from './routes/reports';
import mediaRoutes from './routes/media';
import assetLibraryRoutes from './routes/asset-library';
import socialPostsRoutes from './routes/social-posts';
import socialAnalyticsRoutes from './routes/social-analytics';
import emailInboxRoutes from './routes/email-inbox';
import emailSettingsRoutes from './routes/email-settings';
import aiCopilotRoutes from './routes/ai-copilot';
import aiAssistRoutes from './routes/ai-assist';
import supportTicketsRoutes from './routes/support-tickets';
import searchRoutes from './routes/search';

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
app.use('/api/v1/review-queue', reviewQueueRoutes);
app.use('/api/v1/ai-review', aiReviewRoutes);
app.use('/api/v1/contacts', contactsRoutes);
app.use('/api/v1/deals', dealsRoutes);
app.use('/api/v1/follow-up', followUpRoutes);
app.use('/api/v1/lead-sources', leadSourcesRoutes);
app.use('/api/v1/commissions', commissionsRoutes);
app.use('/api/v1/expenses', expensesRoutes);
app.use('/api/v1/vendors', vendorsRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/asset-library', assetLibraryRoutes);
app.use('/api/v1/social-posts', socialPostsRoutes);
app.use('/api/v1/social-analytics', socialAnalyticsRoutes);
app.use('/api/v1/email-inbox', emailInboxRoutes);
app.use('/api/v1/email-settings', emailSettingsRoutes);
app.use('/api/v1/ai-copilot', aiCopilotRoutes);
app.use('/api/v1/ai-assist', aiAssistRoutes);
app.use('/api/v1/support-tickets', supportTicketsRoutes);
app.use('/api/v1/search', searchRoutes);

// ---- Global error handler (must be registered last) ------------- //

app.use(globalErrorHandler);

// ---- Start server ----------------------------------------------- //

const PORT = parseInt(process.env.GATEWAY_PORT ?? '4000', 10);

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'CrestDesk Gateway listening');
});

export default app;
