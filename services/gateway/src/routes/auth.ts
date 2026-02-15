import { Router } from "express";
import type { Request, Response } from "express";
import { authLimiter } from "../middleware/rate-limiter";

const router = Router();

// Apply the stricter auth rate limiter to every route in this group.
router.use(authLimiter);

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/login                                            //
// ------------------------------------------------------------------ //
router.post("/login", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/register                                         //
// ------------------------------------------------------------------ //
router.post("/register", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/logout                                           //
// ------------------------------------------------------------------ //
router.post("/logout", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/refresh                                          //
// ------------------------------------------------------------------ //
router.post("/refresh", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/forgot-password                                  //
// ------------------------------------------------------------------ //
router.post("/forgot-password", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/reset-password                                   //
// ------------------------------------------------------------------ //
router.post("/reset-password", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/mfa/setup                                       //
// ------------------------------------------------------------------ //
router.post("/mfa/setup", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/mfa/verify                                      //
// ------------------------------------------------------------------ //
router.post("/mfa/verify", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  POST /api/v1/auth/mfa/confirm                                     //
// ------------------------------------------------------------------ //
router.post("/mfa/confirm", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  DELETE /api/v1/auth/mfa                                            //
// ------------------------------------------------------------------ //
router.delete("/mfa", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

export default router;
