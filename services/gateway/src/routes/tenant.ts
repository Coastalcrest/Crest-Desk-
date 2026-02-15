import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../middleware/auth";

const router = Router();

// All tenant routes require authentication.
router.use(authenticate);

// ------------------------------------------------------------------ //
//  GET /api/v1/tenant                                                 //
// ------------------------------------------------------------------ //
router.get("/", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  PATCH /api/v1/tenant                                               //
// ------------------------------------------------------------------ //
router.patch("/", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  PATCH /api/v1/tenant/branding                                      //
// ------------------------------------------------------------------ //
router.patch("/branding", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  GET /api/v1/tenant/compliance                                      //
// ------------------------------------------------------------------ //
router.get("/compliance", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  POST /api/v1/tenant/compliance/rules                               //
// ------------------------------------------------------------------ //
router.post("/compliance/rules", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

export default router;
