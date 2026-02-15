import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

import { db } from '../lib/db';
import { users, sessions, tenants } from '../lib/schema';
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../lib/jwt';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  checkPwnedPassword,
} from '../lib/password';
import { logAudit } from '../lib/audit';
import { sendPasswordResetEmail, sendVerificationEmail } from '../lib/email';
import { getDefaultPermissions, resolvePermissions } from '../lib/permissions';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/error-handler';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rate-limiter';
import { redis } from '../lib/redis';

// ------------------------------------------------------------------ //
//  Constants                                                          //
// ------------------------------------------------------------------ //

const JWT_SECRET = process.env.JWT_SECRET ?? 'changeme-not-for-production';

const REFRESH_COOKIE_NAME = 'crestdesk_refresh';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 minutes

const MFA_SETUP_TTL_SECONDS = 10 * 60; // 10 minutes
const MFA_TOKEN_EXPIRY = '5m';
const MFA_BACKUP_CODE_COUNT = 10;

const PASSWORD_RESET_TTL_SECONDS = 60 * 60; // 1 hour

// ------------------------------------------------------------------ //
//  Helpers                                                            //
// ------------------------------------------------------------------ //

function getRequestId(req: Request): string {
  return (req.headers['x-request-id'] as string) ?? uuidv4();
}

function getDeviceInfo(req: Request) {
  return {
    userAgent: req.headers['user-agent'] ?? 'unknown',
    ip: req.ip ?? 'unknown',
  };
}

function sanitizeUser(user: Record<string, unknown>) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    tenantId: user.tenantId,
    mfaEnabled: user.mfaEnabled,
    emailVerified: user.emailVerified,
    onboardingCompleted: user.onboardingCompleted,
    onboardingStep: user.onboardingStep,
    avatarUrl: user.avatarUrl,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
  });
}

/**
 * Create a new session in the DB, set the refresh cookie, and return an
 * access token. Shared by register, login, and MFA verify flows.
 */
async function createSessionAndRespond(
  res: Response,
  req: Request,
  user: Record<string, unknown>,
): Promise<{ accessToken: string }> {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const deviceInfo = getDeviceInfo(req);
  const permissions = getDefaultPermissions(user.role as string);

  await db.insert(sessions).values({
    userId: user.id as string,
    tenantId: user.tenantId as string,
    refreshTokenHash,
    deviceInfo,
    ipAddress: req.ip ?? '0.0.0.0',
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
  });

  const accessToken = signAccessToken({
    userId: user.id as string,
    tenantId: user.tenantId as string,
    role: user.role as string,
    permissions,
  });

  setRefreshCookie(res, refreshToken);

  return { accessToken };
}

// ------------------------------------------------------------------ //
//  Validation schemas                                                 //
// ------------------------------------------------------------------ //

const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const mfaVerifySchema = z.object({
  mfaToken: z.string().min(1, 'MFA token is required'),
  code: z.string().min(1, 'MFA code is required'),
});

const mfaConfirmSchema = z.object({
  code: z.string().min(6, 'Code must be at least 6 characters').max(8),
});

const mfaDisableSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(1, 'Password is required'),
});

// ------------------------------------------------------------------ //
//  Async handler wrapper                                              //
// ------------------------------------------------------------------ //

/**
 * Wraps an async route handler so that rejected promises are forwarded
 * to the Express error handler instead of crashing the process.
 */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

// ------------------------------------------------------------------ //
//  Router                                                             //
// ------------------------------------------------------------------ //

const router = Router();

// Apply the stricter auth rate limiter to every route in this group.
router.use(authLimiter);

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/register                                         //
// ------------------------------------------------------------------ //
router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = getRequestId(req);
    const body = registerSchema.parse(req.body);

    // Validate password strength
    const strengthError = validatePasswordStrength(body.password);
    if (strengthError) {
      throw new AppError(400, 'WEAK_PASSWORD', strengthError);
    }

    // Check Have I Been Pwned (warn only, do not block)
    const pwned = await checkPwnedPassword(body.password);
    if (pwned) {
      logger.warn(
        { requestId, email: body.email },
        'Password found in breached dataset (registration allowed)',
      );
    }

    // Check if email already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      throw new AppError(
        409,
        'EMAIL_EXISTS',
        'An account with this email already exists',
      );
    }

    // Hash password with Argon2id
    const passwordHash = await hashPassword(body.password);

    // Create tenant
    const tenantName = `${body.firstName} ${body.lastName}'s Brokerage`;
    const tenantSlug = slugify(body.email.split('@')[0]);

    const [newTenant] = await db
      .insert(tenants)
      .values({
        name: tenantName,
        slug: tenantSlug,
        primaryState: 'OR',
      })
      .returning({ id: tenants.id });

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        tenantId: newTenant.id,
        email: body.email.toLowerCase(),
        passwordHash,
        role: 'owner',
        firstName: body.firstName,
        lastName: body.lastName,
      })
      .returning();

    // Update tenant with owner user ID
    await db
      .update(tenants)
      .set({ ownerUserId: newUser.id })
      .where(eq(tenants.id, newTenant.id));

    // Create session and get tokens
    const { accessToken } = await createSessionAndRespond(res, req, newUser);

    // Log audit event
    logAudit({
      tenantId: newTenant.id,
      userId: newUser.id,
      action: 'user.registered',
      resourceType: 'user',
      resourceId: newUser.id,
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
    });

    // Send verification email (fire-and-forget)
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyHash = crypto
      .createHash('sha256')
      .update(verifyToken)
      .digest('hex');
    redis
      .set(`email_verify:${verifyHash}`, newUser.id, 'EX', 24 * 60 * 60)
      .catch((err) => {
        logger.error({ err }, 'Failed to store email verification token');
      });
    sendVerificationEmail(newUser.email, verifyToken).catch((err) => {
      logger.error({ err }, 'Failed to send verification email');
    });

    logger.info(
      { requestId, userId: newUser.id, tenantId: newTenant.id },
      'User registered successfully',
    );

    res.status(201).json({
      data: {
        user: sanitizeUser(newUser),
        accessToken,
      },
    });
  }),
);

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/login                                            //
// ------------------------------------------------------------------ //
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = getRequestId(req);
    const body = loginSchema.parse(req.body);

    // Find user by email (where deletedAt IS NULL)
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, body.email.toLowerCase()),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Check account lockout
    const lockoutKey = `lockout:${user.id}`;
    const lockoutData = await redis.get(lockoutKey);

    if (lockoutData) {
      const failCount = parseInt(lockoutData, 10);
      if (failCount >= LOCKOUT_THRESHOLD) {
        const ttl = await redis.ttl(lockoutKey);
        throw new AppError(
          429,
          'ACCOUNT_LOCKED',
          `Account is temporarily locked. Try again in ${Math.ceil(ttl / 60)} minutes`,
        );
      }
    }

    // Verify password
    const passwordValid = await verifyPassword(user.passwordHash, body.password);

    if (!passwordValid) {
      // Increment fail count
      const currentCount = lockoutData ? parseInt(lockoutData, 10) : 0;
      const newCount = currentCount + 1;
      await redis.set(lockoutKey, newCount.toString(), 'EX', LOCKOUT_DURATION_SECONDS);

      logAudit({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'user.login.failed',
        resourceType: 'user',
        resourceId: user.id,
        details: { reason: 'invalid_password', failCount: newCount },
        ipAddress: req.ip ?? undefined,
        userAgent: req.headers['user-agent'] ?? undefined,
      });

      logger.warn(
        { requestId, userId: user.id, failCount: newCount },
        'Login failed: invalid password',
      );

      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // If MFA is enabled, return a short-lived MFA token
    if (user.mfaEnabled) {
      const mfaToken = jwt.sign(
        { sub: user.id, purpose: 'mfa' },
        JWT_SECRET,
        { expiresIn: MFA_TOKEN_EXPIRY },
      );

      logger.info({ requestId, userId: user.id }, 'MFA required for login');

      res.status(200).json({
        data: {
          mfaRequired: true,
          mfaToken,
        },
      });
      return;
    }

    // No MFA: create session and respond
    const { accessToken } = await createSessionAndRespond(res, req, user);

    // Update lastLoginAt
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    // Clear lockout
    await redis.del(lockoutKey);

    logAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'user.login',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
    });

    logger.info({ requestId, userId: user.id }, 'User logged in successfully');

    res.status(200).json({
      data: {
        user: sanitizeUser(user),
        accessToken,
      },
    });
  }),
);

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/mfa/verify                                      //
// ------------------------------------------------------------------ //
router.post(
  '/mfa/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = getRequestId(req);
    const body = mfaVerifySchema.parse(req.body);

    // Verify MFA token JWT
    let decoded: { sub: string; purpose: string };
    try {
      decoded = jwt.verify(body.mfaToken, JWT_SECRET) as {
        sub: string;
        purpose: string;
      };
    } catch {
      throw new AppError(401, 'INVALID_MFA_TOKEN', 'MFA token is invalid or expired');
    }

    if (decoded.purpose !== 'mfa') {
      throw new AppError(401, 'INVALID_MFA_TOKEN', 'MFA token is invalid or expired');
    }

    // Load user
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, decoded.sub), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      throw new AppError(401, 'INVALID_MFA_TOKEN', 'User not found');
    }

    if (!user.mfaSecret) {
      throw new AppError(400, 'MFA_NOT_CONFIGURED', 'MFA is not configured for this user');
    }

    // Verify TOTP code
    let codeValid = authenticator.check(body.code, user.mfaSecret);

    // If TOTP fails, check backup codes
    if (!codeValid && user.mfaBackupCodes && user.mfaBackupCodes.length > 0) {
      const codeHash = crypto
        .createHash('sha256')
        .update(body.code)
        .digest('hex');

      const backupIndex = user.mfaBackupCodes.findIndex(
        (bc) => bc === codeHash,
      );

      if (backupIndex !== -1) {
        codeValid = true;
        // Remove the used backup code
        const updatedCodes = [...user.mfaBackupCodes];
        updatedCodes.splice(backupIndex, 1);
        await db
          .update(users)
          .set({ mfaBackupCodes: updatedCodes, updatedAt: new Date() })
          .where(eq(users.id, user.id));

        logger.info(
          { requestId, userId: user.id },
          'MFA backup code used',
        );
      }
    }

    if (!codeValid) {
      throw new AppError(401, 'INVALID_MFA_CODE', 'Invalid MFA code');
    }

    // Create session and respond
    const { accessToken } = await createSessionAndRespond(res, req, user);

    // Update lastLoginAt
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    // Clear lockout
    await redis.del(`lockout:${user.id}`);

    logAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'user.login',
      resourceType: 'user',
      resourceId: user.id,
      details: { method: 'mfa' },
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
    });

    logger.info({ requestId, userId: user.id }, 'MFA verification successful');

    res.status(200).json({
      data: {
        user: sanitizeUser(user),
        accessToken,
      },
    });
  }),
);

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/mfa/setup  (requires auth)                      //
// ------------------------------------------------------------------ //
router.post(
  '/mfa/setup',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = getRequestId(req);
    const userId = req.user!.userId;

    // Generate TOTP secret
    const secret = authenticator.generateSecret();

    // Load user email for the QR code label
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Generate QR code
    const otpauthUrl = authenticator.keyuri(user.email, 'CrestDesk', secret);
    const qrCodeUrl = await toDataURL(otpauthUrl);

    // Store secret in Redis with 10 minute TTL
    await redis.set(
      `mfa_setup:${userId}`,
      secret,
      'EX',
      MFA_SETUP_TTL_SECONDS,
    );

    logger.info({ requestId, userId }, 'MFA setup initiated');

    res.status(200).json({
      data: {
        secret,
        qrCodeUrl,
      },
    });
  }),
);

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/mfa/confirm  (requires auth)                    //
// ------------------------------------------------------------------ //
router.post(
  '/mfa/confirm',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = getRequestId(req);
    const userId = req.user!.userId;
    const body = mfaConfirmSchema.parse(req.body);

    // Read secret from Redis
    const secret = await redis.get(`mfa_setup:${userId}`);
    if (!secret) {
      throw new AppError(
        400,
        'MFA_SETUP_EXPIRED',
        'MFA setup has expired. Please start setup again.',
      );
    }

    // Verify TOTP code against the setup secret
    const codeValid = authenticator.check(body.code, secret);
    if (!codeValid) {
      throw new AppError(400, 'INVALID_MFA_CODE', 'Invalid verification code');
    }

    // Generate backup codes
    const backupCodes: string[] = [];
    const hashedBackupCodes: string[] = [];
    for (let i = 0; i < MFA_BACKUP_CODE_COUNT; i++) {
      const code = crypto.randomBytes(4).toString('hex');
      backupCodes.push(code);
      hashedBackupCodes.push(
        crypto.createHash('sha256').update(code).digest('hex'),
      );
    }

    // Save MFA config to user record
    await db
      .update(users)
      .set({
        mfaEnabled: true,
        mfaSecret: secret,
        mfaBackupCodes: hashedBackupCodes,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Delete the Redis key
    await redis.del(`mfa_setup:${userId}`);

    logAudit({
      tenantId: req.user!.tenantId,
      userId,
      action: 'user.mfa.enabled',
      resourceType: 'user',
      resourceId: userId,
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
    });

    logger.info({ requestId, userId }, 'MFA enabled successfully');

    res.status(200).json({
      data: {
        backupCodes,
      },
    });
  }),
);

// ------------------------------------------------------------------ //
//  DELETE /api/v1/auth/mfa  (requires auth)                           //
// ------------------------------------------------------------------ //
router.delete(
  '/mfa',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = getRequestId(req);
    const userId = req.user!.userId;
    const body = mfaDisableSchema.parse(req.body);

    // Load user to verify password
    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const passwordValid = await verifyPassword(user.passwordHash, body.password);
    if (!passwordValid) {
      throw new AppError(401, 'INVALID_PASSWORD', 'Current password is incorrect');
    }

    // Disable MFA
    await db
      .update(users)
      .set({
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logAudit({
      tenantId: req.user!.tenantId,
      userId,
      action: 'user.mfa.disabled',
      resourceType: 'user',
      resourceId: userId,
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
    });

    logger.info({ requestId, userId }, 'MFA disabled successfully');

    res.status(200).json({
      data: { success: true },
    });
  }),
);

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/refresh                                          //
// ------------------------------------------------------------------ //
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = getRequestId(req);
    const refreshToken = req.cookies?.crestdesk_refresh as string | undefined;

    if (!refreshToken) {
      throw new AppError(401, 'NO_REFRESH_TOKEN', 'No refresh token provided');
    }

    const tokenHash = hashRefreshToken(refreshToken);

    // Look up active session by refresh token hash
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.refreshTokenHash, tokenHash),
          isNull(sessions.revokedAt),
          sql`${sessions.expiresAt} > NOW()`,
        ),
      )
      .limit(1);

    if (!session) {
      // Check if this hash matches a REVOKED session -> possible token theft
      const [revokedSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.refreshTokenHash, tokenHash))
        .limit(1);

      if (revokedSession) {
        // TOKEN THEFT DETECTED: revoke ALL sessions for this user
        logger.error(
          {
            requestId,
            userId: revokedSession.userId,
            sessionId: revokedSession.id,
          },
          'Token reuse detected! Revoking all sessions for user.',
        );

        await db
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(sessions.userId, revokedSession.userId),
              isNull(sessions.revokedAt),
            ),
          );

        logAudit({
          tenantId: revokedSession.tenantId,
          userId: revokedSession.userId,
          action: 'security.token_reuse_detected',
          resourceType: 'session',
          resourceId: revokedSession.id,
          details: { reason: 'refresh_token_reuse' },
          ipAddress: req.ip ?? undefined,
          userAgent: req.headers['user-agent'] ?? undefined,
        });
      }

      clearRefreshCookie(res);
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid');
    }

    // Load user
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.userId), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      clearRefreshCookie(res);
      throw new AppError(401, 'USER_NOT_FOUND', 'User account not found');
    }

    // Revoke current session (rotation)
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, session.id));

    // Create new session with new refresh token
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
    const deviceInfo = getDeviceInfo(req);
    const permissions = getDefaultPermissions(user.role);

    await db.insert(sessions).values({
      userId: user.id,
      tenantId: user.tenantId,
      refreshTokenHash: newRefreshTokenHash,
      deviceInfo,
      ipAddress: req.ip ?? '0.0.0.0',
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
    });

    // Sign new access token
    const accessToken = signAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      permissions,
    });

    // Set new cookie
    setRefreshCookie(res, newRefreshToken);

    logger.debug({ requestId, userId: user.id }, 'Token refreshed');

    res.status(200).json({
      data: { accessToken },
    });
  }),
);

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/logout  (requires auth)                          //
// ------------------------------------------------------------------ //
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = getRequestId(req);
    const refreshToken = req.cookies?.crestdesk_refresh as string | undefined;

    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);

      // Revoke the session
      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(sessions.refreshTokenHash, tokenHash),
            isNull(sessions.revokedAt),
          ),
        );
    }

    clearRefreshCookie(res);

    logAudit({
      tenantId: req.user!.tenantId,
      userId: req.user!.userId,
      action: 'session.revoked',
      resourceType: 'session',
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
    });

    logger.info({ requestId, userId: req.user!.userId }, 'User logged out');

    res.status(200).json({
      data: { success: true },
    });
  }),
);

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/forgot-password                                  //
// ------------------------------------------------------------------ //
router.post(
  '/forgot-password',
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = getRequestId(req);
    const body = forgotPasswordSchema.parse(req.body);

    // Always return success to avoid leaking whether an email exists
    const successResponse = {
      data: {
        message: 'If an account exists, a reset email has been sent',
      },
    };

    // Find user by email
    const [user] = await db
      .select({ id: users.id, email: users.email, tenantId: users.tenantId })
      .from(users)
      .where(
        and(
          eq(users.email, body.email.toLowerCase()),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!user) {
      logger.debug(
        { requestId, email: body.email },
        'Password reset requested for non-existent email',
      );
      res.status(200).json(successResponse);
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Store in Redis with 1 hour TTL
    await redis.set(
      `pwd_reset:${resetHash}`,
      user.id,
      'EX',
      PASSWORD_RESET_TTL_SECONDS,
    );

    // Send password reset email
    await sendPasswordResetEmail(user.email, resetToken);

    logAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'user.password.reset_requested',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
    });

    logger.info(
      { requestId, userId: user.id },
      'Password reset email sent',
    );

    res.status(200).json(successResponse);
  }),
);

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/reset-password                                   //
// ------------------------------------------------------------------ //
router.post(
  '/reset-password',
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = getRequestId(req);
    const body = resetPasswordSchema.parse(req.body);

    // Hash the token and look it up in Redis
    const tokenHash = crypto
      .createHash('sha256')
      .update(body.token)
      .digest('hex');

    const userId = await redis.get(`pwd_reset:${tokenHash}`);
    if (!userId) {
      throw new AppError(
        400,
        'INVALID_RESET_TOKEN',
        'Password reset token is invalid or has expired',
      );
    }

    // Validate new password strength
    const strengthError = validatePasswordStrength(body.password);
    if (strengthError) {
      throw new AppError(400, 'WEAK_PASSWORD', strengthError);
    }

    // Hash the new password
    const passwordHash = await hashPassword(body.password);

    // Update user's password
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Delete the Redis key
    await redis.del(`pwd_reset:${tokenHash}`);

    // Revoke ALL user sessions
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(sessions.userId, userId), isNull(sessions.revokedAt)),
      );

    // Load user for audit
    const [user] = await db
      .select({ tenantId: users.tenantId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user) {
      logAudit({
        tenantId: user.tenantId,
        userId,
        action: 'user.password.reset',
        resourceType: 'user',
        resourceId: userId,
        ipAddress: req.ip ?? undefined,
        userAgent: req.headers['user-agent'] ?? undefined,
      });
    }

    logger.info({ requestId, userId }, 'Password reset completed');

    res.status(200).json({
      data: { success: true },
    });
  }),
);

export default router;
