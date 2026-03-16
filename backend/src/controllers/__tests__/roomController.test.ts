import {jest, describe, it, expect, beforeEach} from "@jest/globals";
import {
    createRoom,
    getRoomById,
    updateRoom,
    deleteRoom,
    joinRoom,
    leaveRoom,
} from "../roomController";
import {RoomModel} from "../../models/rooms/Room";
import {UserModel} from "../../models/users/User";

jest.mock("../../models/rooms/Room");
jest.mock("../../models/users/User");

describe("RoomsService", () => {
    const mockUser = {
        _id: "user123",
        displayName: "Test User",
        avatarUrl: "",
    };

    const mockRoom = {
        _id: {toString: () => "room123"},
        name: "Test Room",
        description: "Test Desc",
        tags: ["tag1"],
        isPrivate: false,
        ownerId: "user123",
        members: [
            {
                userId: "user123",
                displayName: "Owner",
                role: "admin",
                joinedAt: new Date(),
            },
        ],
        save: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => jest.clearAllMocks());

    describe("createRoom", () => {
        it("should create a room", async () => {
            (UserModel.findById as jest.Mock).mockReturnValue(mockUser);
            (RoomModel.create as jest.Mock).mockResolvedValue(mockRoom);
            const result = await createRoom({name: "Test Room"}, "user123");
            expect(result._id).toBe("room123");
        });
    });

    describe("getRoomById", () => {
        it("should return room if public", async () => {
            (RoomModel.findById as jest.Mock).mockResolvedValue(mockRoom);
            const result = await getRoomById("room123", "user456");
            expect(result._id).toBe("room123");
        });

        it("should throw ROOM_PRIVATE if private and user not member", async () => {
            (RoomModel.findById as jest.Mock).mockResolvedValue({
                ...mockRoom,
                isPrivate: true,
                ownerId: "other",
                members: [],
            });
            await expect(getRoomById("room123", "user456")).rejects.toThrow(
                "ROOM_PRIVATE",
            );
        });
    });

    describe("updateRoom", () => {
        it("should update room if owner", async () => {
            (RoomModel.findById as jest.Mock).mockResolvedValue(mockRoom);
            const result = await updateRoom(
                "room123",
                {name: "New Name"},
                "user123",
            );
            expect(result.name).toBe("New Name");
            expect(mockRoom.save).toHaveBeenCalled();
        });

        it("should throw FORBIDDEN if not owner", async () => {
            (RoomModel.findById as jest.Mock).mockResolvedValue(mockRoom);
            await expect(
                updateRoom("room123", {name: "New"}, "hacker"),
            ).rejects.toThrow("FORBIDDEN");
        });
    });

    describe("joinRoom", () => {
        it("should add user to public room", async () => {
            const roomToJoin = {
                ...mockRoom,
                members: {
                    some: () => false,
                    push: jest.fn(),
                    find: () => null,
                    map: () => [],
                },
                save: jest.fn(),
            };
            (RoomModel.findById as jest.Mock).mockResolvedValue(roomToJoin);
            (UserModel.findById as jest.Mock).mockReturnValue({
                lean: () => Promise.resolve(mockUser),
            });
            await joinRoom("room123", "user456");
            expect(roomToJoin.save).toHaveBeenCalled();
        });
    });

    describe("leaveRoom", () => {
        it("should remove user from room", async () => {
            const roomToLeave = {
                ...mockRoom,
                ownerId: "owner",
                members: {findIndex: () => 0, splice: jest.fn()},
                save: jest.fn(),
            };
            (RoomModel.findById as jest.Mock).mockResolvedValue(roomToLeave);
            await leaveRoom("room123", "user123");
            expect(roomToLeave.save).toHaveBeenCalled();
        });

        it("should throw OWNER_CANNOT_LEAVE", async () => {
            (RoomModel.findById as jest.Mock).mockResolvedValue(mockRoom);
            await expect(leaveRoom("room123", "user123")).rejects.toThrow(
                "OWNER_CANNOT_LEAVE",
            );
        });
    });

    describe("deleteRoom", () => {
        it("should delete if owner", async () => {
            (RoomModel.findById as jest.Mock).mockResolvedValue(mockRoom);
            (RoomModel.findByIdAndDelete as jest.Mock).mockResolvedValue({});
            await deleteRoom("room123", "user123");
            expect(RoomModel.findByIdAndDelete).toHaveBeenCalledWith("room123");
        });
    });
});
