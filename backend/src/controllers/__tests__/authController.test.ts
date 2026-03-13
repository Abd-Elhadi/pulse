import {jest, describe, it, expect, beforeEach} from "@jest/globals";
import {Request, Response} from "express";
import * as authController from "../authController";
import {UserModel} from "../../models/users/User";
import * as hashUtils from "../../utils/hashUtils";
import * as jwtUtils from "../../utils/jwt";

// Mock the UserModel methods
jest.mock("../../models/users/User", () => {
    const MockUser = function (
        this: {
            _id: {toString: () => string};
            UserModel: {
                (data: any): void;
                findOne: import("jest-mock").Mock<
                    import("jest-mock").UnknownFunction
                >;
                updateOne: import("jest-mock").Mock<
                    import("jest-mock").UnknownFunction
                >;
            };
        },
        data: any,
    ) {
        Object.assign(this, data);
        this._id = {toString: () => "user123"};
    };
    MockUser.prototype.save = jest.fn().mockResolvedValue(undefined);
    MockUser.findOne = jest.fn();
    MockUser.updateOne = jest.fn();
    return {UserModel: MockUser};
});

jest.mock("../../utils/hashUtils", () => ({
    hashPassword: jest.fn(),
    comparePassword: jest.fn(),
    hashToken: jest.fn(),
}));

jest.mock("../../utils/jwt", () => ({
    generateTokenPair: jest.fn(),
}));

describe("authController", () => {
    let mockRequest: Request;
    let mockResponse: Response;

    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;
    let cookieMock: jest.Mock;

    const mockUser = {
        _id: {toString: () => "user123"},
        email: "test@example.com",
        passwordHash: "hashedpassword",
        displayName: "Test User",
        role: "user",
        save: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnThis();
        cookieMock = jest.fn().mockReturnThis();

        // build a loose Response and cast once at the end
        mockResponse = {
            status: statusMock as unknown as Response["status"],
            json: jsonMock as unknown as Response["json"],
            cookie: cookieMock as unknown as Response["cookie"],
            clearCookie: jest
                .fn()
                .mockReturnThis() as unknown as Response["clearCookie"],
        } as unknown as Response;

        // Now configure the mocks returned by the factories
        (jwtUtils.generateTokenPair as jest.Mock).mockReturnValue({
            accessToken: "access_token",
            refreshToken: "refresh_token",
        });

        (hashUtils.hashPassword as jest.Mock).mockResolvedValue(
            "hashed_password",
        );
        (hashUtils.hashToken as jest.Mock).mockResolvedValue("hashed_token");
    });

    describe("handleRegister", () => {
        it("should return 409 if email is already in use", async () => {
            mockRequest = {
                body: {
                    email: "test@example.com",
                    password: "password123",
                    displayName: "Test",
                },
            } as Request;

            const error: any = new Error();
            error.code = 11000;

            (UserModel.prototype.save as jest.Mock).mockRejectedValue(error);

            await authController.handleRegister(mockRequest, mockResponse);

            expect(statusMock).toHaveBeenCalledWith(409);
            expect(jsonMock).toHaveBeenCalledWith({
                message: "Email is already in use",
            });
        });

        it("should return 201 and set cookie on success", async () => {
            mockRequest = {
                body: {
                    email: "new@example.com",
                    password: "password123",
                    displayName: "Test",
                },
            } as Request;

            (UserModel.prototype.save as jest.Mock).mockResolvedValue(mockUser);

            (
                hashUtils.hashPassword as jest.MockedFunction<
                    typeof hashUtils.hashPassword
                >
            ).mockResolvedValue("hashed_pass");

            await authController.handleRegister(mockRequest, mockResponse);

            expect(statusMock).toHaveBeenCalledWith(201);

            expect(cookieMock).toHaveBeenCalledWith(
                "refreshToken",
                "refresh_token",
                expect.any(Object),
            );
        });
    });

    describe("handleLogin", () => {
        it("should return 401 for invalid credentials", async () => {
            mockRequest = {
                body: {
                    email: "test@example.com",
                    password: "wrong",
                },
            } as Request;

            (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

            (
                hashUtils.comparePassword as jest.MockedFunction<
                    typeof hashUtils.comparePassword
                >
            ).mockResolvedValue(false);

            await authController.handleLogin(mockRequest, mockResponse);

            expect(statusMock).toHaveBeenCalledWith(401);

            expect(jsonMock).toHaveBeenCalledWith({
                message: "Invalid email or password",
            });
        });

        it("should return 200 and update refreshTokenHash on success", async () => {
            mockRequest = {
                body: {
                    email: "test@example.com",
                    password: "password123",
                },
            } as Request;

            (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

            (
                hashUtils.comparePassword as jest.MockedFunction<
                    typeof hashUtils.comparePassword
                >
            ).mockResolvedValue(true);

            await authController.handleLogin(mockRequest, mockResponse);

            expect(UserModel.updateOne as jest.Mock).toHaveBeenCalledWith(
                {_id: mockUser._id},
                {refreshTokenHash: "hashed_token"},
            );

            expect(statusMock).toHaveBeenCalledWith(200);
        });
    });

    describe("handleLogout", () => {
        it("should clear hash and cookie", async () => {
            mockRequest = {
                user: {userId: "user123"},
            } as any as Request;

            await authController.handleLogout(mockRequest, mockResponse);

            expect(UserModel.updateOne as jest.Mock).toHaveBeenCalledWith(
                {_id: "user123"},
                {refreshTokenHash: null},
            );

            expect((mockResponse as any).clearCookie).toHaveBeenCalledWith(
                "refreshToken",
            );
        });
    });
});
