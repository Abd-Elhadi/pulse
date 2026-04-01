import mongoose, {Document, Schema, Model} from "mongoose";

export interface IMessage extends Document {
    _id: mongoose.Types.ObjectId;
    roomId: string;
    senderId: string;
    senderDisplayName: string;
    senderAvatarUrl: string;
    content: string;
    attachmentUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
    {
        roomId: {type: String, required: true},
        senderId: {type: String, required: true},
        senderDisplayName: {type: String, required: true},
        senderAvatarUrl: {type: String, default: ""},
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        attachmentUrl: {type: String, default: null},
    },
    {timestamps: true},
);

messageSchema.index({roomId: 1, createdAt: -1});

export const MessageModel: Model<IMessage> = mongoose.model<IMessage>(
    "Message",
    messageSchema,
);
