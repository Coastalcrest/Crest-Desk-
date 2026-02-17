import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../lib/db';
import { users, sessions, permissions } from '../lib/schema';
import { authenticate } from '../middleware/auth';
import { requireRole, getDefaultPermissions, resolvePermissions } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { sendInviteEmail } from '../lib/email';
import { verifyPassword, hashPassword, validatePasswordStrength } from '../lib/password';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/error-handler';
import { z } from 'zod';
import { eq, and, sql, isNull, desc } from 'drizzle-orm';
import { redis } from '../lib/redis';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';

const router = Router();

// All user routes require authentication.
router.use(authenticate);

// ------------------------------------------------------------------ //
//  Helpers                                                            //
// ------------------------------------------------------------------ //

function sanitizeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    tenantId: user.tenantId,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    licensedStates: user.licensedStates,
    licenseNumbers: user.licenseNumbers,
    mfaEnabled: user.mfaEnabled,
    emailVerified: user.emailVerified,
    onboardingCompleted: user.onboardingCompleted,
    onboardingStep: user.onboardingStep,
    preferences: user.preferences,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

const ROLE_HIERARCHY: Record<string, number> = {
  agent: 0,
  managing_broker: 1,
  principal_broker: 2,
  owner: 3,
};

// ------------------------------------------------------------------ //
//  GET /api/v1/users/me                                               //
// ------------------------------------------------------------------ //
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    const overrides = await db
      .select()
      .from(permissions)
      .where(eq(permissions.userId, userId));

    const effectivePermissions = resolvePermissions(
      user.role,
      overrides.map((o) => ({
        resource: o.resource,
        action: o.action,
        scope: o.scope,
        granted: o.granted ?? true,
      })),
    );

    res.json({
      data: {
        ...sanitizeUser(user),
        permissions: effectivePermissions,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  PATCH /api/v1/users/me                                             //
// ------------------------------------------------------------------ //
const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  avatarUrl: z.string().url().max(500).optional(),
  preferences: z.record(z.unknown()).optional(),
});

router.patch('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const body = updateProfileSchema.parse(req.body);

    // Only include fields that were actually provided
    const updates: Record<string, unknown> = {};
    if (body.firstName !== undefined) updates.firstName = body.firstName;
    if (body.lastName !== undefined) updates.lastName = body.lastName;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;
    if (body.preferences !== undefined) updates.preferences = body.preferences;

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, 'BAD_REQUEST', 'No fields to update');
    }

    // Fetch before snapshot for audit
    const [before] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!before) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    logAudit({
      tenantId: req.user!.tenantId,
      userId,
      action: 'user.profile.updated',
      resourceType: 'user',
      resourceId: userId,
      details: {
        before: sanitizeUser(before),
        after: sanitizeUser(updated),
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ data: sanitizeUser(updated) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  GET /api/v1/users/me/sessions                                      //
// ------------------------------------------------------------------ //
router.get('/me/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const currentIp = req.ip ?? req.headers['x-forwarded-for'] ?? '';

    const activeSessions = await db
      .select({
        id: sessions.id,
        deviceInfo: sessions.deviceInfo,
        ipAddress: sessions.ipAddress,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          sql`${sessions.expiresAt} > NOW()`,
        ),
      )
      .orderBy(desc(sessions.createdAt));

    // Format for frontend: deviceInfo as string, add isCurrent flag
    const formatted = activeSessions.map((s, i) => ({
      id: s.id,
      deviceInfo: typeof s.deviceInfo === 'object' && s.deviceInfo
        ? (s.deviceInfo as any).userAgent ?? (s.deviceInfo as any).browser ?? JSON.stringify(s.deviceInfo)
        : String(s.deviceInfo ?? 'Unknown device'),
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      isCurrent: i === 0, // Most recent session is likely the current one
    }));

    res.json({ data: formatted });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  DELETE /api/v1/users/me/sessions/:id                               //
// ------------------------------------------------------------------ //
router.delete('/me/sessions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const sessionId = req.params.id;

    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, userId),
        ),
      )
      .limit(1);

    if (!session) {
      throw new AppError(404, 'NOT_FOUND', 'Session not found');
    }

    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, sessionId));

    logAudit({
      tenantId: req.user!.tenantId,
      userId,
      action: 'session.revoked',
      resourceType: 'session',
      resourceId: sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  PATCH /api/v1/users/me/password                                    //
// ------------------------------------------------------------------ //
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.patch('/me/password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    // Fetch current password hash
    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.passwordHash) {
      throw new AppError(400, 'BAD_REQUEST', 'No password set for this account');
    }

    // Verify current password
    const isValid = await verifyPassword(user.passwordHash, currentPassword);
    if (!isValid) {
      throw new AppError(401, 'INVALID_PASSWORD', 'Current password is incorrect');
    }

    // Validate new password strength
    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      throw new AppError(400, 'WEAK_PASSWORD', strengthError);
    }

    // Hash and update
    const newHash = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    logAudit({
      tenantId: req.user!.tenantId,
      userId,
      action: 'password.changed',
      resourceType: 'user',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  GET /api/v1/users/me/notifications                                 //
// ------------------------------------------------------------------ //
const DEFAULT_NOTIFICATION_PREFS = {
  preferences: {
    transactions: { email: true, push: true, sms: false },
    leads: { email: true, push: true, sms: true },
    documents: { email: true, push: true, sms: false },
    marketing: { email: true, push: false, sms: false },
    compliance_alerts: { email: true, push: true, sms: true },
    team_updates: { email: true, push: false, sms: false },
  },
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
  weekendDnd: false,
};

router.get('/me/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const [user] = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const prefs = (user?.preferences as any)?.notifications ?? DEFAULT_NOTIFICATION_PREFS;
    res.json({ data: prefs });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  PATCH /api/v1/users/me/notifications                               //
// ------------------------------------------------------------------ //
router.patch('/me/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const body = req.body;

    // Fetch current preferences
    const [user] = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const currentPrefs = (user?.preferences as any) ?? {};
    const updatedPrefs = { ...currentPrefs, notifications: body };

    await db
      .update(users)
      .set({ preferences: updatedPrefs, updatedAt: new Date() })
      .where(eq(users.id, userId));

    res.json({ data: body });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  POST /api/v1/users/invite                                          //
// ------------------------------------------------------------------ //
const inviteSchema = z.object({
  email: z.string().email().max(255),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['agent', 'managing_broker', 'principal_broker', 'owner']),
});

router.post('/invite', requireRole('principal_broker'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = inviteSchema.parse(req.body);
    const inviterRole = req.user!.role;
    const inviterLevel = ROLE_HIERARCHY[inviterRole] ?? -1;
    const inviteeLevel = ROLE_HIERARCHY[body.role] ?? Infinity;

    // Cannot invite someone with equal or higher role (unless owner)
    if (inviteeLevel >= inviterLevel) {
      throw new AppError(
        403,
        'FORBIDDEN',
        `You cannot invite a user with the ${body.role} role`,
      );
    }

    // Check email not already in use
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.email, body.email.toLowerCase()),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      throw new AppError(409, 'CONFLICT', 'A user with this email already exists');
    }

    // Generate invite token and store in Redis
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const invitePayload = {
      email: body.email.toLowerCase(),
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role,
      tenantId: req.user!.tenantId,
      invitedBy: req.user!.userId,
    };

    // 7 day TTL (604800 seconds)
    await redis.set(
      `invite:${tokenHash}`,
      JSON.stringify(invitePayload),
      'EX',
      604800,
    );

    // Get inviter and tenant names for the email
    const [inviter] = await db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);

    const { tenants } = await import('../lib/schema');
    const [tenant] = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, req.user!.tenantId))
      .limit(1);

    const inviterName = inviter
      ? `${inviter.firstName} ${inviter.lastName}`
      : 'A team member';
    const tenantName = tenant?.name ?? 'CrestDesk';

    await sendInviteEmail(body.email, inviterName, tenantName, rawToken);

    logAudit({
      tenantId: req.user!.tenantId,
      userId: req.user!.userId,
      action: 'user.invited',
      resourceType: 'user',
      details: {
        email: body.email,
        role: body.role,
        firstName: body.firstName,
        lastName: body.lastName,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      data: {
        message: 'Invitation sent',
        email: body.email,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  GET /api/v1/users                                                  //
// ------------------------------------------------------------------ //
router.get('/', requireRole('managing_broker'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage as string, 10) || 20));
    const search = (req.query.search as string | undefined)?.trim();

    const offset = (page - 1) * perPage;

    // Build where conditions
    const conditions = [
      eq(users.tenantId, tenantId),
      isNull(users.deletedAt),
    ];

    if (search) {
      conditions.push(
        sql`(
          ${users.firstName} ILIKE ${'%' + search + '%'}
          OR ${users.lastName} ILIKE ${'%' + search + '%'}
          OR ${users.email} ILIKE ${'%' + search + '%'}
        )`,
      );
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(users)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    // Get paginated users
    const rows = await db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(perPage)
      .offset(offset);

    res.json({
      data: rows.map(sanitizeUser),
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  GET /api/v1/users/:id                                              //
// ------------------------------------------------------------------ //
router.get('/:id', requireRole('managing_broker'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId;
    const targetId = req.params.id;

    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, targetId),
          eq(users.tenantId, tenantId),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    res.json({ data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  PATCH /api/v1/users/:id/role                                       //
// ------------------------------------------------------------------ //
const updateRoleSchema = z.object({
  role: z.enum(['agent', 'managing_broker', 'principal_broker', 'owner']),
});

router.patch('/:id/role', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const targetId = req.params.id;
    const tenantId = req.user!.tenantId;
    const body = updateRoleSchema.parse(req.body);

    // Cannot change own role
    if (targetId === userId) {
      throw new AppError(400, 'BAD_REQUEST', 'You cannot change your own role');
    }

    // Load target user, verify same tenant
    const [target] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, targetId),
          eq(users.tenantId, tenantId),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!target) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    const previousRole = target.role;

    const [updated] = await db
      .update(users)
      .set({ role: body.role, updatedAt: new Date() })
      .where(eq(users.id, targetId))
      .returning();

    logAudit({
      tenantId,
      userId,
      action: 'permission.override',
      resourceType: 'user',
      resourceId: targetId,
      details: {
        before: { role: previousRole },
        after: { role: body.role },
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ data: sanitizeUser(updated) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  DELETE /api/v1/users/:id                                           //
// ------------------------------------------------------------------ //
router.delete('/:id', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const targetId = req.params.id;
    const tenantId = req.user!.tenantId;

    // Cannot delete self
    if (targetId === userId) {
      throw new AppError(400, 'BAD_REQUEST', 'You cannot delete your own account');
    }

    // Load target user, verify same tenant
    const [target] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, targetId),
          eq(users.tenantId, tenantId),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!target) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    const now = new Date();

    // Soft delete the user
    await db
      .update(users)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(users.id, targetId));

    // Revoke all their active sessions
    await db
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(sessions.userId, targetId),
          isNull(sessions.revokedAt),
        ),
      );

    logAudit({
      tenantId,
      userId,
      action: 'user.deleted',
      resourceType: 'user',
      resourceId: targetId,
      details: {
        email: target.email,
        role: target.role,
        firstName: target.firstName,
        lastName: target.lastName,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
