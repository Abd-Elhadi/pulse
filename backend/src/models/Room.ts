import mongoose, {Document, Schema, Model} from "mongoose";

export type RoomRole = "admin" | "editor" | "viewer";

export interface IRoomMember {
    userId: string;
    displayName: string;
    avatarUrl: string;
    role: RoomRole;
    joinedAt: Date;
}

export interface IRoom extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description: string;
    tags: string[];
    coverImageUrl: string;
    isPrivate: boolean;
    ownerId: string;
    members: IRoomMember[];
    pinnedResourceIds: string[];
    createdAt: Date;
    updatedAt: Date;
}

const roomMemberSchema = new Schema<IRoomMember>(
    {
        userId: {type: String, required: true},
        displayName: {type: String, required: true},
        avatarUrl: {type: String, default: ""},
        role: {
            type: String,
            enum: ["admin", "editor", "viewer"],
            required: true,
        },
        joinedAt: {type: Date, default: Date.now},
    },
    {_id: false},
);

const roomSchema = new Schema<IRoom>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 80,
        },
        description: {
            type: String,
            default: "",
            maxlength: 500,
        },
        tags: {
            type: [String],
            default: [],
            validate: {
                validator: (tags: string[]) => tags.length <= 10,
                message: "A room can have at most 10 tags",
            },
        },
        coverImageUrl: {
            type: String,
            default: "",
        },
        isPrivate: {
            type: Boolean,
            default: false,
        },
        ownerId: {
            type: String,
            required: true,
        },
        members: {
            type: [roomMemberSchema],
            default: [],
        },
        pinnedResourceIds: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    },
);

roomSchema.index({ownerId: 1});
roomSchema.index({"members.userId": 1});
roomSchema.index({isPrivate: 1});
roomSchema.index({tags: 1});
roomSchema.index({name: "text", description: "text"});

export const RoomModel: Model<IRoom> = mongoose.model<IRoom>(
    "Room",
    roomSchema,
);
