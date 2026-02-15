import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../lib/db';
import { complianceRules } from '../lib/schema';
import { authenticate } from '../middleware/auth';
import { logAudit } from '../lib/audit';
import { AppError } from '../middleware/error-handler';

// ------------------------------------------------------------------ //
//  Constants                                                          //
// ------------------------------------------------------------------ //

const US_STATES: Array<{ code: string; name: string }> = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const VALID_STATE_CODES = new Set(US_STATES.map((s) => s.code));

const VALID_CONTENT_TYPES = [
  'social_post',
  'listing_image',
  'email',
  'document',
  'video',
] as const;

// ------------------------------------------------------------------ //
//  Fair Housing protected-class terms                                 //
// ------------------------------------------------------------------ //

const FAIR_HOUSING_TERMS: Record<string, string[]> = {
  familial_status: [
    'family', 'families', 'children', 'kids', 'no children',
    'adults only', 'single', 'married', 'couple',
  ],
  race: [
    'race', 'racial', 'white', 'black', 'asian',
    'hispanic', 'latino', 'african american',
  ],
  religion: [
    'church', 'synagogue', 'mosque', 'temple',
    'christian', 'muslim', 'jewish', 'catholic',
  ],
  national_origin: [
    'immigrant', 'foreigner', 'citizen only',
    'english only', 'american born',
  ],
  disability: [
    'handicap', 'wheelchair', 'disabled', 'crippled',
    'deaf', 'blind', 'mentally ill',
  ],
  sex: [
    'bachelor', 'bachelor pad', 'man cave',
    'master bedroom', 'his and hers',
  ],
};

/**
 * Terms that are commonly used in legitimate architectural / real-estate
 * contexts and should produce a warning rather than a critical violation.
 */
const AMBIGUOUS_TERMS = new Set([
  'master bedroom',
  'walking distance',
  'family room',
  'single family',
  'family friendly',
]);

// ------------------------------------------------------------------ //
//  Validation schemas                                                 //
// ------------------------------------------------------------------ //

const complianceCheckSchema = z.object({
  content: z.string().min(1),
  contentType: z.enum(VALID_CONTENT_TYPES),
  state: z
    .string()
    .length(2)
    .transform((v) => v.toUpperCase())
    .refine((v) => VALID_STATE_CODES.has(v), {
      message: 'Invalid US state code',
    }),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ------------------------------------------------------------------ //
//  Compliance-checking helpers                                        //
// ------------------------------------------------------------------ //

interface Violation {
  ruleKey: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  jurisdiction: string;
  enforcement: 'block' | 'warn' | 'require' | 'insert';
}

interface RequiredInsertion {
  element: string;
  content: string;
  position: string;
}

/**
 * Build a word-boundary regex for a term. Multi-word terms are matched
 * as a phrase; single-word terms use \b anchors.
 */
function termRegex(term: string): RegExp {
  // Escape regex special chars in the term.
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i');
}

function checkFairHousing(content: string): Violation[] {
  const violations: Violation[] = [];
  const lowerContent = content.toLowerCase();

  for (const [protectedClass, terms] of Object.entries(FAIR_HOUSING_TERMS)) {
    for (const term of terms) {
      if (!termRegex(term).test(lowerContent)) continue;

      const isAmbiguous = AMBIGUOUS_TERMS.has(term);

      violations.push({
        ruleKey: `US.advertising.fair_housing.${protectedClass}`,
        severity: isAmbiguous ? 'warning' : 'critical',
        message: isAmbiguous
          ? `Potentially problematic term "${term}" detected. Review in context to ensure Fair Housing compliance.`
          : `Content contains protected-class term "${term}" which may violate Fair Housing Act guidelines.`,
        jurisdiction: 'US',
        enforcement: isAmbiguous ? 'warn' : 'block',
      });
    }
  }

  return violations;
}

function checkAdvertisingLicense(
  _content: string,
  state: string,
  rules: Array<{ ruleKey: string; parameters: unknown }>,
): { violations: Violation[]; insertions: RequiredInsertion[] } {
  const violations: Violation[] = [];
  const insertions: RequiredInsertion[] = [];

  // Look for a state-specific rule that requires a license number.
  const licenseRule = rules.find(
    (r) =>
      r.ruleKey.includes('license') &&
      (r.ruleKey.startsWith(`${state}.`) || r.ruleKey.startsWith('US.')),
  );

  if (licenseRule) {
    const params = (licenseRule.parameters ?? {}) as Record<string, unknown>;
    const requiresLicense = params.requireLicenseNumber === true;

    if (requiresLicense) {
      // Check if content already contains a license-number pattern.
      const licensePattern = /license\s*#?\s*\d+/i;
      if (!licensePattern.test(_content)) {
        violations.push({
          ruleKey: licenseRule.ruleKey,
          severity: 'warning',
          message: `${state} requires real estate license number to be displayed in advertising.`,
          jurisdiction: state,
          enforcement: 'require',
        });

        insertions.push({
          element: 'license_disclaimer',
          content: `License #[YOUR_LICENSE_NUMBER]`,
          position: 'footer',
        });
      }
    }
  }

  return { violations, insertions };
}

function checkCanSpam(content: string): Violation[] {
  const violations: Violation[] = [];

  const unsubPatterns = [
    /unsubscribe/i,
    /opt[\s-]?out/i,
    /remove\s+from\s+(this\s+)?list/i,
    /manage\s+(your\s+)?preferences/i,
    /email\s+preferences/i,
  ];

  const hasUnsubscribe = unsubPatterns.some((p) => p.test(content));

  if (!hasUnsubscribe) {
    violations.push({
      ruleKey: 'US.advertising.can_spam.unsubscribe',
      severity: 'critical',
      message: 'Email content must include an unsubscribe mechanism per CAN-SPAM Act.',
      jurisdiction: 'US',
      enforcement: 'require',
    });
  }

  return violations;
}

// ------------------------------------------------------------------ //
//  Router                                                             //
// ------------------------------------------------------------------ //

const router = Router();

// All compliance routes require authentication.
router.use(authenticate);

// ------------------------------------------------------------------ //
//  GET /api/v1/compliance/rules                                       //
// ------------------------------------------------------------------ //
router.get('/rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jurisdiction, category } = req.query;

    const conditions = [isNull(complianceRules.supersededDate)];

    if (typeof jurisdiction === 'string' && jurisdiction.length > 0) {
      conditions.push(eq(complianceRules.jurisdiction, jurisdiction.toUpperCase()));
    }
    if (typeof category === 'string' && category.length > 0) {
      conditions.push(eq(complianceRules.category, category));
    }

    const rules = await db
      .select()
      .from(complianceRules)
      .where(and(...conditions));

    res.json({ data: rules });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  GET /api/v1/compliance/rules/:state                                //
// ------------------------------------------------------------------ //
router.get(
  '/rules/:state',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stateCode = req.params.state.toUpperCase();

      if (!VALID_STATE_CODES.has(stateCode)) {
        throw new AppError(400, 'INVALID_STATE', `"${stateCode}" is not a valid US state code`);
      }

      const [stateRules, federalRules] = await Promise.all([
        db
          .select()
          .from(complianceRules)
          .where(
            and(
              eq(complianceRules.jurisdiction, stateCode),
              isNull(complianceRules.supersededDate),
            ),
          ),
        db
          .select()
          .from(complianceRules)
          .where(
            and(
              eq(complianceRules.jurisdiction, 'US'),
              isNull(complianceRules.supersededDate),
            ),
          ),
      ]);

      res.json({
        data: {
          federal: federalRules,
          state: stateRules,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------ //
//  POST /api/v1/compliance/check                                      //
// ------------------------------------------------------------------ //
router.post('/check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tenantId } = req.user!;
    const body = complianceCheckSchema.parse(req.body);

    // Load applicable rules: federal + state, where appliesTo contains the
    // content type and the rule is currently active (not superseded).
    const applicableRules = await db
      .select()
      .from(complianceRules)
      .where(
        and(
          inArray(complianceRules.jurisdiction, ['US', body.state]),
          isNull(complianceRules.supersededDate),
          sql`${body.contentType} = ANY(${complianceRules.appliesTo})`,
        ),
      );

    const violations: Violation[] = [];
    const requiredInsertions: RequiredInsertion[] = [];

    // 1. Fair Housing check (all content types)
    violations.push(...checkFairHousing(body.content));

    // 2. Advertising license check
    const licenseResult = checkAdvertisingLicense(body.content, body.state, applicableRules);
    violations.push(...licenseResult.violations);
    requiredInsertions.push(...licenseResult.insertions);

    // 3. CAN-SPAM check (emails only)
    if (body.contentType === 'email') {
      violations.push(...checkCanSpam(body.content));
    }

    // 4. Equal Housing Opportunity check
    const needsEqualHousing =
      ['social_post', 'listing_image', 'email', 'document'].includes(body.contentType) &&
      !/equal\s+housing\s+opportunity/i.test(body.content);

    if (needsEqualHousing) {
      requiredInsertions.push({
        element: 'equal_housing_opportunity',
        content: 'Equal Housing Opportunity',
        position: 'footer',
      });
    }

    const compliant = violations.length === 0;

    logAudit({
      tenantId,
      userId,
      action: 'compliance.check',
      resourceType: 'compliance',
      details: {
        contentType: body.contentType,
        state: body.state,
        compliant,
        violationCount: violations.length,
        insertionCount: requiredInsertions.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      data: {
        compliant,
        violations,
        requiredInsertions,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  GET /api/v1/compliance/states                                      //
// ------------------------------------------------------------------ //
router.get('/states', (_req: Request, res: Response) => {
  res.json({ data: US_STATES });
});

export default router;
