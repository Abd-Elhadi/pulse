import mongoose, {Document, Schema, Model} from "mongoose";

export type AiJobType = "quiz";
export type AiJobStatus = "pending" | "processing" | "completed" | "failed";

export interface IAiJob extends Document {
    _id: mongoose.Types.ObjectId;
    jobType: AiJobType;
    status: AiJobStatus;
    resourceId: string;
    roomId: string;
    requestedBy: string;
    tokensUsed: number | null;
    errorMessage: string | null;
    createdAt: Date;
    completedAt: Date | null;
}

const aiJobSchema = new Schema<IAiJob>(
    {
        jobType: {type: String, enum: ["quiz"], required: true},
        status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending",
        },
        resourceId: {type: String, required: true},
        roomId: {type: String, required: true},
        requestedBy: {type: String, required: true},
        tokensUsed: {type: Number, default: null},
        errorMessage: {type: String, default: null},
        completedAt: {type: Date, default: null},
    },
    {timestamps: true},
);

aiJobSchema.index({resourceId: 1});
aiJobSchema.index({status: 1});

export const AiJobModel: Model<IAiJob> = mongoose.model<IAiJob>(
    "AiJob",
    aiJobSchema,
);
