/**
 * API Documentation endpoint.
 *
 * Serves a generated OpenAPI 3.0 specification describing all gateway endpoints.
 * Available at /api/v1/docs for JSON spec.
 */
import { Router, type Request, type Response } from 'express';

const router = Router();

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'CrestDesk API',
    description: 'All-in-one real estate transaction management platform API',
    version: '1.0.0',
    contact: {
      name: 'CrestDesk Support',
      email: 'support@crestdesk.com',
    },
  },
  servers: [
    { url: 'http://localhost:4000', description: 'Development' },
    { url: 'https://api.crestdesk.com', description: 'Production' },
  ],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http' as const,
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token obtained from POST /api/v1/auth/login',
      },
    },
    schemas: {
      Error: {
        type: 'object' as const,
        properties: {
          error: {
            type: 'object' as const,
            properties: {
              code: { type: 'string' as const, example: 'VALIDATION_ERROR' },
              message: { type: 'string' as const, example: 'Invalid input' },
              details: { type: 'object' as const, nullable: true },
              request_id: { type: 'string' as const, format: 'uuid' },
            },
          },
        },
      },
      Pagination: {
        type: 'object' as const,
        properties: {
          page: { type: 'integer' as const, example: 1 },
          pageSize: { type: 'integer' as const, example: 25 },
          total: { type: 'integer' as const, example: 100 },
          totalPages: { type: 'integer' as const, example: 4 },
        },
      },
    },
    parameters: {
      page: { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1, minimum: 1 } },
      pageSize: { name: 'pageSize', in: 'query' as const, schema: { type: 'integer' as const, default: 25, minimum: 1, maximum: 100 } },
    },
  },
  paths: {
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' as const, required: ['email', 'password'], properties: { email: { type: 'string' as const, format: 'email' }, password: { type: 'string' as const, minLength: 10 } } } } },
        },
        responses: {
          '200': { description: 'Login successful. Returns access token and sets refresh cookie.' },
          '401': { description: 'Invalid credentials' },
          '423': { description: 'Account locked due to too many failed attempts' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/v1/auth/register': {
      post: { tags: ['Authentication'], summary: 'Register a new user and tenant', responses: { '201': { description: 'Registration successful' }, '409': { description: 'Email already exists' } } },
    },
    '/api/v1/auth/refresh': {
      post: { tags: ['Authentication'], summary: 'Refresh access token using refresh cookie', responses: { '200': { description: 'New access token issued' }, '401': { description: 'Invalid or expired refresh token' } } },
    },
    '/api/v1/auth/logout': {
      post: { tags: ['Authentication'], summary: 'Logout and revoke current token', responses: { '200': { description: 'Logged out' } } },
    },
    '/api/v1/transactions': {
      get: { tags: ['Transactions'], summary: 'List transactions (paginated)', parameters: [{ $ref: '#/components/parameters/page' }, { $ref: '#/components/parameters/pageSize' }], responses: { '200': { description: 'Paginated list of transactions' } } },
      post: { tags: ['Transactions'], summary: 'Create a new transaction', responses: { '201': { description: 'Transaction created' }, '400': { description: 'Validation error' } } },
    },
    '/api/v1/transactions/{id}': {
      get: { tags: ['Transactions'], summary: 'Get transaction by ID', parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } }], responses: { '200': { description: 'Transaction details' }, '404': { description: 'Not found' } } },
      patch: { tags: ['Transactions'], summary: 'Update a transaction', responses: { '200': { description: 'Updated' } } },
      delete: { tags: ['Transactions'], summary: 'Soft-delete a transaction', responses: { '200': { description: 'Deleted' } } },
    },
    '/api/v1/contacts': {
      get: { tags: ['Contacts'], summary: 'List contacts (paginated)', responses: { '200': { description: 'Paginated list of contacts' } } },
      post: { tags: ['Contacts'], summary: 'Create a new contact', responses: { '201': { description: 'Contact created' } } },
    },
    '/api/v1/contacts/{id}': {
      get: { tags: ['Contacts'], summary: 'Get contact by ID', responses: { '200': { description: 'Contact details' } } },
      patch: { tags: ['Contacts'], summary: 'Update a contact', responses: { '200': { description: 'Updated' } } },
    },
    '/api/v1/documents': {
      get: { tags: ['Documents'], summary: 'List documents', responses: { '200': { description: 'List of documents' } } },
      post: { tags: ['Documents'], summary: 'Upload a document', responses: { '201': { description: 'Document uploaded' } } },
    },
    '/api/v1/billing': {
      get: { tags: ['Billing'], summary: 'List billing records', responses: { '200': { description: 'Paginated billing records' } } },
      post: { tags: ['Billing'], summary: 'Create billing record (managing_broker only)', responses: { '201': { description: 'Created' } } },
    },
    '/api/v1/billing/outstanding': {
      get: { tags: ['Billing'], summary: 'Get outstanding balances by agent', responses: { '200': { description: 'Aging report data' } } },
    },
    '/api/v1/compliance/check': {
      post: { tags: ['Compliance'], summary: 'Check content for compliance violations', responses: { '200': { description: 'Compliance check results' } } },
    },
    '/api/v1/compliance/rules': {
      get: { tags: ['Compliance'], summary: 'List compliance rules', responses: { '200': { description: 'List of rules' } } },
    },
    '/api/v1/signing/envelopes': {
      post: { tags: ['Signing'], summary: 'Create a signing envelope', responses: { '201': { description: 'Envelope created' } } },
    },
    '/api/v1/social-posts': {
      get: { tags: ['Social'], summary: 'List social media posts', responses: { '200': { description: 'Paginated posts' } } },
      post: { tags: ['Social'], summary: 'Create a social media post', responses: { '201': { description: 'Post created' } } },
    },
    '/api/v1/email-inbox': {
      get: { tags: ['Email'], summary: 'List email messages', responses: { '200': { description: 'Paginated emails' } } },
    },
    '/api/v1/media': {
      get: { tags: ['Media'], summary: 'List media assets', responses: { '200': { description: 'Paginated assets' } } },
    },
    '/api/v1/users': {
      get: { tags: ['Users'], summary: 'List users (managing_broker only)', responses: { '200': { description: 'List of users' } } },
    },
    '/api/v1/users/me': {
      get: { tags: ['Users'], summary: 'Get current user profile', responses: { '200': { description: 'Current user' } } },
      patch: { tags: ['Users'], summary: 'Update current user profile', responses: { '200': { description: 'Updated' } } },
    },
    '/health': {
      get: { tags: ['Health'], summary: 'Basic health check', security: [], responses: { '200': { description: 'Service is running' } } },
    },
    '/health/ready': {
      get: { tags: ['Health'], summary: 'Readiness probe (checks DB + Redis)', security: [], responses: { '200': { description: 'All dependencies healthy' }, '503': { description: 'One or more dependencies unhealthy' } } },
    },
  },
  tags: [
    { name: 'Authentication', description: 'Login, register, token refresh, logout' },
    { name: 'Transactions', description: 'Real estate transaction management' },
    { name: 'Contacts', description: 'CRM contact management' },
    { name: 'Documents', description: 'Document upload and management' },
    { name: 'Billing', description: 'Agent billing and invoicing' },
    { name: 'Compliance', description: 'Content compliance checking' },
    { name: 'Signing', description: 'E-signature envelopes and workflows' },
    { name: 'Social', description: 'Social media post management' },
    { name: 'Email', description: 'Email inbox and settings' },
    { name: 'Media', description: 'Media asset management' },
    { name: 'Users', description: 'User profile and management' },
    { name: 'Health', description: 'Health and readiness probes' },
  ],
};

// JSON spec
router.get('/', (_req: Request, res: Response) => {
  res.json(openApiSpec);
});

// Spec summary for quick reference
router.get('/summary', (_req: Request, res: Response) => {
  const endpoints = Object.entries(openApiSpec.paths).flatMap(([path, methods]) =>
    Object.entries(methods as Record<string, any>).map(([method, details]) => ({
      method: method.toUpperCase(),
      path,
      summary: details.summary,
      tags: details.tags,
    })),
  );
  res.json({
    totalEndpoints: endpoints.length,
    endpoints,
  });
});

export default router;
