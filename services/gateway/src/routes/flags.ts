import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../middleware/auth";

const router = Router();

// All feature flag routes require authentication.
router.use(authenticate);

// ------------------------------------------------------------------ //
//  GET /api/v1/flags                                                  //
// ------------------------------------------------------------------ //
router.get("/", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  GET /api/v1/flags/:key                                             //
// ------------------------------------------------------------------ //
router.get("/:key", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  PUT /api/v1/flags/:key                                             //
// ------------------------------------------------------------------ //
router.put("/:key", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

export default router;
