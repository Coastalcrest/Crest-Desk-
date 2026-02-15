import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../middleware/auth";

const router = Router();

// All compliance routes require authentication.
router.use(authenticate);

// ------------------------------------------------------------------ //
//  GET /api/v1/compliance/rules                                       //
// ------------------------------------------------------------------ //
router.get("/rules", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  GET /api/v1/compliance/rules/:state                                //
// ------------------------------------------------------------------ //
router.get("/rules/:state", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  POST /api/v1/compliance/check                                      //
// ------------------------------------------------------------------ //
router.post("/check", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  GET /api/v1/compliance/states                                      //
// ------------------------------------------------------------------ //
router.get("/states", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

export default router;
