import mongoose, {Document, Schema, Model} from "mongoose";

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    passwordHash: string;
    displayName: string;
    avatarUrl: string;
    bio: string;
    refreshTokenHash: string | null;
    role: "admin" | "user";
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
        },
        passwordHash: {
            type: String,
            required: true,
        },
        displayName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 50,
        },
        avatarUrl: {
            type: String,
            default: "",
        },
        bio: {
            type: String,
            default: "",
            maxlength: 300,
        },
        refreshTokenHash: {
            type: String,
            default: null,
        },
        role: {
            type: String,
            enum: ["admin", "user"],
            default: "user",
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_doc, ret: Record<string, unknown>) => {
                delete ret["passwordHash"];
                delete ret["refreshTokenHash"];
                return ret;
            },
        },
    },
);

export const UserModel: Model<IUser> = mongoose.model<IUser>(
    "User",
    userSchema,
);
