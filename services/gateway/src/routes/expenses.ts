import { Router, Request, Response } from "express";
import { eq, and, isNull, desc, asc, sql, gte, lte } from "drizzle-orm";
import { db, withTenantContext } from "../lib/db";
import * as schema from "../lib/schema";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../lib/permissions";
import { logAudit } from "../lib/audit";
import { logger } from '../lib/logger';

const VALID_EXPENSE_CATEGORIES = [
  "photography",
  "staging",
  "marketing",
  "inspection",
  "appraisal",
  "title",
  "recording",
  "other",
] as const;

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ---------- GET /api/v1/expenses — List expenses ---------- //
router.get("/", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const dealId = req.query.dealId as string;
    const agentId = req.query.agentId as string;
    const vendorId = req.query.vendorId as string;
    const category = req.query.category as string;
    const paidStatus = req.query.paidStatus as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const sortBy = req.query.sortBy as string;

    const conditions = [
      eq(schema.dealExpenses.tenantId, tenantId),
      isNull(schema.dealExpenses.deletedAt),
    ];

    if (dealId) {
      conditions.push(eq(schema.dealExpenses.dealId, dealId));
    }
    if (agentId) {
      conditions.push(eq(schema.dealExpenses.agentId, agentId));
    }
    if (vendorId) {
      conditions.push(eq(schema.dealExpenses.vendorId, vendorId));
    }
    if (category) {
      conditions.push(eq(schema.dealExpenses.expenseCategory, category));
    }
    if (paidStatus) {
      conditions.push(eq(schema.dealExpenses.paidStatus, paidStatus));
    }
    if (dateFrom) {
      conditions.push(gte(schema.dealExpenses.receiptDate, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(schema.dealExpenses.receiptDate, dateTo));
    }

    let orderClause;
    switch (sortBy) {
      case "amount":
        orderClause = desc(schema.dealExpenses.amount);
        break;
      case "receiptDate":
        orderClause = desc(schema.dealExpenses.receiptDate);
        break;
      case "category":
        orderClause = asc(schema.dealExpenses.expenseCategory);
        break;
      case "created":
      default:
        orderClause = desc(schema.dealExpenses.createdAt);
        break;
    }

    const [expenses, [{ total }]] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx
        .select({
          id: schema.dealExpenses.id,
          tenantId: schema.dealExpenses.tenantId,
          dealId: schema.dealExpenses.dealId,
          agentId: schema.dealExpenses.agentId,
          vendorId: schema.dealExpenses.vendorId,
          expenseCategory: schema.dealExpenses.expenseCategory,
          amount: schema.dealExpenses.amount,
          description: schema.dealExpenses.description,
          receiptDate: schema.dealExpenses.receiptDate,
          paymentDate: schema.dealExpenses.paymentDate,
          paidStatus: schema.dealExpenses.paidStatus,
          receiptUrl: schema.dealExpenses.receiptUrl,
          taxDeductible: schema.dealExpenses.taxDeductible,
          irsCategoryCode: schema.dealExpenses.irsCategoryCode,
          qbSyncDate: schema.dealExpenses.qbSyncDate,
          qbExpenseId: schema.dealExpenses.qbExpenseId,
          notes: schema.dealExpenses.notes,
          createdAt: schema.dealExpenses.createdAt,
          dealName: schema.deals.dealName,
          propertyAddress: schema.deals.propertyAddress,
          agentFirstName: schema.users.firstName,
          agentLastName: schema.users.lastName,
        })
        .from(schema.dealExpenses)
        .leftJoin(schema.deals, eq(schema.dealExpenses.dealId, schema.deals.id))
        .leftJoin(schema.users, eq(schema.dealExpenses.agentId, schema.users.id))
        .where(and(...conditions))
        .orderBy(orderClause)
        .limit(limit)
        .offset(offset);

      const countResult = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(schema.dealExpenses)
        .where(and(...conditions));

      return [rows, countResult];
    });

    return res.json({
      data: expenses,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'List expenses error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list expenses" } });
  }
});

// ---------- GET /api/v1/expenses/stats — Expense summary ---------- //
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYearStr = startOfYear.toISOString().split("T")[0];
    const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

    const stats = await withTenantContext(tenantId, async (tx) => {
      const baseConditions = and(
        eq(schema.dealExpenses.tenantId, tenantId),
        isNull(schema.dealExpenses.deletedAt),
      );

      const [summary] = await tx
        .select({
          totalYtd: sql<string>`coalesce(sum(
            case when ${schema.dealExpenses.receiptDate} >= ${startOfYearStr}
              then ${schema.dealExpenses.amount}::numeric
              else 0
            end
          ), 0)::text`,
          totalThisMonth: sql<string>`coalesce(sum(
            case when ${schema.dealExpenses.receiptDate} >= ${startOfMonthStr}
              then ${schema.dealExpenses.amount}::numeric
              else 0
            end
          ), 0)::text`,
        })
        .from(schema.dealExpenses)
        .where(baseConditions);

      // Top categories with amounts
      const byCategory = await tx
        .select({
          category: schema.dealExpenses.expenseCategory,
          totalAmount: sql<string>`coalesce(sum(${schema.dealExpenses.amount}::numeric), 0)::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.dealExpenses)
        .where(and(
          baseConditions,
          gte(schema.dealExpenses.receiptDate, startOfYearStr),
        ))
        .groupBy(schema.dealExpenses.expenseCategory)
        .orderBy(sql`sum(${schema.dealExpenses.amount}::numeric) desc`)
        .limit(10);

      // Calculate expense to revenue ratio (expenses vs commissions YTD)
      const [commissionTotal] = await tx
        .select({
          totalRevenue: sql<string>`coalesce(sum(${schema.commissionSplits.totalCommission}::numeric), 0)::text`,
        })
        .from(schema.commissionSplits)
        .where(and(
          eq(schema.commissionSplits.tenantId, tenantId),
          isNull(schema.commissionSplits.deletedAt),
          gte(schema.commissionSplits.closingDate, startOfYearStr),
        ));

      const totalExpenses = parseFloat(summary.totalYtd || "0");
      const totalRevenue = parseFloat(commissionTotal.totalRevenue || "0");
      const expenseToRevenueRatio = totalRevenue > 0
        ? (totalExpenses / totalRevenue * 100).toFixed(2)
        : "0";

      return { ...summary, byCategory, expenseToRevenueRatio };
    });

    return res.json({ data: stats });
  } catch (err) {
    logger.error({ err, tenantId }, 'Expense stats error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get expense stats" } });
  }
});

// ---------- GET /api/v1/expenses/by-deal/:dealId — Expenses for a specific deal ---------- //
router.get("/by-deal/:dealId", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { dealId } = req.params;

    const result = await withTenantContext(tenantId, async (tx) => {
      // Verify deal exists
      const [deal] = await tx.select({ id: schema.deals.id, dealName: schema.deals.dealName })
        .from(schema.deals)
        .where(and(
          eq(schema.deals.id, dealId),
          eq(schema.deals.tenantId, tenantId),
          isNull(schema.deals.deletedAt),
        ));

      if (!deal) return { error: "DEAL_NOT_FOUND" };

      const expenses = await tx
        .select({
          id: schema.dealExpenses.id,
          dealId: schema.dealExpenses.dealId,
          agentId: schema.dealExpenses.agentId,
          vendorId: schema.dealExpenses.vendorId,
          expenseCategory: schema.dealExpenses.expenseCategory,
          amount: schema.dealExpenses.amount,
          description: schema.dealExpenses.description,
          receiptDate: schema.dealExpenses.receiptDate,
          paymentDate: schema.dealExpenses.paymentDate,
          paidStatus: schema.dealExpenses.paidStatus,
          receiptUrl: schema.dealExpenses.receiptUrl,
          taxDeductible: schema.dealExpenses.taxDeductible,
          irsCategoryCode: schema.dealExpenses.irsCategoryCode,
          notes: schema.dealExpenses.notes,
          createdAt: schema.dealExpenses.createdAt,
          agentFirstName: schema.users.firstName,
          agentLastName: schema.users.lastName,
        })
        .from(schema.dealExpenses)
        .leftJoin(schema.users, eq(schema.dealExpenses.agentId, schema.users.id))
        .where(and(
          eq(schema.dealExpenses.dealId, dealId),
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
        ))
        .orderBy(desc(schema.dealExpenses.receiptDate));

      const [totals] = await tx
        .select({
          totalAmount: sql<string>`coalesce(sum(${schema.dealExpenses.amount}::numeric), 0)::text`,
          count: sql<number>`count(*)::int`,
          paidAmount: sql<string>`coalesce(sum(
            case when ${schema.dealExpenses.paidStatus} = ${"paid"}
              then ${schema.dealExpenses.amount}::numeric else 0 end
          ), 0)::text`,
          unpaidAmount: sql<string>`coalesce(sum(
            case when ${schema.dealExpenses.paidStatus} != ${"paid"}
              then ${schema.dealExpenses.amount}::numeric else 0 end
          ), 0)::text`,
        })
        .from(schema.dealExpenses)
        .where(and(
          eq(schema.dealExpenses.dealId, dealId),
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
        ));

      return { deal, expenses, ...totals };
    });

    if ("error" in result) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Deal not found" } });
    }

    return res.json({ data: result });
  } catch (err) {
    logger.error({ err, tenantId }, 'Get deal expenses error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get deal expenses" } });
  }
});

// ---------- GET /api/v1/expenses/by-agent/:agentId — Expenses by agent ---------- //
router.get("/by-agent/:agentId", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { agentId } = req.params;

    const result = await withTenantContext(tenantId, async (tx) => {
      // Verify agent exists
      const [agent] = await tx.select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
        .from(schema.users)
        .where(and(
          eq(schema.users.id, agentId),
          eq(schema.users.tenantId, tenantId),
          isNull(schema.users.deletedAt),
        ));

      if (!agent) return { error: "AGENT_NOT_FOUND" };

      const expenses = await tx
        .select({
          id: schema.dealExpenses.id,
          dealId: schema.dealExpenses.dealId,
          expenseCategory: schema.dealExpenses.expenseCategory,
          amount: schema.dealExpenses.amount,
          description: schema.dealExpenses.description,
          receiptDate: schema.dealExpenses.receiptDate,
          paymentDate: schema.dealExpenses.paymentDate,
          paidStatus: schema.dealExpenses.paidStatus,
          taxDeductible: schema.dealExpenses.taxDeductible,
          notes: schema.dealExpenses.notes,
          createdAt: schema.dealExpenses.createdAt,
          dealName: schema.deals.dealName,
          propertyAddress: schema.deals.propertyAddress,
        })
        .from(schema.dealExpenses)
        .leftJoin(schema.deals, eq(schema.dealExpenses.dealId, schema.deals.id))
        .where(and(
          eq(schema.dealExpenses.agentId, agentId),
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
        ))
        .orderBy(desc(schema.dealExpenses.receiptDate));

      const [totals] = await tx
        .select({
          totalAmount: sql<string>`coalesce(sum(${schema.dealExpenses.amount}::numeric), 0)::text`,
          count: sql<number>`count(*)::int`,
          deductibleAmount: sql<string>`coalesce(sum(
            case when ${schema.dealExpenses.taxDeductible} = true
              then ${schema.dealExpenses.amount}::numeric else 0 end
          ), 0)::text`,
        })
        .from(schema.dealExpenses)
        .where(and(
          eq(schema.dealExpenses.agentId, agentId),
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
        ));

      return { agent, expenses, ...totals };
    });

    if ("error" in result) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Agent not found" } });
    }

    return res.json({ data: result });
  } catch (err) {
    logger.error({ err, tenantId }, 'Get agent expenses error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get agent expenses" } });
  }
});
router.post("/bulk-upload", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { expenses: expensesData } = req.body;

    if (!Array.isArray(expensesData) || expensesData.length === 0) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "expenses must be a non-empty array" },
      });
    }

    if (expensesData.length > 100) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Maximum 100 expenses per bulk upload" },
      });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      let created = 0;
      let skipped = 0;
      const errors: string[] = [];
      const createdExpenses: unknown[] = [];

      for (let i = 0; i < expensesData.length; i++) {
        const e = expensesData[i];

        if (!e.agentId || !e.expenseCategory || !e.amount) {
          errors.push("Row " + (i + 1) + ": agentId, expenseCategory, and amount are required");
          skipped++;
          continue;
        }

        if (!VALID_EXPENSE_CATEGORIES.includes(e.expenseCategory)) {
          errors.push("Row " + (i + 1) + ": invalid expenseCategory: " + e.expenseCategory);
          skipped++;
          continue;
        }

        const amountNum = parseFloat(e.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
          errors.push("Row " + (i + 1) + ": amount must be a positive number");
          skipped++;
          continue;
        }

        try {
          const [expense] = await tx.insert(schema.dealExpenses).values({
            tenantId,
            dealId: e.dealId || null,
            agentId: e.agentId,
            vendorId: e.vendorId || null,
            expenseCategory: e.expenseCategory,
            amount: amountNum.toFixed(2),
            description: e.description || null,
            receiptDate: e.receiptDate || null,
            paymentDate: e.paymentDate || null,
            paidStatus: e.paidStatus || "unpaid",
            receiptUrl: e.receiptUrl || null,
            taxDeductible: e.taxDeductible ?? false,
            irsCategoryCode: e.irsCategoryCode || null,
            notes: e.notes || null,
            createdBy: userId,
          }).returning();

          createdExpenses.push(expense);
          created++;
        } catch (insertErr: unknown) {
          const message = insertErr instanceof Error ? insertErr.message : "Unknown error";
          errors.push("Row " + (i + 1) + ": " + message);
          skipped++;
        }
      }

      return { created, skipped, errors, expenses: createdExpenses };
    });

    logAudit({
      tenantId,
      userId,
      action: "expense.bulk_upload",
      resourceType: "deal_expense",
      details: { created: result.created, skipped: result.skipped, errorCount: result.errors.length },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(200).json({
      data: {
        created: result.created,
        skipped: result.skipped,
        errors: result.errors,
        expenses: result.expenses,
      },
    });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Bulk upload expenses error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to bulk upload expenses" } });
  }
});

// ---------- POST /api/v1/expenses — Create expense ---------- //
router.post("/", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const {
      dealId, agentId, vendorId, expenseCategory,
      amount, description, receiptDate, paymentDate,
      paidStatus, receiptUrl, taxDeductible,
      irsCategoryCode, notes,
    } = req.body;

    if (!agentId || !expenseCategory || !amount) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "agentId, expenseCategory, and amount are required" },
      });
    }

    if (!VALID_EXPENSE_CATEGORIES.includes(expenseCategory)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "expenseCategory must be one of: " + VALID_EXPENSE_CATEGORIES.join(", "),
        },
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "amount must be a positive number" },
      });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      // Verify agent exists
      const [agent] = await tx.select({ id: schema.users.id })
        .from(schema.users)
        .where(and(
          eq(schema.users.id, agentId),
          eq(schema.users.tenantId, tenantId),
          isNull(schema.users.deletedAt),
        ));

      if (!agent) return { error: "AGENT_NOT_FOUND" };

      // Verify deal exists if provided
      if (dealId) {
        const [deal] = await tx.select({ id: schema.deals.id })
          .from(schema.deals)
          .where(and(
            eq(schema.deals.id, dealId),
            eq(schema.deals.tenantId, tenantId),
            isNull(schema.deals.deletedAt),
          ));
        if (!deal) return { error: "DEAL_NOT_FOUND" };
      }

      // Verify vendor exists if provided
      if (vendorId) {
        const [vendor] = await tx.select({ id: schema.vendors.id })
          .from(schema.vendors)
          .where(and(
            eq(schema.vendors.id, vendorId),
            eq(schema.vendors.tenantId, tenantId),
            isNull(schema.vendors.deletedAt),
          ));
        if (!vendor) return { error: "VENDOR_NOT_FOUND" };
      }

      const [expense] = await tx.insert(schema.dealExpenses).values({
        tenantId,
        dealId: dealId || null,
        agentId,
        vendorId: vendorId || null,
        expenseCategory,
        amount: amountNum.toFixed(2),
        description: description || null,
        receiptDate: receiptDate || null,
        paymentDate: paymentDate || null,
        paidStatus: paidStatus || "unpaid",
        receiptUrl: receiptUrl || null,
        taxDeductible: taxDeductible ?? false,
        irsCategoryCode: irsCategoryCode || null,
        notes: notes || null,
        createdBy: userId,
      }).returning();

      return { expense };
    });

    if ("error" in result) {
      if (result.error === "AGENT_NOT_FOUND") {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Agent not found" } });
      }
      if (result.error === "DEAL_NOT_FOUND") {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Deal not found" } });
      }
      if (result.error === "VENDOR_NOT_FOUND") {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Vendor not found" } });
      }
    }

    logAudit({
      tenantId,
      userId,
      action: "expense.create",
      resourceType: "deal_expense",
      resourceId: (result as any).expense.id,
      details: { dealId, agentId, expenseCategory, amount },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(201).json({ data: (result as any).expense });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Create expense error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create expense" } });
  }
});

// ---------- GET /api/v1/expenses/:id — Get single expense ---------- //
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const [expense] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select({
          id: schema.dealExpenses.id,
          tenantId: schema.dealExpenses.tenantId,
          dealId: schema.dealExpenses.dealId,
          agentId: schema.dealExpenses.agentId,
          vendorId: schema.dealExpenses.vendorId,
          expenseCategory: schema.dealExpenses.expenseCategory,
          amount: schema.dealExpenses.amount,
          description: schema.dealExpenses.description,
          receiptDate: schema.dealExpenses.receiptDate,
          paymentDate: schema.dealExpenses.paymentDate,
          paidStatus: schema.dealExpenses.paidStatus,
          receiptUrl: schema.dealExpenses.receiptUrl,
          taxDeductible: schema.dealExpenses.taxDeductible,
          irsCategoryCode: schema.dealExpenses.irsCategoryCode,
          qbSyncDate: schema.dealExpenses.qbSyncDate,
          qbExpenseId: schema.dealExpenses.qbExpenseId,
          notes: schema.dealExpenses.notes,
          createdBy: schema.dealExpenses.createdBy,
          createdAt: schema.dealExpenses.createdAt,
          updatedAt: schema.dealExpenses.updatedAt,
          dealName: schema.deals.dealName,
          propertyAddress: schema.deals.propertyAddress,
          agentFirstName: schema.users.firstName,
          agentLastName: schema.users.lastName,
          agentEmail: schema.users.email,
        })
        .from(schema.dealExpenses)
        .leftJoin(schema.deals, eq(schema.dealExpenses.dealId, schema.deals.id))
        .leftJoin(schema.users, eq(schema.dealExpenses.agentId, schema.users.id))
        .where(and(
          eq(schema.dealExpenses.id, id),
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
        ));
    });

    if (!expense) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
    }

    return res.json({ data: expense });
  } catch (err) {
    logger.error({ err, tenantId }, 'Get expense error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get expense" } });
  }
});

// ---------- PATCH /api/v1/expenses/:id — Update expense ---------- //
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    const allowedFields = [
      "dealId", "agentId", "vendorId", "expenseCategory",
      "amount", "description", "receiptDate", "paymentDate",
      "paidStatus", "receiptUrl", "taxDeductible",
      "irsCategoryCode", "notes",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === "amount") {
          updates[field] = parseFloat(req.body[field]).toFixed(2);
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } });
    }

    // Validate category if being updated
    if (updates.expenseCategory && !VALID_EXPENSE_CATEGORIES.includes(updates.expenseCategory as any)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "expenseCategory must be one of: " + VALID_EXPENSE_CATEGORIES.join(", "),
        },
      });
    }

    const [expense] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.dealExpenses)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.dealExpenses.id, id),
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
        ))
        .returning();
    });

    if (!expense) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
    }

    logAudit({
      tenantId,
      userId,
      action: "expense.update",
      resourceType: "deal_expense",
      resourceId: id,
      details: updates,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({ data: expense });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update expense error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update expense" } });
  }
});

// ---------- DELETE /api/v1/expenses/:id — Soft delete expense ---------- //
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const [expense] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.dealExpenses)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(schema.dealExpenses.id, id),
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
        ))
        .returning();
    });

    if (!expense) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
    }

    logAudit({
      tenantId,
      userId,
      action: "expense.delete",
      resourceType: "deal_expense",
      resourceId: id,
      details: {},
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(204).send();
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Delete expense error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete expense" } });
  }
});

// ---------- POST /api/v1/expenses/:id/mark-paid — Mark expense as paid ---------- //
router.post("/:id/mark-paid", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { paymentDate } = req.body;

    const [expense] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.dealExpenses)
        .set({
          paidStatus: "paid",
          paymentDate: paymentDate || new Date().toISOString().split("T")[0],
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.dealExpenses.id, id),
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
        ))
        .returning();
    });

    if (!expense) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
    }

    logAudit({
      tenantId,
      userId,
      action: "expense.mark_paid",
      resourceType: "deal_expense",
      resourceId: id,
      details: { paymentDate: paymentDate || new Date().toISOString().split("T")[0] },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({ data: expense });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Mark expense paid error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to mark expense as paid" } });
  }
});

// ---------- POST /api/v1/expenses/:id/sync-to-qb — Mark synced to QuickBooks ---------- //
router.post("/:id/sync-to-qb", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { qbExpenseId } = req.body;

    if (!qbExpenseId) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "qbExpenseId is required" },
      });
    }

    const [expense] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.dealExpenses)
        .set({
          qbSyncDate: new Date(),
          qbExpenseId,
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.dealExpenses.id, id),
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
        ))
        .returning();
    });

    if (!expense) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
    }

    logAudit({
      tenantId,
      userId,
      action: "expense.sync_qb",
      resourceType: "deal_expense",
      resourceId: id,
      details: { qbExpenseId },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({ data: expense });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Sync expense to QB error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to sync expense to QuickBooks" } });
  }
});

// ---------- POST /api/v1/expenses/bulk-upload — Bulk create expenses ---------- //

export default router;
