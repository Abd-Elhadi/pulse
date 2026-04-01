import mongoose, {Document, Schema, Model} from "mongoose";

export type ResourceFileType = "pdf" | "image";

export interface IResource extends Document {
    _id: mongoose.Types.ObjectId;
    roomId: string;
    uploadedBy: string;
    uploaderDisplayName: string;
    fileName: string;
    fileType: ResourceFileType;
    mimeType: string;
    sizeBytes: number;
    s3Key: string;
    aiJobId: string | null;
    aiStatus: "pending" | "processing" | "completed" | "failed";
    createdAt: Date;
    updatedAt: Date;
}

const resourceSchema = new Schema<IResource>(
    {
        roomId: {type: String, required: true},
        uploadedBy: {type: String, required: true},
        uploaderDisplayName: {type: String, required: true},
        fileName: {type: String, required: true, trim: true},
        fileType: {
            type: String,
            enum: ["pdf", "image"],
            required: true,
        },
        mimeType: {type: String, required: true},
        sizeBytes: {type: Number, required: true},
        s3Key: {type: String, required: true},
        aiJobId: {type: String, default: null},
        aiStatus: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending",
        },
    },
    {timestamps: true},
);

resourceSchema.index({roomId: 1, createdAt: -1});
resourceSchema.index({uploadedBy: 1});

export const ResourceModel: Model<IResource> = mongoose.model<IResource>(
    "Resource",
    resourceSchema,
);
