import {Router} from "express";
import * as authController from "../controllers/authController";
import {authMiddleware} from "../middlewares/auth";

const router = Router();

router.post("/register", authController.handleRegister);
router.post("/login", authController.handleLogin);
router.post("/refresh", authController.handleRefresh);
router.post("/logout", authMiddleware, authController.handleLogout);
router.get("/me", authMiddleware, authController.handleGetMe);

export default router;
