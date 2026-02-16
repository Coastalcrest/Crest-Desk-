import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../lib/audit';
import { logger } from '../lib/logger';

const router = Router();
router.use(requireAuth);

// Oregon compliance checklist template
const OREGON_CHECKLIST_ITEMS = [
  // Federal items
  { id: 'fed_lead_paint', title: 'Lead-Based Paint Disclosure', category: 'federal', required: true, description: 'Required for properties built before 1978 per 42 U.S.C. § 4852d', conditional: 'pre_1978' },
  { id: 'fed_tila', title: 'TILA Disclosure', category: 'federal', required: true, description: 'Truth in Lending Act disclosure required for financed purchases', conditional: 'financed' },
  { id: 'fed_respa', title: 'RESPA Compliance', category: 'federal', required: true, description: 'Real Estate Settlement Procedures Act compliance check' },
  { id: 'fed_fair_housing', title: 'Fair Housing Compliance', category: 'federal', required: true, description: 'Fair Housing Act compliance for all marketing and communications' },
  { id: 'fed_equal_housing', title: 'Equal Housing Opportunity Statement', category: 'federal', required: true, description: 'Equal Housing Opportunity logo and statement in marketing materials' },
  // Oregon-specific items
  { id: 'or_seller_disclosure', title: 'Seller Property Condition Disclosure', category: 'state', required: true, description: 'Oregon seller must complete and deliver property condition disclosure per ORS 93.275', statute: 'ORS 93.275' },
  { id: 'or_buyer_inspect', title: 'Buyer Right to Inspect', category: 'state', required: true, description: 'Inspection contingency period documented per Oregon common law', statute: 'ORS 93.275' },
  { id: 'or_earnest_money', title: 'Earnest Money Documentation', category: 'state', required: true, description: 'Earnest money amount and terms per Oregon statute', statute: 'ORS 93.027' },
  { id: 'or_agency_disclosure', title: 'Agency Disclosure', category: 'state', required: true, description: 'Broker must disclose agency relationship to all parties', statute: 'ORS 696.600' },
  { id: 'or_lead_paint', title: 'Oregon Lead Paint Disclosure', category: 'state', required: true, description: 'Buyer acknowledgment of lead paint disclosure and 10-day inspection period', statute: 'ORS 93.705', conditional: 'pre_1978' },
  { id: 'or_hoa_disclosure', title: 'HOA Disclosure', category: 'state', required: false, description: 'HOA rules, fees, and financial statements if applicable', conditional: 'has_hoa' },
  { id: 'or_new_construction', title: 'New Construction Warranty', category: 'state', required: false, description: 'Builder warranty disclosure for new construction', conditional: 'new_construction' },
];

// Generic federal-only checklist for states without specific templates
const FEDERAL_CHECKLIST_ITEMS = [
  { id: 'fed_lead_paint', title: 'Lead-Based Paint Disclosure', category: 'federal', required: true, description: 'Required for properties built before 1978 per 42 U.S.C. § 4852d', conditional: 'pre_1978' },
  { id: 'fed_tila', title: 'TILA Disclosure', category: 'federal', required: true, description: 'Truth in Lending Act disclosure required for financed purchases', conditional: 'financed' },
  { id: 'fed_respa', title: 'RESPA Compliance', category: 'federal', required: true, description: 'Real Estate Settlement Procedures Act compliance check' },
  { id: 'fed_fair_housing', title: 'Fair Housing Compliance', category: 'federal', required: true, description: 'Fair Housing Act compliance for all marketing and communications' },
  { id: 'fed_equal_housing', title: 'Equal Housing Opportunity Statement', category: 'federal', required: true, description: 'Equal Housing Opportunity logo and statement in marketing materials' },
];

function getChecklistTemplate(state: string) {
  switch (state) {
    case 'OR': return OREGON_CHECKLIST_ITEMS;
    default: return FEDERAL_CHECKLIST_ITEMS;
  }
}

// GET /api/v1/compliance-checklists/transaction/:txnId — Get or create checklist for transaction
router.get('/transaction/:txnId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { txnId } = req.params;

    // Check for existing checklist
    const [existing] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.complianceChecklists)
        .where(and(
          eq(schema.complianceChecklists.tenantId, tenantId),
          eq(schema.complianceChecklists.transactionId, txnId),
        ));
    });

    if (existing) {
      return res.json(existing);
    }

    // No checklist yet — get the transaction to determine state
    const [txn] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.transactions)
        .where(and(
          eq(schema.transactions.id, txnId),
          eq(schema.transactions.tenantId, tenantId),
        ));
    });

    if (!txn) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
    }

    // Create checklist from template
    const templateItems = getChecklistTemplate(txn.propertyState);
    const checklistItems = templateItems.map(item => ({
      ...item,
      checked: false,
      checkedBy: null,
      checkedAt: null,
      status: 'red',
    }));

    const [checklist] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.complianceChecklists).values({
        tenantId,
        transactionId: txnId,
        jurisdiction: txn.propertyState,
        checklistItems,
        status: 'in_progress',
      }).returning();
    });

    logAudit({ tenantId, userId: req.user!.userId, action: 'checklist.create', resourceType: 'compliance_checklist', resourceId: checklist.id, details: { transactionId: txnId, jurisdiction: txn.propertyState }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json(checklist);
  } catch (err) {
    logger.error({ err, tenantId }, 'Get checklist error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get compliance checklist' } });
  }
});

// PATCH /api/v1/compliance-checklists/:id/item/:itemId — Check off or uncheck a checklist item
router.patch('/:id/item/:itemId', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id, itemId } = req.params;
    const { checked } = req.body;

    const [checklist] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.complianceChecklists)
        .where(and(
          eq(schema.complianceChecklists.id, id),
          eq(schema.complianceChecklists.tenantId, tenantId),
        ));
    });

    if (!checklist) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Checklist not found' } });
    }

    const items = (checklist.checklistItems as any[]) || [];
    const itemIndex = items.findIndex((item: any) => item.id === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Checklist item not found' } });
    }

    // Update the item
    items[itemIndex] = {
      ...items[itemIndex],
      checked: checked !== false,
      checkedBy: checked !== false ? userId : null,
      checkedAt: checked !== false ? new Date().toISOString() : null,
      status: checked !== false ? 'green' : 'red',
    };

    // Recalculate completion status
    const federalItems = items.filter((i: any) => i.category === 'federal' && i.required);
    const stateItems = items.filter((i: any) => i.category === 'state' && i.required);
    const federalItemsComplete = federalItems.every((i: any) => i.checked);
    const stateItemsComplete = stateItems.every((i: any) => i.checked);
    const allComplete = federalItemsComplete && stateItemsComplete;

    const [updated] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.complianceChecklists)
        .set({
          checklistItems: items,
          federalItemsComplete,
          stateItemsComplete,
          status: allComplete ? 'complete' : 'in_progress',
          updatedAt: new Date(),
        })
        .where(eq(schema.complianceChecklists.id, id))
        .returning();
    });

    logAudit({ tenantId, userId, action: 'checklist.update_item', resourceType: 'compliance_checklist', resourceId: id, details: { itemId, checked }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json(updated);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update checklist item error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update checklist item' } });
  }
});

// GET /api/v1/compliance-checklists/:id/status — Get checklist status summary
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const [checklist] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.complianceChecklists)
        .where(and(
          eq(schema.complianceChecklists.id, id),
          eq(schema.complianceChecklists.tenantId, tenantId),
        ));
    });

    if (!checklist) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Checklist not found' } });
    }

    const items = (checklist.checklistItems as any[]) || [];
    const totalItems = items.filter((i: any) => i.required).length;
    const completedItems = items.filter((i: any) => i.required && i.checked).length;
    const federalTotal = items.filter((i: any) => i.category === 'federal' && i.required).length;
    const federalComplete = items.filter((i: any) => i.category === 'federal' && i.required && i.checked).length;
    const stateTotal = items.filter((i: any) => i.category === 'state' && i.required).length;
    const stateComplete = items.filter((i: any) => i.category === 'state' && i.required && i.checked).length;

    return res.json({
      id: checklist.id,
      jurisdiction: checklist.jurisdiction,
      status: checklist.status,
      progress: {
        total: totalItems,
        completed: completedItems,
        percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      },
      federal: {
        total: federalTotal,
        completed: federalComplete,
        complete: checklist.federalItemsComplete,
      },
      state: {
        total: stateTotal,
        completed: stateComplete,
        complete: checklist.stateItemsComplete,
      },
    });
  } catch (err) {
    logger.error({ err, tenantId }, 'Get checklist status error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get checklist status' } });
  }
});

export default router;
