import {UserModel, IUser} from "../models/users/User";
import {
    hashPassword,
    comparePassword,
    hashToken,
    compareToken,
} from "../utils/hashUtils";
import {
    generateTokenPair,
    verifyRefreshToken,
    JwtAccessPayload,
    TokenPair,
} from "../utils/jwt";
import {
    RegisterRequestBody,
    LoginRequestBody,
    AuthResponse,
} from "../types/Auth.types";

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
    const {email, password, displayName} = body;

    const existing = await UserModel.findOne({email: email.toLowerCase()});
    if (existing) {
        throw new Error("EMAIL_TAKEN");
    }

    if (password.length < 8) {
        throw new Error("PASSWORD_TOO_SHORT");
    }

    const passwordHash = await hashPassword(password);

    const user = await UserModel.create({
        email: email.toLowerCase(),
        passwordHash,
        displayName,
    });

    const accessPayload: JwtAccessPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
    };

    const {accessToken, refreshToken}: TokenPair = generateTokenPair(
        accessPayload,
        {
            userId: user._id.toString(),
        },
    );

    user.refreshTokenHash = await hashToken(refreshToken);
    await user.save();

    return {authResponse: buildAuthResponse(user, accessToken), refreshToken};
};

export const loginUser = async (
    body: LoginRequestBody,
): Promise<{authResponse: AuthResponse; refreshToken: string}> => {
    const {email, password} = body;

    const user = await UserModel.findOne({email: email.toLowerCase()});
    if (!user) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const accessPayload: JwtAccessPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
    };

    const {accessToken, refreshToken}: TokenPair = generateTokenPair(
        accessPayload,
        {
            userId: user._id.toString(),
        },
    );

    user.refreshTokenHash = await hashToken(refreshToken);
    await user.save();

    return {authResponse: buildAuthResponse(user, accessToken), refreshToken};
};

export const refreshTokens = async (
    token: string,
): Promise<{authResponse: AuthResponse; refreshToken: string}> => {
    let payload: {userId: string};

    try {
        payload = verifyRefreshToken(token);
    } catch {
        throw new Error("INVALID_REFRESH_TOKEN");
    }

    const user = await UserModel.findById(payload.userId);
    if (!user || !user.refreshTokenHash) {
        throw new Error("INVALID_REFRESH_TOKEN");
    }

    const tokenMatch = await compareToken(token, user.refreshTokenHash);
    if (!tokenMatch) {
        throw new Error("INVALID_REFRESH_TOKEN");
    }

    const accessPayload: JwtAccessPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
    };

    const {accessToken, refreshToken: newRefreshToken}: TokenPair =
        generateTokenPair(accessPayload, {userId: user._id.toString()});

    user.refreshTokenHash = await hashToken(newRefreshToken);
    await user.save();

    return {
        authResponse: buildAuthResponse(user, accessToken),
        refreshToken: newRefreshToken,
    };
};

export const logoutUser = async (userId: string): Promise<void> => {
    await UserModel.findByIdAndUpdate(userId, {refreshTokenHash: null});
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
