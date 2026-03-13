import {Request, Response, NextFunction} from "express";
import {verifyAccessToken, JwtAccessPayload} from "../utils/jwt";

declare global {
    namespace Express {
        interface Request {
            user?: JwtAccessPayload;
        }
    }
}

export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({message: "Authorization token is required"});
        return;
    }

    const token = authHeader.substring(7);

    try {
        const payload = verifyAccessToken(token);
        req.user = payload;
        next();
    } catch {
        res.status(401).json({message: "Invalid or expired access token"});
    }
};
