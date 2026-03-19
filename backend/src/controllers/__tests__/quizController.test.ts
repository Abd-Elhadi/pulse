import {jest, describe, it, expect, beforeEach} from "@jest/globals";
import * as authService from "../authController";
import {UserModel} from "../../models/User";
import * as jwtUtils from "../../utils/jwt";
import {MongoServerError} from "mongodb";

jest.mock("../../models/User");
jest.mock("../../utils/jwt");

describe("authController", () => {
    const mockUser = {
        _id: {toString: () => "user123"},
        email: "test@example.com",
        displayName: "Test User",
        avatarUrl: null,
        bio: null,
        role: "user",
        refreshTokenHash: null,
        comparePassword: jest.fn(),
        save: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue(
            "access_token",
        );
        (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue(
            "refresh_token",
        );
    });

    describe("registerUser", () => {
        it("should throw USER_ALREADY_EXISTS on duplicate email", async () => {
            const duplicateError = new MongoServerError({
                message: "duplicate key",
            });
            duplicateError.code = 11000;
            (UserModel as unknown as jest.Mock).mockImplementation(() => ({
                ...mockUser,
                save: jest.fn().mockRejectedValue(duplicateError),
            }));

            await expect(
                authService.registerUser({
                    email: "test@example.com",
                    password: "password123",
                    displayName: "Test",
                }),
            ).rejects.toThrow("USER_ALREADY_EXISTS");
        });

        it("should create user and return authResponse with tokens", async () => {
            (UserModel as unknown as jest.Mock).mockImplementation(() => ({
                ...mockUser,
                save: jest.fn().mockResolvedValue(undefined),
            }));

            const result = await authService.registerUser({
                email: "new@example.com",
                password: "password123",
                displayName: "Test",
            });

            expect(result.authResponse.accessToken).toBe("access_token");
            expect(result.refreshToken).toBe("refresh_token");
        });
    });

    describe("loginUser", () => {
        it("should throw INVALID_CREDENTIALS if user not found", async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue(null);

            await expect(
                authService.loginUser({
                    email: "none@example.com",
                    password: "pass",
                }),
            ).rejects.toThrow("INVALID_CREDENTIALS");
        });

        it("should throw INVALID_CREDENTIALS if password wrong", async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
            (mockUser.comparePassword as jest.Mock).mockResolvedValue(false);

            await expect(
                authService.loginUser({
                    email: "test@example.com",
                    password: "wrong",
                }),
            ).rejects.toThrow("INVALID_CREDENTIALS");
        });

        it("should return authResponse and refreshToken on success", async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
            (mockUser.comparePassword as jest.Mock).mockResolvedValue(true);

            const result = await authService.loginUser({
                email: "test@example.com",
                password: "password123",
            });

            expect(result.authResponse.accessToken).toBe("access_token");
            expect(result.refreshToken).toBe("refresh_token");
            expect(mockUser.save).toHaveBeenCalled();
        });
    });

    describe("logoutUser", () => {
        it("should clear refreshTokenHash", async () => {
            (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

            await authService.logoutUser("user123");

            expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                {
                    refreshTokenHash: null,
                },
            );
        });
    });

    describe("getMe", () => {
        it("should throw USER_NOT_FOUND if user missing", async () => {
            (UserModel.findById as jest.Mock).mockResolvedValue(null);
            await expect(authService.getMe("user123")).rejects.toThrow(
                "USER_NOT_FOUND",
            );
        });

        it("should return user profile", async () => {
            (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
            const result = await authService.getMe("user123");
            expect(result.id).toBe("user123");
            expect(result.email).toBe("test@example.com");
        });
    });
});
