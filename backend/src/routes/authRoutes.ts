import {Request, Response, Router} from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    getMe,
} from "../controllers/authController";
import {authenticate} from "../middlewares/auth";
import {
    validateEmail,
    validateName,
    validatePassword,
} from "../utils/validators";
import {auditLog} from "../middlewares/audit";
import {clearTokenCookies, setTokenCookies} from "../utils/jwt";

const router = Router();

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post(
    "/register",
    auditLog({action: "create", entity: "user"}),
    async (req: Request, res: Response) => {
        const {email, password, displayName} = req.body;

        if (!email || !password || !displayName) {
            res.status(400).json({
                message: "email, password, and displayName are required",
            });
            return;
        }

        if (!validateEmail(email)) {
            res.status(400).json({
                message: "Invalid email format",
            });
            return;
        }

        const passwordValidation = validatePassword(password);

        if (!passwordValidation.valid) {
            res.status(400).json({
                message: passwordValidation.message,
            });
            return;
        }

        const nameValidation = validateName(displayName);
        if (!nameValidation.valid) {
            res.status(400).json({
                message: nameValidation.message,
            });
            return;
        }

        try {
            const {authResponse, refreshToken} = await registerUser({
                email,
                password,
                displayName,
            });
            setTokenCookies(res, authResponse.accessToken, refreshToken);
            res.status(201).json(authResponse);
        } catch (err) {
            const error = err as Error;
            if (error.message === "USER_ALREADY_EXISTS") {
                res.status(400).json({
                    message: "User already exists.",
                });
                return;
            }
            console.error("Register error:", err);
            res.status(500).json({message: "Internal server error"});
        }
    },
);
router.post("/login", async (req: Request, res: Response) => {
    const {email, password} = req.body;

    if (!email || !password) {
        res.status(400).json({message: "email and password are required"});
        return;
    }

    try {
        const {authResponse, refreshToken} = await loginUser({
            email,
            password,
        });
        setTokenCookies(res, authResponse.accessToken, refreshToken);
        res.status(200).json(authResponse);
    } catch (err) {
        const error = err as Error;
        if (error.message === "INVALID_CREDENTIALS") {
            res.status(401).json({message: "Invalid email or password"});
            return;
        }
        console.error("Login error:", error);
        res.status(500).json({message: "Internal server error"});
    }
});
router.post("/logout", authenticate, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({message: "Authentication required"});
            return;
        }
        await logoutUser(req.user.userId);
        clearTokenCookies(res);
        res.status(200).json({message: "Logged out successfully"});
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({message: "Internal server error"});
    }
});
router.get("/me", authenticate, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({message: "Authentication required"});
            return;
        }
        const user = await getMe(req.user.userId);
        res.status(200).json(user);
    } catch (err) {
        const error = err as Error;
        if (error.message === "USER_NOT_FOUND") {
            res.status(404).json({message: "User not found"});
            return;
        }
        console.error("Get me error:", error);
        res.status(500).json({message: "Internal server error"});
    }
});

export default router;
