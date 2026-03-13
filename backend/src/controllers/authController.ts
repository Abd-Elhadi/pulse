import {Request, Response} from "express";
import {UserModel, IUser} from "../models/users/User";
import {
    hashPassword,
    comparePassword,
    hashToken,
    compareToken,
} from "../utils/hashUtils";
import {generateTokenPair, verifyRefreshToken} from "../utils/jwt";
import {
    RegisterRequestBody,
    LoginRequestBody,
    AuthResponse,
    MessageResponse,
} from "../types/Auth.types";

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const buildAuthResponse = (user: IUser, accessToken: string): AuthResponse => ({
    accessToken,
    user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        xp: user.xp,
        streak: user.streak,
        role: user.role,
    },
});

export const handleRegister = async (
    req: Request<object, AuthResponse | MessageResponse, RegisterRequestBody>,
    res: Response,
) => {
    const {email, password, displayName} = req.body;
    if (!email || !password || !displayName) {
        return res
            .status(400)
            .json({message: "email, password, and displayName are required"});
    }
    if (password.length < 8) {
        return res
            .status(400)
            .json({message: "Password must be at least 8 characters"});
    }

    try {
        const passwordHash = await hashPassword(password);
        const user = new UserModel({
            email: email.toLowerCase(),
            passwordHash,
            displayName,
        });

        const {accessToken, refreshToken} = generateTokenPair(
            {userId: user._id.toString(), email: user.email, role: user.role},
            {userId: user._id.toString()},
        );

        user.refreshTokenHash = await hashToken(refreshToken);
        await user.save(); // 1 visit

        res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
        return res.status(201).json(buildAuthResponse(user, accessToken));
    } catch (err: any) {
        if (err.code === 11000)
            return res.status(409).json({message: "Email is already in use"});
        return res.status(500).json({message: "Internal server error"});
    }
};

export const handleLogin = async (
    req: Request<object, AuthResponse | MessageResponse, LoginRequestBody>,
    res: Response,
) => {
    const {email, password} = req.body;
    if (!email || !password) {
        return res
            .status(400)
            .json({message: "email and password are required"});
    }

    try {
        const user = await UserModel.findOne({email: email.toLowerCase()}); // 1 visit
        if (!user || !(await comparePassword(password, user.passwordHash))) {
            return res.status(401).json({message: "Invalid email or password"});
        }

        const {accessToken, refreshToken} = generateTokenPair(
            {userId: user._id.toString(), email: user.email, role: user.role},
            {userId: user._id.toString()},
        );

        const refreshTokenHash = await hashToken(refreshToken);
        await UserModel.updateOne({_id: user._id}, {refreshTokenHash}); // 2 visits total

        res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
        return res.status(200).json(buildAuthResponse(user, accessToken));
    } catch (err) {
        return res.status(500).json({message: "Internal server error"});
    }
};

export const handleRefresh = async (req: Request, res: Response) => {
    const token =
        (req.cookies as Record<string, string>)["refreshToken"] ??
        req.body.refreshToken;
    if (!token)
        return res.status(401).json({message: "Refresh token is required"});

    try {
        const payload = verifyRefreshToken(token);
        const user = await UserModel.findById(payload.userId); // 1 visit

        if (
            !user?.refreshTokenHash ||
            !(await compareToken(token, user.refreshTokenHash))
        ) {
            throw new Error();
        }

        const {accessToken, refreshToken: newRefreshToken} = generateTokenPair(
            {userId: user._id.toString(), email: user.email, role: user.role},
            {userId: user._id.toString()},
        );

        const refreshTokenHash = await hashToken(newRefreshToken);
        await UserModel.updateOne({_id: user._id}, {refreshTokenHash}); // 2 visits total

        res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);
        return res.status(200).json(buildAuthResponse(user, accessToken));
    } catch {
        res.clearCookie("refreshToken");
        return res
            .status(401)
            .json({message: "Invalid or expired refresh token"});
    }
};

export const handleLogout = async (req: Request, res: Response) => {
    try {
        await UserModel.updateOne(
            {_id: req.user!.userId},
            {refreshTokenHash: null},
        );
        res.clearCookie("refreshToken");
        return res.status(200).json({message: "Logged out successfully"});
    } catch {
        return res.status(500).json({message: "Internal server error"});
    }
};

export const handleGetMe = async (req: Request, res: Response) => {
    try {
        const user = await UserModel.findById(req.user!.userId);
        if (!user) return res.status(404).json({message: "User not found"});
        return res.status(200).json(buildAuthResponse(user, "").user);
    } catch {
        return res.status(500).json({message: "Internal server error"});
    }
};
