import {Request, Response, NextFunction} from "express";
import bcrypt from "bcrypt";
import {
    verifyAccessToken,
    verifyRefreshToken,
    generateAccessToken,
    JwtPayload,
} from "../utils/jwt";
import {UserModel} from "../models/User";

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const accessToken = req.cookies.accessToken;
        const refreshToken = req.cookies.refreshToken;

        if (accessToken) {
            try {
                const decoded = verifyAccessToken(accessToken);
                req.userId = decoded.userId;
                req.user = decoded;
                return next();
            } catch {}
        }

        if (refreshToken) {
            try {
                const decoded = verifyRefreshToken(refreshToken);

                const user = await UserModel.findById(decoded.userId);

                if (!user || !user.refreshTokenHash) {
                    res.status(401).json({message: "Invalid refresh token"});
                    return;
                }

                const isValid = await bcrypt.compare(
                    refreshToken,
                    user.refreshTokenHash,
                );

                if (!isValid) {
                    res.status(401).json({message: "Invalid refresh token"});
                    return;
                }

                const newAccessToken = generateAccessToken(
                    user._id.toString(),
                    user.email,
                    user.role,
                );

                res.cookie("accessToken", newAccessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "strict",
                    path: "/",
                    maxAge: 15 * 60 * 1000,
                });

                req.userId = user._id.toString();
                req.user = {
                    userId: user._id.toString(),
                    email: user.email,
                    role: user.role,
                };

                return next();
            } catch {
                res.status(401).json({message: "Invalid refresh token"});
                return;
            }
        }

        res.status(401).json({message: "Authentication required"});
    } catch {
        res.status(500).json({message: "Authentication error"});
    }
};
