import {CookieOptions, Response} from "express";
import jwt, {SignOptions} from "jsonwebtoken";
import bcrypt from "bcrypt";

export interface JwtPayload {
    userId: string;
    email: string;
    role: "admin" | "user";
}

const COOKIE_BASE_OPTIONS: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
};

export const generateAccessToken = (
    userId: string,
    email: string,
    role: "admin" | "user",
): string => {
    return jwt.sign(
        {userId, email, role},
        process.env.JWT_ACCESS_SECRET as string,
        {
            expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || ("15m" as any),
        },
    );
};

export const generateRefreshToken = (
    userId: string,
    email: string,
    role: "admin" | "user",
): string => {
    return jwt.sign(
        {userId, email, role},
        process.env.JWT_REFRESH_SECRET as string,
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || ("7d" as any),
        },
    );
};

export const compareToken = async (
    token: string,
    hashedToken: string,
): Promise<boolean> => {
    return await bcrypt.compare(token, hashedToken);
};

export const verifyAccessToken = (token: string): JwtPayload => {
    return jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET as string,
    ) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
    return jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET as string,
    ) as JwtPayload;
};

export const setTokenCookies = (
    res: Response,
    accessToken: string,
    refreshToken: string,
): void => {
    res.cookie("accessToken", accessToken, {
        ...COOKIE_BASE_OPTIONS,
        maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
        ...COOKIE_BASE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

export const clearTokenCookies = (res: Response): void => {
    res.clearCookie("accessToken", COOKIE_BASE_OPTIONS);
    res.clearCookie("refreshToken", COOKIE_BASE_OPTIONS);
};
