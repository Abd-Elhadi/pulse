import {jest, describe, it, expect, beforeEach} from "@jest/globals";
import * as authService from "../authController";
import {UserModel} from "../../models/users/User";
import * as hashUtils from "../../utils/hashUtils";
import * as jwtUtils from "../../utils/jwt";

jest.mock("../../models/users/User", () => ({
    UserModel: {
        create: jest.fn(),
        findOne: jest.fn(),
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
    },
}));

jest.mock("../../utils/hashUtils", () => ({
    hashPassword: jest.fn(),
    comparePassword: jest.fn(),
    hashToken: jest.fn(),
    compareToken: jest.fn(),
}));

jest.mock("../../utils/jwt", () => ({
    generateTokenPair: jest.fn(),
}));

describe("authService", () => {
    const mockUser = {
        _id: {toString: () => "user123"},
        email: "test@example.com",
        passwordHash: "hashedpassword",
        displayName: "Test User",
        avatarUrl: "",
        bio: "",
        role: "user",
        refreshTokenHash: null,
        save: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        (jwtUtils.generateTokenPair as jest.Mock).mockReturnValue({
            accessToken: "access_token",
            refreshToken: "refresh_token",
        });

        (hashUtils.hashPassword as jest.Mock).mockResolvedValue("hashed_pass");
        (hashUtils.hashToken as jest.Mock).mockResolvedValue("hashed_token");
    });

    describe("registerUser", () => {
        it("should throw if email already exists", async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

            await expect(
                authService.registerUser({
                    email: "test@example.com",
                    password: "password123",
                    displayName: "Test",
                }),
            ).rejects.toThrow("EMAIL_TAKEN");
        });

        it("should create user and return tokens", async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue(null);
            (UserModel.create as jest.Mock).mockResolvedValue(mockUser);

            const result = await authService.registerUser({
                email: "new@example.com",
                password: "password123",
                displayName: "Test",
            });

            expect(UserModel.create).toHaveBeenCalled();
            expect(mockUser.save).toHaveBeenCalled();
            expect(result.refreshToken).toBe("refresh_token");
        });
    });

    describe("loginUser", () => {
        it("should throw for invalid credentials", async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
            (hashUtils.comparePassword as jest.Mock).mockResolvedValue(false);

            await expect(
                authService.loginUser({
                    email: "test@example.com",
                    password: "wrong",
                }),
            ).rejects.toThrow("INVALID_CREDENTIALS");
        });

        it("should login successfully", async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
            (hashUtils.comparePassword as jest.Mock).mockResolvedValue(true);

            const result = await authService.loginUser({
                email: "test@example.com",
                password: "password123",
            });

            expect(mockUser.save).toHaveBeenCalled();
            expect(result.refreshToken).toBe("refresh_token");
        });
    });

    describe("logoutUser", () => {
        it("should clear refresh token", async () => {
            await authService.logoutUser("user123");

            expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                {refreshTokenHash: null},
            );
        });
    });
});
