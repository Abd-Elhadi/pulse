import {Response} from "express";
import jwt, {SignOptions} from "jsonwebtoken";

export interface JwtPayload {
    userId: string;
    email: string;
    role: "admin" | "user";
}

export const generateAccessToken = (
    userId: string,
    email: string,
    role: "admin" | "user",
): string => {
    const payload: JwtPayload = {userId, email, role};
    const secret = process.env.JWT_ACCESS_SECRET as string;

    const options: SignOptions = {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || ("15m" as any),
    };

    return jwt.sign(payload, secret, options);
};

export const generateRefreshToken = (
    userId: string,
    email: string,
    role: "admin" | "user",
): string => {
    const payload: JwtPayload = {userId, email, role};
    const secret = process.env.JWT_REFRESH_SECRET as string;

    const options: SignOptions = {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || ("7d" as any),
    };

    return jwt.sign(payload, secret, options);
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

// export const setTokenCookies = (
//     res: Response,
//     accessToken: string,
//     refreshToken: string,
// ): void => {
//     res.cookie("accessToken", accessToken, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "strict",
//         path: "/",
//         maxAge: 15 * 60 * 1000,
//     });

//     res.cookie("refreshToken", refreshToken, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "strict",
//         path: "/",
//         maxAge: 7 * 24 * 60 * 60 * 1000,
//     });
// };

// export const clearTokenCookies = (res: Response): void => {
//     res.cookie("accessToken", "", {
//         httpOnly: true,
//         expires: new Date(0),
//         path: "/",
//     });

//     res.cookie("refreshToken", "", {
//         httpOnly: true,
//         expires: new Date(0),
//         path: "/",
//     });
// };
