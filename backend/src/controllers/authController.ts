import {UserModel, IUser} from "../models/users/User";
import {
    generateAccessToken,
    generateRefreshToken,
    setTokenCookies,
    clearTokenCookies,
} from "../utils/jwt";
import {AuthResponse} from "../types/Auth.types";
import {Request, Response} from "express";
import {
    validateEmail,
    validateName,
    validatePassword,
} from "../utils/validators";
import bcrypt from "bcrypt";
import {AuthRequest} from "../middlewares/auth";

const buildAuthResponse = (user: IUser, accessToken: string): AuthResponse => ({
    accessToken,
    user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        role: user.role,
    },
});

export const registerUser = async (req: Request, res: Response) => {
    try {
        const {email, password, displayName} = req.body;

        if (!email || !password || !displayName) {
            res.status(400).json({message: "All fields are required"});
            return;
        }

        if (!validateEmail(email)) {
            res.status(400).json({message: "Invalid email format"});
            return;
        }

        const passwordValidation = validatePassword(password);

        if (!passwordValidation.valid) {
            res.status(400).json({message: passwordValidation.message});
            return;
        }

        const nameValidation = validateName(displayName);
        if (!nameValidation.valid) {
            res.status(400).json({message: nameValidation.message});
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await UserModel.create({
            email: email.toLowerCase(),
            passwordHash,
            displayName,
        });

        const accessToken = generateAccessToken(
            user._id.toString(),
            user.email,
            user.role,
        );

        const refreshToken = generateRefreshToken(
            user._id.toString(),
            user.email,
            user.role,
        );

        user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
        await user.save();

        setTokenCookies(res, accessToken, refreshToken);

        return res.json({
            authResponse: buildAuthResponse(user, accessToken),
            refreshToken,
        });
    } catch (err: any) {
        if (err.code === 11000) {
            res.status(400).json({message: "User already exists"});
            return;
        }

        return res.status(500).json({message: "Internal server error"});
    }
};

export const loginUser = async (req: Request, res: Response) => {
    try {
        const {email, password} = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({message: "Email and password are required"});
        }

        const user = await UserModel.findOne({email: email.toLowerCase()});

        if (!user) {
            res.status(401).json({message: "Invalid email"});
            return;
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            res.status(401).json({message: "Invalid password"});
            return;
        }

        const accessToken = generateAccessToken(
            user._id.toString(),
            user.email,
            user.role,
        );

        const refreshToken = generateRefreshToken(
            user._id.toString(),
            user.email,
            user.role,
        );

        user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
        await user.save();

        setTokenCookies(res, accessToken, refreshToken);

        return res.json({
            authResponse: buildAuthResponse(user, accessToken),
            refreshToken,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({message: "Internal server error"});
    }
};

export const logoutUser = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
    try {
        if (req.userId) {
            await UserModel.findByIdAndUpdate(req.userId, {
                refreshTokenHash: null,
            });
        }

        clearTokenCookies(res);

        res.status(200).json({message: "Logout successful"});
    } catch {
        res.status(500).json({message: "Logout failed"});
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    const user = await UserModel.findById(req.userId);

    if (!user) {
        return res.status(404).json({message: "User not found"});
    }

    return res.json({
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        role: user.role,
    });
};
