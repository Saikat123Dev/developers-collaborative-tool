import express from "express";
import { createUser, deleteUser, loginUser, logoutUser, verifyEmail } from "../controllers/user.controller";
import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/signup", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await createUser(req, res);
  } catch (error) {
    next(error);
  }
});
router.get("/login",authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      await loginUser(req, res);
    } catch (error) {
      next(error);
    }
    });

router.get("/logout",authMiddleware,async (req: Request, res: Response, next: NextFunction) => {
    try {
      await logoutUser(req, res);
    } catch (error) {
      next(error);
    }
    });

router.delete("/delete",authMiddleware,async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteUser(req, res);
    } catch (error) {
      next(error);
    }
    });

router.get("/verify-email",async (req: Request, res: Response, next: NextFunction) => {
    try {
      await verifyEmail(req, res);
    } catch (error) {
      next(error);
    }
    })
export default router;