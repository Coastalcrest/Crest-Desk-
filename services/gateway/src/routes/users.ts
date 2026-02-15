import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../middleware/auth";

const router = Router();

// All user routes require authentication.
router.use(authenticate);

// ------------------------------------------------------------------ //
//  GET /api/v1/users/me                                               //
// ------------------------------------------------------------------ //
router.get("/me", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  PATCH /api/v1/users/me                                             //
// ------------------------------------------------------------------ //
router.patch("/me", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  GET /api/v1/users                                                  //
// ------------------------------------------------------------------ //
router.get("/", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  GET /api/v1/users/:id                                              //
// ------------------------------------------------------------------ //
router.get("/:id", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  POST /api/v1/users/invite                                          //
// ------------------------------------------------------------------ //
router.post("/invite", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  PATCH /api/v1/users/:id/role                                       //
// ------------------------------------------------------------------ //
router.patch("/:id/role", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  DELETE /api/v1/users/:id                                           //
// ------------------------------------------------------------------ //
router.delete("/:id", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  GET /api/v1/users/me/sessions                                      //
// ------------------------------------------------------------------ //
router.get("/me/sessions", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

// ------------------------------------------------------------------ //
//  DELETE /api/v1/users/me/sessions/:id                               //
// ------------------------------------------------------------------ //
router.delete("/me/sessions/:id", (_req: Request, res: Response) => {
  res.status(501).json({ data: { message: "Not implemented yet" } });
});

export default router;
