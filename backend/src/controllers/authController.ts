import {UserModel, IUser} from "../models/users/User";
import {generateAccessToken, generateRefreshToken} from "../utils/jwt";
import {
    AuthResponse,
    RegisterRequestBody,
    LoginRequestBody,
} from "../types/Auth.types";
import bcrypt from "bcrypt";
import {MongoServerError} from "mongodb";

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

export const registerUser = async (
    body: RegisterRequestBody,
): Promise<{authResponse: AuthResponse; refreshToken: string}> => {
    try {
        const {email, password, displayName} = body;

        const passwordHash = await bcrypt.hash(password, 10);

        const user = new UserModel({
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

        return {
            authResponse: buildAuthResponse(user, accessToken),
            refreshToken,
        };
    } catch (err: unknown) {
        if (err instanceof MongoServerError && err.code === 11000) {
            throw new Error("USER_ALREADY_EXISTS");
        }
        throw new Error("INTERNAL_SERVER_ERROR");
    }
};

export const loginUser = async (
    body: LoginRequestBody,
): Promise<{authResponse: AuthResponse; refreshToken: string}> => {
    const {email, password} = body;

    const user = await UserModel.findOne({email: email.toLowerCase()});

    if (!user) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        throw new Error("INVALID_CREDENTIALS");
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

    return {
        authResponse: buildAuthResponse(user, accessToken),
        refreshToken,
    };
};

export const logoutUser = async (userId: string): Promise<void> => {
    await UserModel.findByIdAndUpdate(userId, {
        refreshTokenHash: null,
    });
};

export const getMe = async (userId: string): Promise<AuthResponse["user"]> => {
    const user = await UserModel.findById(userId);

    if (!user) throw new Error("USER_NOT_FOUND");

    return {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        role: user.role,
    };
};
