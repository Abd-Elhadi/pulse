import mongoose, {Schema, Document, Types} from "mongoose";

export type MaterialStatus = "UPLOADING" | "PROCESSING" | "READY" | "FAILED";

export interface IMaterial extends Document {
    roomId: Types.ObjectId;
    uploaderId: Types.ObjectId;
    uploaderName: string;
    title: string;
    fileUrl: string;
    status: MaterialStatus;
    createdAt: Date;
}

const MaterialSchema = new Schema<IMaterial>({
    roomId: {type: Schema.Types.ObjectId, required: true},
    uploaderId: {type: Schema.Types.ObjectId, required: true},
    uploaderName: {type: String, required: true},
    title: {type: String, required: true},
    fileUrl: {type: String, required: true},
    status: {
        type: String,
        enum: ["UPLOADING", "PROCESSING", "READY", "FAILED"],
        default: "UPLOADING",
    },
    createdAt: {type: Date, default: Date.now},
});

export const MaterialModel = mongoose.model<IMaterial>(
    "Material",
    MaterialSchema,
);
