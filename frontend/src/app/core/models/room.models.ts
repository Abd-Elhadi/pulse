export type RoomRole = 'admin' | 'editor' | 'viewer';

export interface RoomMember {
  userId: string;
  displayName: string;
  avatarUrl: string;
  role: RoomRole;
  joinedAt: Date;
}

export interface Room {
  _id: string;
  name: string;
  description: string;
  tags: string[];
  coverImageUrl: string;
  isPrivate: boolean;
  ownerId: string;
  members: RoomMember[];
  pinnedResourceIds: string[];
  memberCount: number;
  currentUserRole: RoomRole | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedRoomsResponse {
  rooms: Room[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateRoomPayload {
  name: string;
  description?: string;
  tags?: string[];
  isPrivate?: boolean;
}

export interface UpdateRoomPayload {
  name?: string;
  description?: string;
  tags?: string[];
  isPrivate?: boolean;
}

export interface InviteMemberPayload {
  userId: string;
  role: RoomRole;
}
