import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';

const router = Router();

// All report routes require authentication and managing_broker+ role
router.use(requireAuth);
router.use(requireRole('managing_broker'));

// ---------- GET /api/v1/reports/commission-dashboard ---------- //
router.get('/commission-dashboard', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const dashboard = await withTenantContext(tenantId, async (tx) => {
      // YTD and this month totals
      const [totals] = await tx
        .select({
          ytdTotal: sql<string>`coalesce(sum(
            CASE WHEN ${schema.dealCommissions.createdAt} >= ${startOfYear}
            THEN ${schema.dealCommissions.grossCommission} ELSE 0 END
          ), 0)::text`,
          thisMonth: sql<string>`coalesce(sum(
            CASE WHEN ${schema.dealCommissions.createdAt} >= ${startOfMonth}
            THEN ${schema.dealCommissions.grossCommission} ELSE 0 END
          ), 0)::text`,
          pendingCommissions: sql<string>`coalesce(sum(
            CASE WHEN ${schema.dealCommissions.status} = 'pending'
            THEN ${schema.dealCommissions.grossCommission} ELSE 0 END
          ), 0)::text`,
        })
        .from(schema.dealCommissions)
        .where(and(
          eq(schema.dealCommissions.tenantId, tenantId),
          isNull(schema.dealCommissions.deletedAt),
        ));

      // Top agents by YTD commission
      const byAgent = await tx
        .select({
          agentId: schema.dealCommissions.agentId,
          agentFirstName: schema.users.firstName,
          agentLastName: schema.users.lastName,
          ytdAmount: sql<string>`coalesce(sum(${schema.dealCommissions.grossCommission}), 0)::text`,
          dealCount: sql<number>`count(*)::int`,
        })
        .from(schema.dealCommissions)
        .innerJoin(schema.users, eq(schema.dealCommissions.agentId, schema.users.id))
        .where(and(
          eq(schema.dealCommissions.tenantId, tenantId),
          isNull(schema.dealCommissions.deletedAt),
          sql`${schema.dealCommissions.createdAt} >= ${startOfYear}`,
        ))
        .groupBy(schema.dealCommissions.agentId, schema.users.firstName, schema.users.lastName)
        .orderBy(desc(sql`coalesce(sum(${schema.dealCommissions.grossCommission}), 0)`))
        .limit(10);

      // By deal type
      const byDealType = await tx
        .select({
          commissionType: schema.dealCommissions.commissionType,
          total: sql<string>`coalesce(sum(${schema.dealCommissions.grossCommission}), 0)::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.dealCommissions)
        .where(and(
          eq(schema.dealCommissions.tenantId, tenantId),
          isNull(schema.dealCommissions.deletedAt),
          sql`${schema.dealCommissions.createdAt} >= ${startOfYear}`,
        ))
        .groupBy(schema.dealCommissions.commissionType);

      // Monthly trend (last 12 months)
      const monthlyTrend = await tx
        .select({
          month: sql<string>`to_char(${schema.dealCommissions.createdAt}, 'YYYY-MM')`,
          total: sql<string>`coalesce(sum(${schema.dealCommissions.grossCommission}), 0)::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.dealCommissions)
        .where(and(
          eq(schema.dealCommissions.tenantId, tenantId),
          isNull(schema.dealCommissions.deletedAt),
          sql`${schema.dealCommissions.createdAt} >= ${new Date(now.getFullYear() - 1, now.getMonth(), 1)}`,
        ))
        .groupBy(sql`to_char(${schema.dealCommissions.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${schema.dealCommissions.createdAt}, 'YYYY-MM') ASC`);

      return { ...totals, byAgent, byDealType, monthlyTrend };
    });

    return res.json({ data: dashboard });
  } catch (err) {
    console.error('Commission dashboard error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get commission dashboard' } });
  }
});
// ---------- GET /api/v1/reports/expense-summary ---------- //
router.get('/expense-summary', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const summary = await withTenantContext(tenantId, async (tx) => {
      // YTD and this month totals
      const [totals] = await tx
        .select({
          ytdTotal: sql<string>`coalesce(sum(
            CASE WHEN ${schema.dealExpenses.expenseDate} >= ${startOfYear.toISOString().slice(0, 10)}
            THEN ${schema.dealExpenses.amount} ELSE 0 END
          ), 0)::text`,
          thisMonth: sql<string>`coalesce(sum(
            CASE WHEN ${schema.dealExpenses.expenseDate} >= ${startOfMonth.toISOString().slice(0, 10)}
            THEN ${schema.dealExpenses.amount} ELSE 0 END
          ), 0)::text`,
        })
        .from(schema.dealExpenses)
        .where(and(
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
        ));

      // By category
      const byCategory = await tx
        .select({
          category: schema.dealExpenses.expenseCategory,
          total: sql<string>`coalesce(sum(${schema.dealExpenses.amount}), 0)::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.dealExpenses)
        .where(and(
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
          sql`${schema.dealExpenses.expenseDate} >= ${startOfYear.toISOString().slice(0, 10)}`,
        ))
        .groupBy(schema.dealExpenses.expenseCategory)
        .orderBy(desc(sql`coalesce(sum(${schema.dealExpenses.amount}), 0)`));

      // By agent
      const byAgent = await tx
        .select({
          agentId: schema.dealExpenses.agentId,
          agentFirstName: schema.users.firstName,
          agentLastName: schema.users.lastName,
          total: sql<string>`coalesce(sum(${schema.dealExpenses.amount}), 0)::text`,
        })
        .from(schema.dealExpenses)
        .innerJoin(schema.users, eq(schema.dealExpenses.agentId, schema.users.id))
        .where(and(
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
          sql`${schema.dealExpenses.expenseDate} >= ${startOfYear.toISOString().slice(0, 10)}`,
        ))
        .groupBy(schema.dealExpenses.agentId, schema.users.firstName, schema.users.lastName)
        .orderBy(desc(sql`coalesce(sum(${schema.dealExpenses.amount}), 0)`));

      // Monthly trend
      const monthlyTrend = await tx
        .select({
          month: sql<string>`to_char(${schema.dealExpenses.expenseDate}::timestamp, 'YYYY-MM')`,
          total: sql<string>`coalesce(sum(${schema.dealExpenses.amount}), 0)::text`,
        })
        .from(schema.dealExpenses)
        .where(and(
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
          sql`${schema.dealExpenses.expenseDate} >= ${new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().slice(0, 10)}`,
        ))
        .groupBy(sql`to_char(${schema.dealExpenses.expenseDate}::timestamp, 'YYYY-MM')`)
        .orderBy(sql`to_char(${schema.dealExpenses.expenseDate}::timestamp, 'YYYY-MM') ASC`);

      // Expense ratio
      const [revenue] = await tx
        .select({
          total: sql<string>`coalesce(sum(${schema.dealCommissions.grossCommission}), 0)::text`,
        })
        .from(schema.dealCommissions)
        .where(and(
          eq(schema.dealCommissions.tenantId, tenantId),
          isNull(schema.dealCommissions.deletedAt),
          sql`${schema.dealCommissions.createdAt} >= ${startOfYear}`,
        ));

      const revenueVal = parseFloat(revenue.total || '0');
      const expenseVal = parseFloat(totals.ytdTotal || '0');
      const expenseRatio = revenueVal > 0 ? ((expenseVal / revenueVal) * 100).toFixed(2) : '0';

      return { ...totals, byCategory, byAgent, monthlyTrend, expenseRatio };
    });

    return res.json({ data: summary });
  } catch (err) {
    console.error('Expense summary error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get expense summary' } });
  }
});
// ---------- GET /api/v1/reports/agent-billing ---------- //
router.get('/agent-billing', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const now = new Date();

    const report = await withTenantContext(tenantId, async (tx) => {
      // Total outstanding
      const [aggregate] = await tx
        .select({
          totalOutstanding: sql<string>`coalesce(sum(${schema.agentBilling.amount}), 0)::text`,
          unpaidCount: sql<number>`count(*)::int`,
        })
        .from(schema.agentBilling)
        .where(and(
          eq(schema.agentBilling.tenantId, tenantId),
          eq(schema.agentBilling.paidStatus, 'unpaid'),
          isNull(schema.agentBilling.deletedAt),
        ));

      // Aging report
      const [aging] = await tx
        .select({
          current: sql<string>`coalesce(sum(
            CASE WHEN ${schema.agentBilling.dueDate} >= ${now.toISOString().slice(0, 10)}
            THEN ${schema.agentBilling.amount} ELSE 0 END
          ), 0)::text`,
          over30: sql<string>`coalesce(sum(
            CASE WHEN ${schema.agentBilling.dueDate} < ${now.toISOString().slice(0, 10)}
              AND ${schema.agentBilling.dueDate} >= ${new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)}
            THEN ${schema.agentBilling.amount} ELSE 0 END
          ), 0)::text`,
          over60: sql<string>`coalesce(sum(
            CASE WHEN ${schema.agentBilling.dueDate} < ${new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)}
              AND ${schema.agentBilling.dueDate} >= ${new Date(now.getTime() - 60 * 86400000).toISOString().slice(0, 10)}
            THEN ${schema.agentBilling.amount} ELSE 0 END
          ), 0)::text`,
          over90: sql<string>`coalesce(sum(
            CASE WHEN ${schema.agentBilling.dueDate} < ${new Date(now.getTime() - 60 * 86400000).toISOString().slice(0, 10)}
            THEN ${schema.agentBilling.amount} ELSE 0 END
          ), 0)::text`,
        })
        .from(schema.agentBilling)
        .where(and(
          eq(schema.agentBilling.tenantId, tenantId),
          eq(schema.agentBilling.paidStatus, 'unpaid'),
          isNull(schema.agentBilling.deletedAt),
        ));

      // By agent
      const byAgent = await tx
        .select({
          agentId: schema.agentBilling.agentId,
          agentFirstName: schema.users.firstName,
          agentLastName: schema.users.lastName,
          totalOutstanding: sql<string>`coalesce(sum(${schema.agentBilling.amount}), 0)::text`,
          invoiceCount: sql<number>`count(*)::int`,
          oldestDueDate: sql<string>`min(${schema.agentBilling.dueDate})`,
        })
        .from(schema.agentBilling)
        .innerJoin(schema.users, eq(schema.agentBilling.agentId, schema.users.id))
        .where(and(
          eq(schema.agentBilling.tenantId, tenantId),
          eq(schema.agentBilling.paidStatus, 'unpaid'),
          isNull(schema.agentBilling.deletedAt),
        ))
        .groupBy(schema.agentBilling.agentId, schema.users.firstName, schema.users.lastName)
        .orderBy(desc(sql`coalesce(sum(${schema.agentBilling.amount}), 0)`));

      return { ...aggregate, agingReport: aging, byAgent };
    });

    return res.json({ data: report });
  } catch (err) {
    console.error('Agent billing report error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get agent billing report' } });
  }
});
// ---------- GET /api/v1/reports/pl-by-office ---------- //
router.get('/pl-by-office', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const pl = await withTenantContext(tenantId, async (tx) => {
      // Total revenue (brokerage portion of commissions)
      const [revenue] = await tx
        .select({
          totalRevenue: sql<string>`coalesce(sum(${schema.dealCommissions.brokerageAmount}), 0)::text`,
          commissionCount: sql<number>`count(*)::int`,
        })
        .from(schema.dealCommissions)
        .where(and(
          eq(schema.dealCommissions.tenantId, tenantId),
          isNull(schema.dealCommissions.deletedAt),
          sql`${schema.dealCommissions.createdAt} >= ${startOfYear}`,
        ));

      // Total expenses
      const [expenses] = await tx
        .select({
          totalExpenses: sql<string>`coalesce(sum(${schema.dealExpenses.amount}), 0)::text`,
        })
        .from(schema.dealExpenses)
        .where(and(
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
          sql`${schema.dealExpenses.expenseDate} >= ${startOfYear.toISOString().slice(0, 10)}`,
        ));

      const totalRevenue = parseFloat(revenue.totalRevenue || '0');
      const totalExpenses = parseFloat(expenses.totalExpenses || '0');
      const grossProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : '0';

      // Monthly P&L trend
      const monthlyRevenue = await tx
        .select({
          month: sql<string>`to_char(${schema.dealCommissions.createdAt}, 'YYYY-MM')`,
          revenue: sql<string>`coalesce(sum(${schema.dealCommissions.brokerageAmount}), 0)::text`,
        })
        .from(schema.dealCommissions)
        .where(and(
          eq(schema.dealCommissions.tenantId, tenantId),
          isNull(schema.dealCommissions.deletedAt),
          sql`${schema.dealCommissions.createdAt} >= ${startOfYear}`,
        ))
        .groupBy(sql`to_char(${schema.dealCommissions.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${schema.dealCommissions.createdAt}, 'YYYY-MM') ASC`);

      const monthlyExpenses = await tx
        .select({
          month: sql<string>`to_char(${schema.dealExpenses.expenseDate}::timestamp, 'YYYY-MM')`,
          expenses: sql<string>`coalesce(sum(${schema.dealExpenses.amount}), 0)::text`,
        })
        .from(schema.dealExpenses)
        .where(and(
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
          sql`${schema.dealExpenses.expenseDate} >= ${startOfYear.toISOString().slice(0, 10)}`,
        ))
        .groupBy(sql`to_char(${schema.dealExpenses.expenseDate}::timestamp, 'YYYY-MM')`)
        .orderBy(sql`to_char(${schema.dealExpenses.expenseDate}::timestamp, 'YYYY-MM') ASC`);

      return {
        totalRevenue: totalRevenue.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        profitMargin,
        commissionCount: revenue.commissionCount,
        monthlyTrend: { revenue: monthlyRevenue, expenses: monthlyExpenses },
      };
    });

    return res.json({ data: pl });
  } catch (err) {
    console.error('P&L report error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get P&L report' } });
  }
});
// ---------- GET /api/v1/reports/tax-prep ---------- //
router.get('/tax-prep', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const taxPrep = await withTenantContext(tenantId, async (tx) => {
      // 1099 vendors
      const vendors1099 = await tx
        .select({
          id: schema.vendors.id,
          vendorName: schema.vendors.vendorName,
          taxId: schema.vendors.taxId,
          address: schema.vendors.address,
          ytd: sql<string>`coalesce(sum(${schema.dealExpenses.amount}), 0)::text`,
        })
        .from(schema.vendors)
        .leftJoin(
          schema.dealExpenses,
          and(
            eq(schema.dealExpenses.vendorId, schema.vendors.id),
            sql`${schema.dealExpenses.expenseDate} >= ${yearStart}`,
            sql`${schema.dealExpenses.expenseDate} <= ${yearEnd}`,
            isNull(schema.dealExpenses.deletedAt),
          ),
        )
        .where(and(
          eq(schema.vendors.tenantId, tenantId),
          eq(schema.vendors.requires1099, true),
          isNull(schema.vendors.deletedAt),
        ))
        .groupBy(schema.vendors.id, schema.vendors.vendorName, schema.vendors.taxId, schema.vendors.address)
        .orderBy(desc(sql`coalesce(sum(${schema.dealExpenses.amount}), 0)`));

      // Income summary by commission type
      const incomeSummary = await tx
        .select({
          category: schema.dealCommissions.commissionType,
          total: sql<string>`coalesce(sum(${schema.dealCommissions.brokerageAmount}), 0)::text`,
        })
        .from(schema.dealCommissions)
        .where(and(
          eq(schema.dealCommissions.tenantId, tenantId),
          isNull(schema.dealCommissions.deletedAt),
          sql`${schema.dealCommissions.createdAt} >= ${yearStart}`,
          sql`${schema.dealCommissions.createdAt} <= ${yearEnd}`,
        ))
        .groupBy(schema.dealCommissions.commissionType);

      // Expense summary by IRS category
      const expenseSummary = await tx
        .select({
          irsCategory: sql<string>`coalesce(${schema.dealExpenses.irsCategory}, 'Uncategorized')`,
          total: sql<string>`coalesce(sum(${schema.dealExpenses.amount}), 0)::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.dealExpenses)
        .where(and(
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
          sql`${schema.dealExpenses.expenseDate} >= ${yearStart}`,
          sql`${schema.dealExpenses.expenseDate} <= ${yearEnd}`,
        ))
        .groupBy(sql`coalesce(${schema.dealExpenses.irsCategory}, 'Uncategorized')`)
        .orderBy(desc(sql`coalesce(sum(${schema.dealExpenses.amount}), 0)`));

      // Quarterly estimates
      const quarterlyEstimates = await tx
        .select({
          quarter: sql<string>`'Q' || EXTRACT(QUARTER FROM ${schema.dealCommissions.createdAt})::text`,
          revenue: sql<string>`coalesce(sum(${schema.dealCommissions.brokerageAmount}), 0)::text`,
        })
        .from(schema.dealCommissions)
        .where(and(
          eq(schema.dealCommissions.tenantId, tenantId),
          isNull(schema.dealCommissions.deletedAt),
          sql`${schema.dealCommissions.createdAt} >= ${yearStart}`,
          sql`${schema.dealCommissions.createdAt} <= ${yearEnd}`,
        ))
        .groupBy(sql`EXTRACT(QUARTER FROM ${schema.dealCommissions.createdAt})`)
        .orderBy(sql`EXTRACT(QUARTER FROM ${schema.dealCommissions.createdAt}) ASC`);

      return { year, vendors1099, incomeSummary, expenseSummary, quarterlyEstimates };
    });

    return res.json({ data: taxPrep });
  } catch (err) {
    console.error('Tax prep report error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get tax prep report' } });
  }
});
// ---------- GET /api/v1/reports/reconciliation ---------- //
router.get('/reconciliation', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const reconciliation = await withTenantContext(tenantId, async (tx) => {
      // Commissions not yet synced
      const [commissionSync] = await tx
        .select({
          pendingSync: sql<number>`count(*) filter (where ${schema.dealCommissions.qbSyncStatus} = 'pending')::int`,
          synced: sql<number>`count(*) filter (where ${schema.dealCommissions.qbSyncStatus} = 'synced')::int`,
          failed: sql<number>`count(*) filter (where ${schema.dealCommissions.qbSyncStatus} = 'failed')::int`,
          pendingAmount: sql<string>`coalesce(sum(
            CASE WHEN ${schema.dealCommissions.qbSyncStatus} = 'pending'
            THEN ${schema.dealCommissions.grossCommission} ELSE 0 END
          ), 0)::text`,
          lastSyncDate: sql<string>`max(
            CASE WHEN ${schema.dealCommissions.qbSyncStatus} = 'synced'
            THEN ${schema.dealCommissions.updatedAt} ELSE NULL END
          )`,
        })
        .from(schema.dealCommissions)
        .where(and(
          eq(schema.dealCommissions.tenantId, tenantId),
          isNull(schema.dealCommissions.deletedAt),
        ));

      // Expenses not yet synced
      const [expenseSync] = await tx
        .select({
          pendingSync: sql<number>`count(*) filter (where ${schema.dealExpenses.qbSyncStatus} = 'pending')::int`,
          synced: sql<number>`count(*) filter (where ${schema.dealExpenses.qbSyncStatus} = 'synced')::int`,
          failed: sql<number>`count(*) filter (where ${schema.dealExpenses.qbSyncStatus} = 'failed')::int`,
          pendingAmount: sql<string>`coalesce(sum(
            CASE WHEN ${schema.dealExpenses.qbSyncStatus} = 'pending'
            THEN ${schema.dealExpenses.amount} ELSE 0 END
          ), 0)::text`,
          lastSyncDate: sql<string>`max(
            CASE WHEN ${schema.dealExpenses.qbSyncStatus} = 'synced'
            THEN ${schema.dealExpenses.updatedAt} ELSE NULL END
          )`,
        })
        .from(schema.dealExpenses)
        .where(and(
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
        ));

      // Recent failed syncs
      const failedCommissions = await tx
        .select({
          id: schema.dealCommissions.id,
          dealId: schema.dealCommissions.dealId,
          agentId: schema.dealCommissions.agentId,
          grossCommission: schema.dealCommissions.grossCommission,
          qbSyncStatus: schema.dealCommissions.qbSyncStatus,
          updatedAt: schema.dealCommissions.updatedAt,
        })
        .from(schema.dealCommissions)
        .where(and(
          eq(schema.dealCommissions.tenantId, tenantId),
          eq(schema.dealCommissions.qbSyncStatus, 'failed'),
          isNull(schema.dealCommissions.deletedAt),
        ))
        .orderBy(desc(schema.dealCommissions.updatedAt))
        .limit(20);

      const failedExpenses = await tx
        .select({
          id: schema.dealExpenses.id,
          dealId: schema.dealExpenses.dealId,
          vendorId: schema.dealExpenses.vendorId,
          amount: schema.dealExpenses.amount,
          qbSyncStatus: schema.dealExpenses.qbSyncStatus,
          updatedAt: schema.dealExpenses.updatedAt,
        })
        .from(schema.dealExpenses)
        .where(and(
          eq(schema.dealExpenses.tenantId, tenantId),
          eq(schema.dealExpenses.qbSyncStatus, 'failed'),
          isNull(schema.dealExpenses.deletedAt),
        ))
        .orderBy(desc(schema.dealExpenses.updatedAt))
        .limit(20);

      return {
        commissions: commissionSync,
        expenses: expenseSync,
        pendingSyncCount: (commissionSync.pendingSync || 0) + (expenseSync.pendingSync || 0),
        lastSyncDate: [commissionSync.lastSyncDate, expenseSync.lastSyncDate]
          .filter(Boolean)
          .sort()
          .reverse()[0] || null,
        discrepancies: {
          failedCommissions,
          failedExpenses,
        },
      };
    });

    return res.json({ data: reconciliation });
  } catch (err) {
    console.error('Reconciliation report error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get reconciliation report' } });
  }
});

export default router;
