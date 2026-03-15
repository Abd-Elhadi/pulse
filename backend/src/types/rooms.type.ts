import {RoomRole} from "../models/rooms/Room";

export interface CreateRoomBody {
    name: string;
    description?: string;
    tags?: string[];
    isPrivate?: boolean;
}

export interface UpdateRoomBody {
    name?: string;
    description?: string;
    tags?: string[];
    isPrivate?: boolean;
}

export interface InviteMemberBody {
    userId: string;
    role: RoomRole;
}

export interface UpdateMemberRoleBody {
    role: RoomRole;
}

export interface RoomMemberResponse {
    userId: string;
    displayName: string;
    avatarUrl: string;
    role: RoomRole;
    joinedAt: Date;
}

export interface RoomResponse {
    _id: string;
    name: string;
    description: string;
    tags: string[];
    coverImageUrl: string;
    isPrivate: boolean;
    ownerId: string;
    members: RoomMemberResponse[];
    pinnedResourceIds: string[];
    memberCount: number;
    currentUserRole: RoomRole | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaginatedRoomsResponse {
    rooms: RoomResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
