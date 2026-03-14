import {Router} from "express";
import * as authController from "../controllers/authController";
import {authMiddleware} from "../middlewares/auth";

const router = Router();

router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.post("/refresh", authController.refreshTokens);
router.post("/logout", authMiddleware, authController.logoutUser);
router.get("/me", authMiddleware, authController.getMe);

export default router;
