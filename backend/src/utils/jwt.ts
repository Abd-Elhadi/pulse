import {Response} from "express";
import jwt, {SignOptions} from "jsonwebtoken";

export interface JwtAccessPayload {
    userId: string;
    email: string;
    role: "admin" | "user";
}

export interface JwtRefreshPayload {
    userId: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export const generateAccessToken = (payload: JwtAccessPayload): string => {
    const secret = process.env["JWT_ACCESS_SECRET"] as string;
    const options: SignOptions = {
        expiresIn: (process.env["JWT_ACCESS_EXPIRES_IN"] ??
            "15m") as SignOptions["expiresIn"],
    };
    return jwt.sign(payload, secret, options);
};

export const generateRefreshToken = (payload: JwtRefreshPayload): string => {
    const secret = process.env["JWT_REFRESH_SECRET"] as string;
    const options: SignOptions = {
        expiresIn: (process.env["JWT_REFRESH_EXPIRES_IN"] ??
            "7d") as SignOptions["expiresIn"],
    };
    return jwt.sign(payload, secret, options);
};

export const generateTokenPair = (
    accessPayload: JwtAccessPayload,
    refreshPayload: JwtRefreshPayload,
): TokenPair => ({
    accessToken: generateAccessToken(accessPayload),
    refreshToken: generateRefreshToken(refreshPayload),
});

export const verifyAccessToken = (token: string): JwtAccessPayload => {
    const secret = process.env["JWT_ACCESS_SECRET"] as string;
    return jwt.verify(token, secret) as JwtAccessPayload;
};

export const verifyRefreshToken = (token: string): JwtRefreshPayload => {
    const secret = process.env["JWT_REFRESH_SECRET"] as string;
    return jwt.verify(token, secret) as JwtRefreshPayload;
};

export const setTokenCookies = (
    res: Response,
    accessToken: string,
    refreshToken: string,
): void => {
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

export const clearTokenCookies = (res: Response): void => {
    res.cookie("accessToken", "", {
        httpOnly: true,
        expires: new Date(0),
    });
    res.cookie("refreshToken", "", {
        httpOnly: true,
        expires: new Date(0),
    });
};
