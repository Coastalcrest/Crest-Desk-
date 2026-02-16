import { Router, Request, Response } from "express";
import { eq, and, isNull, desc, asc, sql, gte, lte } from "drizzle-orm";
import { db, withTenantContext } from "../lib/db";
import * as schema from "../lib/schema";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../lib/permissions";
import { logAudit } from "../lib/audit";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ---------- Helper: Calculate commission splits from a structure ---------- //
interface CommissionCalculation {
  totalCommission: string;
  brokerageAmount: string;
  agentAmount: string;
  referralFee: string;
  franchiseFee: string;
  netAgentAmount: string;
}

function calculateCommissionSplits(
  salePrice: number,
  commissionRate: number,
  structure: {
    brokeragePercentage: string | null;
    agentPercentage: string | null;
    referralFeeFlat: string | null;
    referralFeePercentage: string | null;
    franchiseFeePercentage: string | null;
  } | null,
): CommissionCalculation {
  const totalCommission = salePrice * commissionRate;
  const brokeragePct = structure?.brokeragePercentage
    ? parseFloat(structure.brokeragePercentage) / 100
    : 0.30;
  const agentPct = structure?.agentPercentage
    ? parseFloat(structure.agentPercentage) / 100
    : 0.70;
  const referralFlatAmt = structure?.referralFeeFlat
    ? parseFloat(structure.referralFeeFlat)
    : 0;
  const referralPct = structure?.referralFeePercentage
    ? parseFloat(structure.referralFeePercentage) / 100
    : 0;
  const franchisePct = structure?.franchiseFeePercentage
    ? parseFloat(structure.franchiseFeePercentage) / 100
    : 0;

  const brokerageAmount = totalCommission * brokeragePct;
  const agentAmount = totalCommission * agentPct;
  const referralFee = referralFlatAmt + (totalCommission * referralPct);
  const franchiseFee = totalCommission * franchisePct;
  const netAgentAmount = agentAmount - referralFee - franchiseFee;

  return {
    totalCommission: totalCommission.toFixed(2),
    brokerageAmount: brokerageAmount.toFixed(2),
    agentAmount: agentAmount.toFixed(2),
    referralFee: referralFee.toFixed(2),
    franchiseFee: franchiseFee.toFixed(2),
    netAgentAmount: netAgentAmount.toFixed(2),
  };
}

// ---------- GET /api/v1/commissions — List commissions ---------- //
router.get("/", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user\!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const agentId = req.query.agentId as string;
    const status = req.query.status as string;
    const dealType = req.query.dealType as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const sortBy = req.query.sortBy as string;

    const conditions = [
      eq(schema.commissionSplits.tenantId, tenantId),
      isNull(schema.commissionSplits.deletedAt),
    ];

    if (agentId) {
      conditions.push(eq(schema.commissionSplits.agentId, agentId));
    }
    if (status) {
      conditions.push(eq(schema.commissionSplits.status, status));
    }
    if (dealType) {
      conditions.push(eq(schema.commissionSplits.dealType, dealType));
    }
    if (dateFrom) {
      conditions.push(gte(schema.commissionSplits.closingDate, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(schema.commissionSplits.closingDate, dateTo));
    }

    let orderClause;
    switch (sortBy) {
      case "closingDate":
        orderClause = desc(schema.commissionSplits.closingDate);
        break;
      case "amount":
        orderClause = desc(schema.commissionSplits.totalCommission);
        break;
      case "created":
      default:
        orderClause = desc(schema.commissionSplits.createdAt);
        break;
    }

    const [commissions, [{ total }]] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx
        .select({
          id: schema.commissionSplits.id,
          tenantId: schema.commissionSplits.tenantId,
          dealId: schema.commissionSplits.dealId,
          agentId: schema.commissionSplits.agentId,
          transactionId: schema.commissionSplits.transactionId,
          salePrice: schema.commissionSplits.salePrice,
          commissionRate: schema.commissionSplits.commissionRate,
          totalCommission: schema.commissionSplits.totalCommission,
          brokerageAmount: schema.commissionSplits.brokerageAmount,
          agentAmount: schema.commissionSplits.agentAmount,
          referralFee: schema.commissionSplits.referralFee,
          franchiseFee: schema.commissionSplits.franchiseFee,
          netAgentAmount: schema.commissionSplits.netAgentAmount,
          dealType: schema.commissionSplits.dealType,
          closingDate: schema.commissionSplits.closingDate,
          status: schema.commissionSplits.status,
          correctedFromId: schema.commissionSplits.correctedFromId,
          qbSyncDate: schema.commissionSplits.qbSyncDate,
          qbInvoiceId: schema.commissionSplits.qbInvoiceId,
          notes: schema.commissionSplits.notes,
          createdAt: schema.commissionSplits.createdAt,
          dealName: schema.deals.dealName,
          propertyAddress: schema.deals.propertyAddress,
          agentFirstName: schema.users.firstName,
          agentLastName: schema.users.lastName,
          agentEmail: schema.users.email,
        })
        .from(schema.commissionSplits)
        .leftJoin(schema.deals, eq(schema.commissionSplits.dealId, schema.deals.id))
        .leftJoin(schema.users, eq(schema.commissionSplits.agentId, schema.users.id))
        .where(and(...conditions))
        .orderBy(orderClause)
        .limit(limit)
        .offset(offset);

      const countResult = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(schema.commissionSplits)
        .where(and(...conditions));

      return [rows, countResult];
    });

    return res.json({
      data: commissions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("List commissions error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list commissions" } });
  }
});

// ---------- GET /api/v1/commissions/stats — Commission summary stats ---------- //
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
        eq(schema.commissionSplits.tenantId, tenantId),
        isNull(schema.commissionSplits.deletedAt),
      );

      const [summary] = await tx
        .select({
          totalYtd: sql<string>`coalesce(sum(
            case when ${schema.commissionSplits.closingDate} >= ${startOfYearStr}
              then ${schema.commissionSplits.totalCommission}::numeric
              else 0
            end
          ), 0)::text`,
          totalThisMonth: sql<string>`coalesce(sum(
            case when ${schema.commissionSplits.closingDate} >= ${startOfMonthStr}
              then ${schema.commissionSplits.totalCommission}::numeric
              else 0
            end
          ), 0)::text`,
          pendingCount: sql<number>`count(*) filter (where ${schema.commissionSplits.status} = ${"pending"})::int`,
          averageDeal: sql<string>`coalesce(avg(${schema.commissionSplits.totalCommission}::numeric), 0)::numeric(12,2)::text`,
        })
        .from(schema.commissionSplits)
        .where(baseConditions);

      // Top 5 agents by YTD commission
      const topAgents = await tx
        .select({
          agentId: schema.commissionSplits.agentId,
          agentFirstName: schema.users.firstName,
          agentLastName: schema.users.lastName,
          totalCommission: sql<string>`coalesce(sum(${schema.commissionSplits.totalCommission}::numeric), 0)::text`,
          dealCount: sql<number>`count(*)::int`,
        })
        .from(schema.commissionSplits)
        .leftJoin(schema.users, eq(schema.commissionSplits.agentId, schema.users.id))
        .where(and(
          baseConditions,
          gte(schema.commissionSplits.closingDate, startOfYearStr),
        ))
        .groupBy(
          schema.commissionSplits.agentId,
          schema.users.firstName,
          schema.users.lastName,
        )
        .orderBy(sql`sum(${schema.commissionSplits.totalCommission}::numeric) desc`)
        .limit(5);

      return { ...summary, topAgents };
    });

    return res.json({ data: stats });
  } catch (err) {
    console.error("Commission stats error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get commission stats" } });
  }
});

// ---------- GET /api/v1/commissions/pending — Pending income from pipeline ---------- //
router.get("/pending", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const pendingIncome = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx
        .select({
          dealId: schema.deals.id,
          dealName: schema.deals.dealName,
          propertyAddress: schema.deals.propertyAddress,
          dealValue: schema.deals.dealValue,
          probability: schema.deals.probability,
          expectedCloseDate: schema.deals.expectedCloseDate,
          ownerUserId: schema.deals.ownerUserId,
          agentFirstName: schema.users.firstName,
          agentLastName: schema.users.lastName,
          projectedCommission: sql<string>`coalesce(
            (${schema.deals.dealValue}::numeric * coalesce(${schema.deals.probability}, 50) / 100 * 0.03),
            0
          )::numeric(12,2)::text`,
        })
        .from(schema.deals)
        .leftJoin(schema.users, eq(schema.deals.ownerUserId, schema.users.id))
        .where(and(
          eq(schema.deals.tenantId, tenantId),
          isNull(schema.deals.deletedAt),
          isNull(schema.deals.wonAt),
          isNull(schema.deals.lostAt),
        ))
        .orderBy(desc(schema.deals.expectedCloseDate));

      const [totals] = await tx
        .select({
          totalProjected: sql<string>`coalesce(sum(
            ${schema.deals.dealValue}::numeric * coalesce(${schema.deals.probability}, 50) / 100 * 0.03
          ), 0)::numeric(12,2)::text`,
          dealCount: sql<number>`count(*)::int`,
        })
        .from(schema.deals)
        .where(and(
          eq(schema.deals.tenantId, tenantId),
          isNull(schema.deals.deletedAt),
          isNull(schema.deals.wonAt),
          isNull(schema.deals.lostAt),
        ));

      return { deals: rows, ...totals };
    });

    return res.json({ data: pendingIncome });
  } catch (err) {
    console.error("Pending income error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get pending income" } });
  }
});
// ---------- GET /api/v1/commissions/structures — List commission structures ---------- //
router.get("/structures", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const agentId = req.query.agentId as string;
    const dealType = req.query.dealType as string;

    const conditions = [
      eq(schema.commissionStructures.tenantId, tenantId),
      isNull(schema.commissionStructures.deletedAt),
    ];

    if (agentId) {
      conditions.push(eq(schema.commissionStructures.agentId, agentId));
    }
    if (dealType) {
      conditions.push(eq(schema.commissionStructures.dealType, dealType));
    }

    const structures = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select({
          id: schema.commissionStructures.id,
          tenantId: schema.commissionStructures.tenantId,
          agentId: schema.commissionStructures.agentId,
          dealType: schema.commissionStructures.dealType,
          brokeragePercentage: schema.commissionStructures.brokeragePercentage,
          agentPercentage: schema.commissionStructures.agentPercentage,
          referralFeeFlat: schema.commissionStructures.referralFeeFlat,
          referralFeePercentage: schema.commissionStructures.referralFeePercentage,
          franchiseFeePercentage: schema.commissionStructures.franchiseFeePercentage,
          effectiveDate: schema.commissionStructures.effectiveDate,
          notes: schema.commissionStructures.notes,
          createdAt: schema.commissionStructures.createdAt,
          updatedAt: schema.commissionStructures.updatedAt,
          agentFirstName: schema.users.firstName,
          agentLastName: schema.users.lastName,
        })
        .from(schema.commissionStructures)
        .leftJoin(schema.users, eq(schema.commissionStructures.agentId, schema.users.id))
        .where(and(...conditions))
        .orderBy(desc(schema.commissionStructures.effectiveDate));
    });

    return res.json({ data: structures });
  } catch (err) {
    console.error("List commission structures error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list commission structures" } });
  }
});

// ---------- POST /api/v1/commissions/structures — Create commission structure ---------- //
router.post("/structures", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user\!;
    const {
      agentId, dealType,
      brokeragePercentage, agentPercentage,
      referralFeeFlat, referralFeePercentage, franchiseFeePercentage,
      effectiveDate, notes,
    } = req.body;

    if (brokeragePercentage === undefined || agentPercentage === undefined) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "brokeragePercentage and agentPercentage are required" },
      });
    }

    const brokeragePct = parseFloat(brokeragePercentage);
    const agentPct = parseFloat(agentPercentage);

    if (isNaN(brokeragePct) || isNaN(agentPct)) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "brokeragePercentage and agentPercentage must be valid numbers" },
      });
    }

    if (Math.abs(brokeragePct + agentPct - 100) > 0.01) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "brokeragePercentage and agentPercentage must sum to 100" },
      });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      // If agentId is provided, verify agent exists
      if (agentId) {
        const [agent] = await tx.select({ id: schema.users.id })
          .from(schema.users)
          .where(and(
            eq(schema.users.id, agentId),
            eq(schema.users.tenantId, tenantId),
            isNull(schema.users.deletedAt),
          ));
        if (\!agent) return { error: "AGENT_NOT_FOUND" };
      }

      const [structure] = await tx.insert(schema.commissionStructures).values({
        tenantId,
        agentId: agentId || null,
        dealType: dealType || null,
        brokeragePercentage: brokeragePct.toFixed(2),
        agentPercentage: agentPct.toFixed(2),
        referralFeeFlat: referralFeeFlat ? parseFloat(referralFeeFlat).toFixed(2) : "0",
        referralFeePercentage: referralFeePercentage ? parseFloat(referralFeePercentage).toFixed(2) : "0",
        franchiseFeePercentage: franchiseFeePercentage ? parseFloat(franchiseFeePercentage).toFixed(2) : "0",
        effectiveDate: effectiveDate || new Date().toISOString().split("T")[0],
        notes: notes || null,
        createdBy: userId,
      }).returning();

      return { structure };
    });

    if ("error" in result) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Agent not found" } });
    }

    logAudit({
      tenantId,
      userId,
      action: "commission_structure.create",
      resourceType: "commission_structure",
      resourceId: result.structure.id,
      details: { agentId, dealType, brokeragePercentage, agentPercentage },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(201).json({ data: result.structure });
  } catch (err) {
    console.error("Create commission structure error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create commission structure" } });
  }
});

// ---------- PATCH /api/v1/commissions/structures/:id — Update commission structure ---------- //
router.patch("/structures/:id", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    const allowedFields = [
      "agentId", "dealType",
      "brokeragePercentage", "agentPercentage",
      "referralFeeFlat", "referralFeePercentage", "franchiseFeePercentage",
      "effectiveDate", "notes",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (["brokeragePercentage", "agentPercentage", "referralFeeFlat", "referralFeePercentage", "franchiseFeePercentage"].includes(field)) {
          updates[field] = parseFloat(req.body[field]).toFixed(2);
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } });
    }

    // Validate percentages sum to 100 if both are being updated
    if (updates.brokeragePercentage !== undefined && updates.agentPercentage !== undefined) {
      const bPct = parseFloat(updates.brokeragePercentage as string);
      const aPct = parseFloat(updates.agentPercentage as string);
      if (Math.abs(bPct + aPct - 100) > 0.01) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "brokeragePercentage and agentPercentage must sum to 100" },
        });
      }
    }

    const [structure] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.commissionStructures)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.commissionStructures.id, id),
          eq(schema.commissionStructures.tenantId, tenantId),
          isNull(schema.commissionStructures.deletedAt),
        ))
        .returning();
    });

    if (!structure) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Commission structure not found" } });
    }

    logAudit({
      tenantId,
      userId,
      action: "commission_structure.update",
      resourceType: "commission_structure",
      resourceId: id,
      details: updates,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({ data: structure });
  } catch (err) {
    console.error("Update commission structure error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update commission structure" } });
  }
});
// ---------- POST /api/v1/commissions — Create commission split ---------- //
router.post("/", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const {
      dealId, agentId, salePrice, commissionRate,
      closingDate, transactionId, notes,
    } = req.body;

    if (!dealId || !agentId || !salePrice || !commissionRate) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "dealId, agentId, salePrice, and commissionRate are required" },
      });
    }

    const salePriceNum = parseFloat(salePrice);
    const commissionRateNum = parseFloat(commissionRate);

    if (isNaN(salePriceNum) || salePriceNum <= 0) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "salePrice must be a positive number" },
      });
    }

    if (isNaN(commissionRateNum) || commissionRateNum <= 0 || commissionRateNum > 1) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "commissionRate must be between 0 and 1 (e.g. 0.03 for 3%)" },
      });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      // Verify deal exists and belongs to tenant
      const [deal] = await tx.select({ id: schema.deals.id, dealType: schema.deals.dealType })
        .from(schema.deals)
        .where(and(
          eq(schema.deals.id, dealId),
          eq(schema.deals.tenantId, tenantId),
          isNull(schema.deals.deletedAt),
        ));

      if (!deal) return { error: "DEAL_NOT_FOUND" };

      // Verify agent exists and belongs to tenant
      const [agent] = await tx.select({ id: schema.users.id })
        .from(schema.users)
        .where(and(
          eq(schema.users.id, agentId),
          eq(schema.users.tenantId, tenantId),
          isNull(schema.users.deletedAt),
        ));

      if (!agent) return { error: "AGENT_NOT_FOUND" };

      // Look up commission structure: agent-specific first, then tenant default
      const structures = await tx.select()
        .from(schema.commissionStructures)
        .where(and(
          eq(schema.commissionStructures.tenantId, tenantId),
          isNull(schema.commissionStructures.deletedAt),
        ))
        .orderBy(desc(schema.commissionStructures.effectiveDate));

      // Find best matching structure
      let structure = structures.find(
        (s) => s.agentId === agentId && s.dealType === deal.dealType,
      ) || null;
      if (!structure) {
        structure = structures.find((s) => s.agentId === agentId && !s.dealType) || null;
      }
      if (!structure) {
        structure = structures.find((s) => !s.agentId && s.dealType === deal.dealType) || null;
      }
      if (!structure) {
        structure = structures.find((s) => !s.agentId && !s.dealType) || null;
      }

      // Calculate splits
      const splits = calculateCommissionSplits(salePriceNum, commissionRateNum, structure);

      const [commission] = await tx.insert(schema.commissionSplits).values({
        tenantId,
        dealId,
        agentId,
        transactionId: transactionId || null,
        salePrice: salePriceNum.toFixed(2),
        commissionRate: commissionRateNum.toFixed(4),
        totalCommission: splits.totalCommission,
        brokerageAmount: splits.brokerageAmount,
        agentAmount: splits.agentAmount,
        referralFee: splits.referralFee,
        franchiseFee: splits.franchiseFee,
        netAgentAmount: splits.netAgentAmount,
        dealType: deal.dealType || null,
        closingDate: closingDate || null,
        status: "pending",
        notes: notes || null,
        createdBy: userId,
      }).returning();

      return { commission, structureUsed: structure?.id || null };
    });

    if ("error" in result) {
      if (result.error === "DEAL_NOT_FOUND") {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Deal not found" } });
      }
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Agent not found" } });
    }

    logAudit({
      tenantId,
      userId,
      action: "commission.create",
      resourceType: "commission_split",
      resourceId: result.commission.id,
      details: { dealId, agentId, salePrice, commissionRate, structureUsed: result.structureUsed },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(201).json({ data: result.commission });
  } catch (err) {
    console.error("Create commission error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create commission" } });
  }
});

// ---------- GET /api/v1/commissions/:id — Get single commission ---------- //
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user\!;
    const { id } = req.params;

    const result = await withTenantContext(tenantId, async (tx) => {
      const [commission] = await tx
        .select({
          id: schema.commissionSplits.id,
          tenantId: schema.commissionSplits.tenantId,
          dealId: schema.commissionSplits.dealId,
          agentId: schema.commissionSplits.agentId,
          transactionId: schema.commissionSplits.transactionId,
          salePrice: schema.commissionSplits.salePrice,
          commissionRate: schema.commissionSplits.commissionRate,
          totalCommission: schema.commissionSplits.totalCommission,
          brokerageAmount: schema.commissionSplits.brokerageAmount,
          agentAmount: schema.commissionSplits.agentAmount,
          referralFee: schema.commissionSplits.referralFee,
          franchiseFee: schema.commissionSplits.franchiseFee,
          netAgentAmount: schema.commissionSplits.netAgentAmount,
          dealType: schema.commissionSplits.dealType,
          closingDate: schema.commissionSplits.closingDate,
          status: schema.commissionSplits.status,
          correctedFromId: schema.commissionSplits.correctedFromId,
          correctionReason: schema.commissionSplits.correctionReason,
          qbSyncDate: schema.commissionSplits.qbSyncDate,
          qbInvoiceId: schema.commissionSplits.qbInvoiceId,
          qbAccountCode: schema.commissionSplits.qbAccountCode,
          notes: schema.commissionSplits.notes,
          createdBy: schema.commissionSplits.createdBy,
          createdAt: schema.commissionSplits.createdAt,
          updatedAt: schema.commissionSplits.updatedAt,
          dealName: schema.deals.dealName,
          propertyAddress: schema.deals.propertyAddress,
          dealValue: schema.deals.dealValue,
          agentFirstName: schema.users.firstName,
          agentLastName: schema.users.lastName,
          agentEmail: schema.users.email,
        })
        .from(schema.commissionSplits)
        .leftJoin(schema.deals, eq(schema.commissionSplits.dealId, schema.deals.id))
        .leftJoin(schema.users, eq(schema.commissionSplits.agentId, schema.users.id))
        .where(and(
          eq(schema.commissionSplits.id, id),
          eq(schema.commissionSplits.tenantId, tenantId),
          isNull(schema.commissionSplits.deletedAt),
        ));

      if (\!commission) return null;

      // If this is a correction, fetch the original record
      let originalCommission = null;
      if (commission.correctedFromId) {
        const [original] = await tx
          .select({
            id: schema.commissionSplits.id,
            salePrice: schema.commissionSplits.salePrice,
            commissionRate: schema.commissionSplits.commissionRate,
            totalCommission: schema.commissionSplits.totalCommission,
            agentAmount: schema.commissionSplits.agentAmount,
            closingDate: schema.commissionSplits.closingDate,
            createdAt: schema.commissionSplits.createdAt,
          })
          .from(schema.commissionSplits)
          .where(eq(schema.commissionSplits.id, commission.correctedFromId));
        originalCommission = original || null;
      }

      // Find any corrections that reference this commission
      const corrections = await tx
        .select({
          id: schema.commissionSplits.id,
          correctionReason: schema.commissionSplits.correctionReason,
          totalCommission: schema.commissionSplits.totalCommission,
          createdAt: schema.commissionSplits.createdAt,
        })
        .from(schema.commissionSplits)
        .where(and(
          eq(schema.commissionSplits.correctedFromId, id),
          isNull(schema.commissionSplits.deletedAt),
        ))
        .orderBy(desc(schema.commissionSplits.createdAt));

      return { ...commission, originalCommission, corrections };
    });

    if (\!result) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Commission not found" } });
    }

    return res.json({ data: result });
  } catch (err) {
    console.error("Get commission error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get commission" } });
  }
});

// ---------- PATCH /api/v1/commissions/:id — Correct a commission ---------- //
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user\!;
    const { id } = req.params;
    const { salePrice, commissionRate, correctionReason } = req.body;

    if (\!correctionReason) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "correctionReason is required for commission corrections" },
      });
    }

    if (\!salePrice && \!commissionRate) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "At least one of salePrice or commissionRate must be provided" },
      });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      // Fetch the original commission
      const [original] = await tx.select()
        .from(schema.commissionSplits)
        .where(and(
          eq(schema.commissionSplits.id, id),
          eq(schema.commissionSplits.tenantId, tenantId),
          isNull(schema.commissionSplits.deletedAt),
        ));

      if (\!original) return { error: "NOT_FOUND" };

      // Mark original as corrected
      await tx.update(schema.commissionSplits)
        .set({ status: "corrected", updatedAt: new Date() })
        .where(eq(schema.commissionSplits.id, id));

      // Calculate new splits with updated values
      const newSalePrice = salePrice ? parseFloat(salePrice) : parseFloat(original.salePrice);
      const newRate = commissionRate ? parseFloat(commissionRate) : parseFloat(original.commissionRate);

      // Look up the structure again for recalculation
      const structures = await tx.select()
        .from(schema.commissionStructures)
        .where(and(
          eq(schema.commissionStructures.tenantId, tenantId),
          isNull(schema.commissionStructures.deletedAt),
        ))
        .orderBy(desc(schema.commissionStructures.effectiveDate));

      let structure = structures.find(
        (s) => s.agentId === original.agentId && s.dealType === original.dealType,
      ) || null;
      if (\!structure) {
        structure = structures.find((s) => s.agentId === original.agentId && \!s.dealType) || null;
      }
      if (\!structure) {
        structure = structures.find((s) => \!s.agentId && s.dealType === original.dealType) || null;
      }
      if (\!structure) {
        structure = structures.find((s) => \!s.agentId && \!s.dealType) || null;
      }

      const splits = calculateCommissionSplits(newSalePrice, newRate, structure);

      // Create new corrected record
      const [corrected] = await tx.insert(schema.commissionSplits).values({
        tenantId,
        dealId: original.dealId,
        agentId: original.agentId,
        transactionId: original.transactionId,
        salePrice: newSalePrice.toFixed(2),
        commissionRate: newRate.toFixed(4),
        totalCommission: splits.totalCommission,
        brokerageAmount: splits.brokerageAmount,
        agentAmount: splits.agentAmount,
        referralFee: splits.referralFee,
        franchiseFee: splits.franchiseFee,
        netAgentAmount: splits.netAgentAmount,
        dealType: original.dealType,
        closingDate: original.closingDate,
        status: "pending",
        correctedFromId: id,
        correctionReason,
        notes: original.notes,
        createdBy: userId,
      }).returning();

      return { corrected, originalId: id };
    });

    if ("error" in result) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Commission not found" } });
    }

    logAudit({
      tenantId,
      userId,
      action: "commission.correct",
      resourceType: "commission_split",
      resourceId: result.corrected.id,
      details: { originalId: result.originalId, salePrice, commissionRate, correctionReason },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({ data: result.corrected });
  } catch (err) {
    console.error("Correct commission error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to correct commission" } });
  }
});

// ---------- POST /api/v1/commissions/:id/sync-to-qb — Mark synced to QuickBooks ---------- //
router.post("/:id/sync-to-qb", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user\!;
    const { id } = req.params;
    const { qbInvoiceId, qbAccountCode } = req.body;

    if (\!qbInvoiceId) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "qbInvoiceId is required" },
      });
    }

    const [commission] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.commissionSplits)
        .set({
          qbSyncDate: new Date(),
          qbInvoiceId,
          qbAccountCode: qbAccountCode || null,
          status: "synced",
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.commissionSplits.id, id),
          eq(schema.commissionSplits.tenantId, tenantId),
          isNull(schema.commissionSplits.deletedAt),
        ))
        .returning();
    });

    if (\!commission) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Commission not found" } });
    }

    logAudit({
      tenantId,
      userId,
      action: "commission.sync_qb",
      resourceType: "commission_split",
      resourceId: id,
      details: { qbInvoiceId, qbAccountCode },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({ data: commission });
  } catch (err) {
    console.error("Sync commission to QB error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to sync commission to QuickBooks" } });
  }
});

export default router;
