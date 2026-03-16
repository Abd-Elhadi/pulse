import {jest, describe, it, expect, beforeEach} from "@jest/globals";
import * as authService from "../authController";
import {UserModel} from "../../models/users/User";
import * as jwtUtils from "../../utils/jwt";

jest.mock("../../models/users/User");
jest.mock("../../utils/jwt");

describe("authService", () => {
    const mockUser = {
        _id: {toString: () => "user123"},
        email: "test@example.com",
        displayName: "Test User",
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
        it("should throw if email already exists", async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
            await expect(
                authService.registerUser({
                    email: "test@example.com",
                    password: "password123",
                    displayName: "Test",
                }),
            ).rejects.toThrow("USER_ALREADY_EXISTS");
        });

        it("should create user and return tokens", async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue(null);
            (UserModel.create as jest.Mock).mockResolvedValue(mockUser);
            const result = await authService.registerUser({
                email: "new@example.com",
                password: "password123",
                displayName: "Test",
            });
            expect(result.accessToken).toBe("access_token");
            expect(mockUser.save).toHaveBeenCalled();
        });
    });

    describe("loginUser", () => {
        it("should throw for invalid credentials", async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
            mockUser.comparePassword.mockResolvedValue(false);
            await expect(
                authService.loginUser({
                    email: "test@example.com",
                    password: "wrong",
                }),
            ).rejects.toThrow("INVALID_CREDENTIALS");
        });

        it("should login successfully", async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
            mockUser.comparePassword.mockResolvedValue(true);
            const result = await authService.loginUser({
                email: "test@example.com",
                password: "password123",
            });
            expect(result.accessToken).toBe("access_token");
            expect(mockUser.save).toHaveBeenCalled();
        });
    });

    describe("logoutUser", () => {
        it("should clear refresh token", async () => {
            (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
            await authService.logoutUser("user123");
            expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                {refreshTokenHash: null},
            );
        });
    });
});
