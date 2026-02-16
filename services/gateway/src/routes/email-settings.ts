import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../lib/audit';

const router = Router();
router.use(requireAuth);

// ===================================================================
// EMAIL ACCOUNTS
// ===================================================================

// ---------- GET /accounts --- List email accounts ---------- //
router.get("/accounts", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const accounts = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.emailAccounts).where(and(
        eq(schema.emailAccounts.tenantId, tenantId),
        eq(schema.emailAccounts.userId, userId),
        isNull(schema.emailAccounts.deletedAt),
      )).orderBy(desc(schema.emailAccounts.createdAt));
    });
    return res.json({ data: accounts });
  } catch (err) {
    console.error("List accounts error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list email accounts" } });
  }
});

// ---------- POST /accounts --- Add email account ---------- //
router.post("/accounts", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { provider, email, displayName, accessToken, refreshToken, tokenExpiresAt, imapHost, imapPort, smtpHost, smtpPort, useSsl, isPrimary, signature } = req.body;
    if (!provider || !email) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "provider and email are required" } });
    }
    if (isPrimary) {
      await withTenantContext(tenantId, async (tx) => {
        await tx.update(schema.emailAccounts).set({ isPrimary: false, updatedAt: new Date() })
          .where(and(eq(schema.emailAccounts.tenantId, tenantId), eq(schema.emailAccounts.userId, userId)));
      });
    }
    const [account] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.emailAccounts).values({
        tenantId, userId, provider, email, displayName,
        accessToken: accessToken || null, refreshToken: refreshToken || null,
        tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
        imapHost: imapHost || null, imapPort: imapPort || null,
        smtpHost: smtpHost || null, smtpPort: smtpPort || null,
        useSsl: useSsl !== undefined ? useSsl : true,
        isPrimary: isPrimary || false, signature: signature || null,
      }).returning();
    });
    logAudit({ tenantId, userId, action: "email_account.create", resourceType: "email_account",
      resourceId: account.id, details: { provider, email },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.status(201).json({ data: account });
  } catch (err) {
    console.error("Add account error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to add email account" } });
  }
});

// ---------- PATCH /accounts/:id --- Update email account ---------- //
router.patch("/accounts/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};
    const allowedFields = ["displayName", "signature", "isPrimary", "imapHost", "imapPort", "smtpHost", "smtpPort", "useSsl"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } });
    }
    if (updates.isPrimary) {
      await withTenantContext(tenantId, async (tx) => {
        await tx.update(schema.emailAccounts).set({ isPrimary: false, updatedAt: new Date() })
          .where(and(eq(schema.emailAccounts.tenantId, tenantId), eq(schema.emailAccounts.userId, userId)));
      });
    }
    const [account] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.emailAccounts).set({ ...updates, updatedAt: new Date() })
        .where(and(eq(schema.emailAccounts.id, id), eq(schema.emailAccounts.tenantId, tenantId), eq(schema.emailAccounts.userId, userId), isNull(schema.emailAccounts.deletedAt)))
        .returning();
    });
    if (!account) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Email account not found" } });
    logAudit({ tenantId, userId, action: "email_account.update", resourceType: "email_account",
      resourceId: id, details: updates, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: account });
  } catch (err) {
    console.error("Update account error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update email account" } });
  }
});

// ---------- DELETE /accounts/:id --- Remove email account ---------- //
router.delete("/accounts/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [account] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.emailAccounts).set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(schema.emailAccounts.id, id), eq(schema.emailAccounts.tenantId, tenantId), eq(schema.emailAccounts.userId, userId), isNull(schema.emailAccounts.deletedAt)))
        .returning();
    });
    if (!account) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Email account not found" } });
    logAudit({ tenantId, userId, action: "email_account.delete", resourceType: "email_account",
      resourceId: id, details: {}, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: { id, deleted: true } });
  } catch (err) {
    console.error("Delete account error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete email account" } });
  }
});

// ===================================================================
// EMAIL TEMPLATES
// ===================================================================

// ---------- GET /templates --- List templates ---------- //
router.get("/templates", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const category = req.query.category as string;
    const conditions = [
      eq(schema.emailTemplates.tenantId, tenantId),
      isNull(schema.emailTemplates.deletedAt),
      sql`(${schema.emailTemplates.createdBy} = ${userId} OR ${schema.emailTemplates.isShared} = true)`,
    ];
    if (category) conditions.push(eq(schema.emailTemplates.category, category));
    const templates = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.emailTemplates)
        .where(and(...conditions))
        .orderBy(desc(schema.emailTemplates.usageCount));
    });
    return res.json({ data: templates });
  } catch (err) {
    console.error("List templates error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list templates" } });
  }
});

// ---------- POST /templates --- Create template ---------- //
router.post("/templates", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { name, subject, bodyHtml, bodyText, category, variables, isShared } = req.body;
    if (!name || !subject || !bodyHtml) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name, subject, and bodyHtml are required" } });
    }
    const [template] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.emailTemplates).values({
        tenantId, createdBy: userId, name, subject, bodyHtml,
        bodyText: bodyText || null, category: category || 'general',
        variables: variables || [], isShared: isShared || false,
      }).returning();
    });
    logAudit({ tenantId, userId, action: "email_template.create", resourceType: "email_template",
      resourceId: template.id, details: { name, category },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.status(201).json({ data: template });
  } catch (err) {
    console.error("Create template error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create template" } });
  }
});

// ---------- PATCH /templates/:id --- Update template ---------- //
router.patch("/templates/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};
    const allowedFields = ["name", "subject", "bodyHtml", "bodyText", "category", "variables", "isShared"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } });
    }
    const [template] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.emailTemplates).set({ ...updates, updatedAt: new Date() })
        .where(and(eq(schema.emailTemplates.id, id), eq(schema.emailTemplates.tenantId, tenantId), eq(schema.emailTemplates.createdBy, userId), isNull(schema.emailTemplates.deletedAt)))
        .returning();
    });
    if (!template) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Template not found" } });
    return res.json({ data: template });
  } catch (err) {
    console.error("Update template error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update template" } });
  }
});

// ---------- DELETE /templates/:id --- Delete template ---------- //
router.delete("/templates/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [template] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.emailTemplates).set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(schema.emailTemplates.id, id), eq(schema.emailTemplates.tenantId, tenantId), eq(schema.emailTemplates.createdBy, userId), isNull(schema.emailTemplates.deletedAt)))
        .returning();
    });
    if (!template) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Template not found" } });
    return res.json({ data: { id, deleted: true } });
  } catch (err) {
    console.error("Delete template error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete template" } });
  }
});

// ===================================================================
// EMAIL RULES
// ===================================================================

// ---------- GET /rules --- List rules ---------- //
router.get("/rules", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const rules = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.emailRules).where(and(
        eq(schema.emailRules.tenantId, tenantId),
        eq(schema.emailRules.userId, userId),
        isNull(schema.emailRules.deletedAt),
      )).orderBy(desc(schema.emailRules.priority));
    });
    return res.json({ data: rules });
  } catch (err) {
    console.error("List rules error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list rules" } });
  }
});

// ---------- POST /rules --- Create rule ---------- //
router.post("/rules", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { name, description, conditions, actions, priority, isEnabled } = req.body;
    if (!name || !conditions || !actions) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name, conditions, and actions are required" } });
    }
    const [rule] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.emailRules).values({
        tenantId, userId, name, description: description || null,
        conditions, actions, priority: priority || 0,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      }).returning();
    });
    logAudit({ tenantId, userId, action: "email_rule.create", resourceType: "email_rule",
      resourceId: rule.id, details: { name },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.status(201).json({ data: rule });
  } catch (err) {
    console.error("Create rule error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create rule" } });
  }
});

// ---------- PATCH /rules/:id --- Update rule ---------- //
router.patch("/rules/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};
    const allowedFields = ["name", "description", "conditions", "actions", "priority", "isEnabled"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } });
    }
    const [rule] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.emailRules).set({ ...updates, updatedAt: new Date() })
        .where(and(eq(schema.emailRules.id, id), eq(schema.emailRules.tenantId, tenantId), eq(schema.emailRules.userId, userId), isNull(schema.emailRules.deletedAt)))
        .returning();
    });
    if (!rule) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Rule not found" } });
    return res.json({ data: rule });
  } catch (err) {
    console.error("Update rule error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update rule" } });
  }
});

// ---------- DELETE /rules/:id --- Delete rule ---------- //
router.delete("/rules/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [rule] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.emailRules).set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(schema.emailRules.id, id), eq(schema.emailRules.tenantId, tenantId), eq(schema.emailRules.userId, userId), isNull(schema.emailRules.deletedAt)))
        .returning();
    });
    if (!rule) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Rule not found" } });
    return res.json({ data: { id, deleted: true } });
  } catch (err) {
    console.error("Delete rule error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete rule" } });
  }
});

// ===================================================================
// AI PREFERENCES
// ===================================================================

// ---------- GET /ai-preferences --- Get AI preferences ---------- //
router.get("/ai-preferences", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const prefs = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select().from(schema.emailAiPreferences).where(and(
        eq(schema.emailAiPreferences.tenantId, tenantId),
        eq(schema.emailAiPreferences.userId, userId),
      ));
      return row || null;
    });
    if (!prefs) {
      return res.json({ data: { voiceTone: 'professional', writingStyle: 'concise', signaturePreference: 'formal', autoSummarize: true, autoCategories: true, suggestReplies: true, smartPriority: true, learnedPhrases: [], avoidPhrases: [], customInstructions: null, trainingExamples: [], languagePreference: 'en' } });
    }
    return res.json({ data: prefs });
  } catch (err) {
    console.error("Get AI prefs error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get AI preferences" } });
  }
});

// ---------- PUT /ai-preferences --- Update AI preferences ---------- //
router.put("/ai-preferences", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { voiceTone, writingStyle, signaturePreference, autoSummarize, autoCategories, suggestReplies, smartPriority, learnedPhrases, avoidPhrases, customInstructions, trainingExamples, languagePreference } = req.body;
    const existing = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select().from(schema.emailAiPreferences).where(and(
        eq(schema.emailAiPreferences.tenantId, tenantId),
        eq(schema.emailAiPreferences.userId, userId),
      ));
      return row || null;
    });
    const values = {
      voiceTone: voiceTone || 'professional',
      writingStyle: writingStyle || 'concise',
      signaturePreference: signaturePreference || 'formal',
      autoSummarize: autoSummarize !== undefined ? autoSummarize : true,
      autoCategories: autoCategories !== undefined ? autoCategories : true,
      suggestReplies: suggestReplies !== undefined ? suggestReplies : true,
      smartPriority: smartPriority !== undefined ? smartPriority : true,
      learnedPhrases: learnedPhrases || [],
      avoidPhrases: avoidPhrases || [],
      customInstructions: customInstructions || null,
      trainingExamples: trainingExamples || [],
      languagePreference: languagePreference || 'en',
    };
    let prefs;
    if (existing) {
      [prefs] = await withTenantContext(tenantId, async (tx) => {
        return tx.update(schema.emailAiPreferences).set({ ...values, updatedAt: new Date() })
          .where(and(eq(schema.emailAiPreferences.tenantId, tenantId), eq(schema.emailAiPreferences.userId, userId)))
          .returning();
      });
    } else {
      [prefs] = await withTenantContext(tenantId, async (tx) => {
        return tx.insert(schema.emailAiPreferences).values({ tenantId, userId, ...values }).returning();
      });
    }
    logAudit({ tenantId, userId, action: "email_ai_prefs.update", resourceType: "email_ai_preferences",
      details: { voiceTone: values.voiceTone, writingStyle: values.writingStyle },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: prefs });
  } catch (err) {
    console.error("Update AI prefs error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update AI preferences" } });
  }
});

export default router;
