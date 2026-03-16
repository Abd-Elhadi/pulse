import {RoomModel, IRoom, IRoomMember} from "../models/rooms/Room";
import {UserModel} from "../models/users/User";
import {
    CreateRoomBody,
    UpdateRoomBody,
    RoomResponse,
    PaginatedRoomsResponse,
} from "../types/rooms.types";
import {MongoServerError} from "mongodb";

const toRoomResponse = (room: IRoom, currentUserId?: string): RoomResponse => {
    const member = room.members.find((m) => m.userId === currentUserId);
    const isOwner = room.ownerId === currentUserId;

    let currentUserRole: RoomResponse["currentUserRole"] = null;
    if (isOwner || member?.role === "admin") currentUserRole = "admin";
    else if (member) currentUserRole = member.role;
    else if (!room.isPrivate) currentUserRole = "viewer";

    return {
        _id: room._id.toString(),
        name: room.name,
        description: room.description,
        tags: room.tags,
        coverImageUrl: room.coverImageUrl,
        isPrivate: room.isPrivate,
        ownerId: room.ownerId,
        members: room.members.map((m) => ({
            userId: m.userId,
            displayName: m.displayName,
            avatarUrl: m.avatarUrl,
            role: m.role,
            joinedAt: m.joinedAt,
        })),
        pinnedResourceIds: room.pinnedResourceIds,
        memberCount: room.members.length,
        currentUserRole,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
    };
};

export const createRoom = async (
    body: CreateRoomBody,
    userId: string,
): Promise<RoomResponse> => {
    try {
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error("USER_NOT_FOUND");
        }

        const room = await RoomModel.create({
            name: body.name,
            description: body.description ?? "",
            tags: body.tags ?? [],
            isPrivate: body.isPrivate ?? false,
            ownerId: userId,
            members: [
                {
                    userId,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl,
                    role: "admin",
                    joinedAt: new Date(),
                } satisfies IRoomMember,
            ],
        });

        return toRoomResponse(room, userId);
    } catch (e) {
        if (e instanceof MongoServerError && e.code === 11000) {
            throw new Error("ROOM_NAME_ALREADY_EXISTS");
        }
        throw new Error("INTERNAL_SERVER_ERROR");
    }
};

export const updateRoom = async (
    roomId: string,
    body: UpdateRoomBody,
    userId: string,
): Promise<RoomResponse> => {
    const room = await RoomModel.findById(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    if (room.ownerId !== userId) throw new Error("FORBIDDEN");

    if (body.name !== undefined) room.name = body.name;
    if (body.description !== undefined) room.description = body.description;
    if (body.tags !== undefined) room.tags = body.tags;
    if (body.isPrivate !== undefined) room.isPrivate = body.isPrivate;

    await room.save();
    return toRoomResponse(room, userId);
};

export const getRoomById = async (
    roomId: string,
    userId: string,
): Promise<RoomResponse> => {
    const room = await RoomModel.findById(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const isMember = room.members.some((m) => m.userId === userId);
    if (room.isPrivate && room.ownerId !== userId && !isMember) {
        throw new Error("ROOM_PRIVATE");
    }

    return toRoomResponse(room, userId);
};

export const deleteRoom = async (
    roomId: string,
    userId: string,
): Promise<void> => {
    const room = await RoomModel.findById(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.ownerId !== userId) throw new Error("FORBIDDEN");

    await RoomModel.findByIdAndDelete(roomId);
};

export const getRooms = async (
    userId: string,
    page: number,
    limit: number,
): Promise<PaginatedRoomsResponse> => {
    const skip = (page - 1) * limit;

    // Show public rooms + rooms the user is a member of
    const filter = {
        $or: [{isPrivate: false}, {"members.userId": userId}],
    };

    const [result] = await RoomModel.aggregate([
        {$match: filter},
        {$sort: {createdAt: -1}},
        {
            $facet: {
                data: [{$skip: (page - 1) * limit}, {$limit: limit}],
                total: [{$count: "count"}],
            },
        },
    ]);

    const rooms = result.data || [];
    const total = result.total[0]?.count || 0;

    return {
        rooms: rooms.map((r: IRoom) => toRoomResponse(r, userId)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
};

export const getMyRooms = async (userId: string): Promise<RoomResponse[]> => {
    const rooms = await RoomModel.find({
        $or: [{ownerId: userId}, {"members.userId": userId}],
    }).sort({updatedAt: -1});

    return rooms.map((r) => toRoomResponse(r, userId));
};

export const joinRoom = async (
    roomId: string,
    userId: string,
): Promise<RoomResponse> => {
    const room = await RoomModel.findById(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.isPrivate) throw new Error("ROOM_PRIVATE");

    const alreadyMember = room.members.some((m) => m.userId === userId);
    if (alreadyMember) throw new Error("ALREADY_MEMBER");

    const user = await UserModel.findById(userId).lean();
    if (!user) throw new Error("USER_NOT_FOUND");

    room.members.push({
        userId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: "viewer",
        joinedAt: new Date(),
    });

    await room.save();
    return toRoomResponse(room, userId);
};

export const leaveRoom = async (
    roomId: string,
    userId: string,
): Promise<void> => {
    const room = await RoomModel.findById(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.ownerId === userId) throw new Error("OWNER_CANNOT_LEAVE");

    const memberIndex = room.members.findIndex((m) => m.userId === userId);
    if (memberIndex === -1) throw new Error("NOT_A_MEMBER");

    room.members.splice(memberIndex, 1);
    await room.save();
};

export const inviteMember = async (
    roomId: string,
    targetUserId: string,
    role: IRoomMember["role"],
    requesterId: string,
): Promise<RoomResponse> => {
    const room = await RoomModel.findById(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    // Only room admin or owner can invite
    const requester = room.members.find((m) => m.userId === requesterId);
    const isOwner = room.ownerId === requesterId;
    if (!isOwner && requester?.role !== "admin") throw new Error("FORBIDDEN");

    const alreadyMember = room.members.some((m) => m.userId === targetUserId);
    if (alreadyMember) throw new Error("ALREADY_MEMBER");

    const user = await UserModel.findById(targetUserId).lean();
    if (!user) throw new Error("USER_NOT_FOUND");

    room.members.push({
        userId: targetUserId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role,
        joinedAt: new Date(),
    });

    await room.save();
    return toRoomResponse(room, requesterId);
};

export const updateMemberRole = async (
    roomId: string,
    targetUserId: string,
    newRole: IRoomMember["role"],
    requesterId: string,
): Promise<RoomResponse> => {
    const room = await RoomModel.findById(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const isOwner = room.ownerId === requesterId;
    const requester = room.members.find((m) => m.userId === requesterId);
    if (!isOwner && requester?.role !== "admin") throw new Error("FORBIDDEN");
    if (targetUserId === room.ownerId)
        throw new Error("CANNOT_CHANGE_OWNER_ROLE");

    const member = room.members.find((m) => m.userId === targetUserId);
    if (!member) throw new Error("NOT_A_MEMBER");

    member.role = newRole;
    await room.save();
    return toRoomResponse(room, requesterId);
};

export const removeMember = async (
    roomId: string,
    targetUserId: string,
    requesterId: string,
): Promise<RoomResponse> => {
    const room = await RoomModel.findById(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const isOwner = room.ownerId === requesterId;
    const requester = room.members.find((m) => m.userId === requesterId);
    if (!isOwner && requester?.role !== "admin") throw new Error("FORBIDDEN");
    if (targetUserId === room.ownerId) throw new Error("CANNOT_REMOVE_OWNER");

    const memberIndex = room.members.findIndex(
        (m) => m.userId === targetUserId,
    );
    if (memberIndex === -1) throw new Error("NOT_A_MEMBER");

    room.members.splice(memberIndex, 1);
    await room.save();
    return toRoomResponse(room, requesterId);
};
