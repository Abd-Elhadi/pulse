import {Router} from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    getMe,
} from "../controllers/authController";
import {authenticate} from "../middlewares/auth";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", authenticate, logoutUser);
router.get("/me", authenticate, getMe);

export default router;
