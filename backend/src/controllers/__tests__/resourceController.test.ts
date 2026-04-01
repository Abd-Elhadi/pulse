import {jest, describe, it, expect, beforeEach} from "@jest/globals";
import {
    getPresignedUploadUrl,
    confirmUpload,
    getRoomResources,
    deleteResource,
} from "../resourceController";
import {ResourceModel} from "../../models/Resource";
import {RoomModel} from "../../models/Room";
import {UserModel} from "../../models/User";
import {s3Client, sqsClient} from "../../config/aws";

jest.mock("../../models/Resource");
jest.mock("../../models/Room");
jest.mock("../../models/User");
jest.mock("../../models/AI.Job");
jest.mock("../../config/aws", () => ({
    s3Client: {send: jest.fn()},
    sqsClient: {send: jest.fn()},
    getS3Bucket: () => "my-pulse-app-bucket",
    getSqsQueueUrl: () =>
        "https://sqs.us-east-1.amazonaws.com/test/pulse-ai-jobs",
}));
jest.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: jest.fn().mockResolvedValue("https://presigned.url/test"),
}));

describe("resourceController", () => {
    const mockRoom = {
        _id: {toString: () => "room123"},
        ownerId: "user123",
        members: [{userId: "user123", role: "admin"}],
    };

    const mockUser = {
        _id: {toString: () => "user123"},
        displayName: "Test User",
    };

    const mockResource = {
        _id: {toString: () => "resource123"},
        roomId: "room123",
        uploadedBy: "user123",
        uploaderDisplayName: "Test User",
        fileName: "test.pdf",
        fileType: "pdf",
        mimeType: "application/pdf",
        sizeBytes: 1000,
        s3Key: "rooms/room123/resources/test.pdf",
        aiJobId: null,
        aiStatus: "completed",
        createdAt: new Date("2024-01-01"),
        save: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => jest.clearAllMocks());

    describe("getPresignedUploadUrl", () => {
        it("should throw INVALID_FILE_TYPE for unsupported mime", async () => {
            await expect(
                getPresignedUploadUrl(
                    "room123",
                    "user123",
                    "text/plain",
                    "file.txt",
                ),
            ).rejects.toThrow("INVALID_FILE_TYPE");
        });

        it("should throw ROOM_NOT_FOUND if room missing", async () => {
            (RoomModel.findById as jest.Mock).mockResolvedValue(null);
            await expect(
                getPresignedUploadUrl(
                    "room123",
                    "user123",
                    "application/pdf",
                    "file.pdf",
                ),
            ).rejects.toThrow("ROOM_NOT_FOUND");
        });

        it("should throw FORBIDDEN if not a member", async () => {
            (RoomModel.findById as jest.Mock).mockResolvedValue({
                ...mockRoom,
                ownerId: "other",
                members: [],
            });
            await expect(
                getPresignedUploadUrl(
                    "room123",
                    "stranger",
                    "application/pdf",
                    "file.pdf",
                ),
            ).rejects.toThrow("FORBIDDEN");
        });

        it("should return uploadUrl and s3Key for valid member", async () => {
            (RoomModel.findById as jest.Mock).mockResolvedValue(mockRoom);
            const result = await getPresignedUploadUrl(
                "room123",
                "user123",
                "application/pdf",
                "file.pdf",
            );
            expect(result.uploadUrl).toBe("https://presigned.url/test");
            expect(result.s3Key).toContain("rooms/room123/resources/");
        });
    });

    describe("getRoomResources", () => {
        it("should throw ROOM_NOT_FOUND if room missing", async () => {
            (RoomModel.findById as jest.Mock).mockResolvedValue(null);
            await expect(
                getRoomResources("room123", "user123"),
            ).rejects.toThrow("ROOM_NOT_FOUND");
        });

        it("should throw FORBIDDEN if not a member", async () => {
            (RoomModel.findById as jest.Mock).mockResolvedValue({
                ...mockRoom,
                ownerId: "other",
                members: [],
            });
            await expect(
                getRoomResources("room123", "stranger"),
            ).rejects.toThrow("FORBIDDEN");
        });

        it("should return resources for room member", async () => {
            (RoomModel.findById as jest.Mock).mockResolvedValue(mockRoom);
            (ResourceModel.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue([mockResource]),
            });
            const result = await getRoomResources("room123", "user123");
            expect(result).toHaveLength(1);
            expect(result[0]._id).toBe("resource123");
        });
    });

    describe("deleteResource", () => {
        it("should throw RESOURCE_NOT_FOUND if resource missing", async () => {
            (ResourceModel.findById as jest.Mock).mockResolvedValue(null);
            await expect(
                deleteResource("resource123", "user123"),
            ).rejects.toThrow("RESOURCE_NOT_FOUND");
        });

        it("should throw FORBIDDEN if not owner/uploader/admin", async () => {
            (ResourceModel.findById as jest.Mock).mockResolvedValue(
                mockResource,
            );
            (RoomModel.findById as jest.Mock).mockResolvedValue({
                ...mockRoom,
                ownerId: "other",
                members: [{userId: "stranger", role: "viewer"}],
            });
            await expect(
                deleteResource("resource123", "stranger"),
            ).rejects.toThrow("FORBIDDEN");
        });

        it("should delete resource and S3 object for uploader", async () => {
            (ResourceModel.findById as jest.Mock).mockResolvedValue(
                mockResource,
            );
            (RoomModel.findById as jest.Mock).mockResolvedValue(mockRoom);
            (s3Client.send as jest.Mock).mockResolvedValue({});
            (ResourceModel.findByIdAndDelete as jest.Mock).mockResolvedValue(
                {},
            );

            await deleteResource("resource123", "user123");

            expect(s3Client.send).toHaveBeenCalled();
            expect(ResourceModel.findByIdAndDelete).toHaveBeenCalledWith(
                "resource123",
            );
        });
    });
});
