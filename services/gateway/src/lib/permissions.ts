const ROLE_HIERARCHY: Record<string, number> = {
  agent: 0,
  managing_broker: 1,
  principal_broker: 2,
  owner: 3,
};

/**
 * Check if roleA is at least as high as roleB in the hierarchy.
 */
export function hasMinimumRole(
  userRole: string,
  requiredRole: string,
): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? Infinity;
  return userLevel >= requiredLevel;
}

/**
 * Get all default permissions for a given role.
 * Permissions follow the pattern: resource:action:scope
 */
export function getDefaultPermissions(role: string): string[] {
  const base: string[] = [
    // Agent base permissions
    'transactions:create:own',
    'transactions:read:own',
    'transactions:update:own',
    'contacts:create:own',
    'contacts:read:own',
    'contacts:update:own',
    'contacts:import:own',
    'contacts:export:own',
    'documents:upload:own',
    'documents:read:own',
    'documents:update:own',
    'documents:send_signature:own',
    'crm:pipeline:own',
    'crm:followup:own',
    'crm:leads:own',
    'crm:tags:own',
    'media:generate:own',
    'media:assets:read',
    'social:post:own',
    'social:accounts:own',
    'social:analytics:own',
    'email:read:own',
    'email:send:own',
    'sms:send:own',
    'crestai:query:own',
    'crestassist:use',
    'settings:profile:own',
    'settings:notifications:own',
    'settings:connections:own',
  ];

  if ((ROLE_HIERARCHY[role] ?? -1) < ROLE_HIERARCHY.managing_broker) {
    return base;
  }

  const managingBroker: string[] = [
    ...base,
    'transactions:read:team',
    'transactions:update:team',
    'transactions:reassign:team',
    'contacts:read:team',
    'contacts:reassign:team',
    'contacts:delete:team',
    'documents:read:team',
    'documents:review:team',
    'crm:pipeline:team',
    'crm:leads:distribute',
    'crm:followup:team',
    'crm:analytics:team',
    'social:review:team',
    'email:read:team',
    'crestai:query:team',
    'settings:team:manage',
  ];

  if ((ROLE_HIERARCHY[role] ?? -1) < ROLE_HIERARCHY.principal_broker) {
    return managingBroker;
  }

  const principalBroker: string[] = [
    ...managingBroker,
    'transactions:read:brokerage',
    'transactions:update:brokerage',
    'transactions:approve:brokerage',
    'transactions:delete:brokerage',
    'contacts:read:brokerage',
    'contacts:export:brokerage',
    'documents:read:brokerage',
    'documents:review:brokerage',
    'documents:approve:brokerage',
    'documents:export:brokerage',
    'compliance:view:brokerage',
    'compliance:rules:create',
    'compliance:rules:update',
    'compliance:reports:export',
    'compliance:override:brokerage',
    'crm:pipeline:brokerage',
    'crm:analytics:brokerage',
    'crm:followup:brokerage',
    'social:review:brokerage',
    'social:analytics:brokerage',
    'crestai:query:brokerage',
    'security:events:read',
    'security:settings:read',
    'security:breach:read',
    'developer:usage:read',
    'saas:subscription:read',
    'settings:users:invite',
    'settings:users:roles',
    'settings:compliance:manage',
    'settings:templates:manage',
  ];

  if ((ROLE_HIERARCHY[role] ?? -1) < ROLE_HIERARCHY.owner) {
    return principalBroker;
  }

  return [
    ...principalBroker,
    'financial:commissions:brokerage',
    'financial:quickbooks:manage',
    'financial:billing:manage',
    'financial:reports:brokerage',
    'financial:export:brokerage',
    'settings:users:roles:all',
    'settings:users:delete',
    'settings:users:permissions',
    'settings:branding:manage',
    'settings:subscription:manage',
    'settings:integrations:manage',
    'settings:api:manage',
    'settings:feature_flags:manage',
    'security:sessions:brokerage',
    'security:audit:full',
    'security:data:export',
    'security:policies:manage',
    'security:breach:manage',
    'security:ip_allowlist:manage',
    'developer:api_keys:manage',
    'developer:webhooks:manage',
    'developer:webhooks:read',
    'saas:white_label:manage',
    'saas:sdk:manage',
    'saas:onboarding:manage',
    'saas:subscription:manage',
    'saas:billing:manage',
  ];
}

/**
 * Resolve effective permissions for a user, combining role defaults with overrides.
 */
export function resolvePermissions(
  role: string,
  overrides: Array<{
    resource: string;
    action: string;
    scope: string;
    granted: boolean;
  }>,
): string[] {
  const defaults = new Set(getDefaultPermissions(role));

  for (const override of overrides) {
    const perm = `${override.resource}:${override.action}:${override.scope}`;
    if (override.granted) {
      defaults.add(perm);
    } else {
      defaults.delete(perm);
    }
  }

  return Array.from(defaults);
}

/**
 * Express middleware factory: require the caller to have a minimum role.
 */
export function requireRole(minimumRole: string) {
  return (req: any, res: any, next: any): void => {
    if (!req.user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (!hasMinimumRole(req.user.role, minimumRole)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `This action requires ${minimumRole} role or higher`,
          details: {
            required_role: minimumRole,
            your_role: req.user.role,
          },
        },
      });
      return;
    }

    next();
  };
}
