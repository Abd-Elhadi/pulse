export type RoomRole = 'admin' | 'editor' | 'viewer';

export interface RoomMember {
  userId: string;
  displayName: string;
  role: RoomRole;
}

export interface Room {
  _id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  ownerId: string;
  members: RoomMember[];
  createdAt: string;
  memberCount: number;
  currentUserRole: RoomRole | null;
}
