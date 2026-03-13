import mongoose, {Schema, Document, Types} from "mongoose";

export type Role = "admin" | "editor" | "viewer";

interface IRoomMember {
    userId: Types.ObjectId;
    name: string;
    avatarUrl?: string;
    role: Role;
    joinedAt: Date;
}

export interface IRoom extends Document {
    name: string;
    description?: string;
    ownerId: Types.ObjectId;
    members: IRoomMember[];
    createdAt: Date;
}

const RoomMemberSchema = new Schema<IRoomMember>({
    userId: {type: Schema.Types.ObjectId, required: true},
    name: {type: String, required: true},
    avatarUrl: {type: String},
    role: {
        type: String,
        enum: ["admin", "editor", "viewer"],
        default: "viewer",
    },
    joinedAt: {type: Date, default: Date.now},
});

const RoomSchema = new Schema<IRoom>({
    name: {type: String, required: true},
    description: {type: String},
    ownerId: {type: Schema.Types.ObjectId, required: true},
    members: [RoomMemberSchema],
    createdAt: {type: Date, default: Date.now},
});

export const RoomModel = mongoose.model<IRoom>("Room", RoomSchema);
