import mongoose, {Schema, Document, Types} from "mongoose";

export interface IMessage extends Document {
    roomId: Types.ObjectId;
    userId: Types.ObjectId;
    userName: string;
    userAvatar?: string;
    content: string;
    createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
    roomId: {type: Schema.Types.ObjectId, required: true},
    userId: {type: Schema.Types.ObjectId, required: true},
    userName: {type: String, required: true},
    userAvatar: {type: String},
    content: {type: String, required: true},
    createdAt: {type: Date, default: Date.now},
});

export const MessageModel = mongoose.model<IMessage>("Message", MessageSchema);
