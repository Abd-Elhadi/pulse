import mongoose, {Document, Schema, Model} from "mongoose";

export type AuditAction = "create" | "update" | "delete";
export type AuditEntity =
    | "user"
    | "room"
    | "message"
    | "resource"
    | "quiz"
    | "quiz_attempt"
    | "ai_job";

export interface IAuditLog extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    action: AuditAction;
    entity: AuditEntity;
    entityId: mongoose.Types.ObjectId;
    metadata: Record<string, unknown>;
    timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        action: {
            type: String,
            enum: ["create", "update", "delete"],
            required: true,
        },
        entity: {
            type: String,
            enum: [
                "user",
                "room",
                "message",
                "resource",
                "quiz",
                "quiz_attempt",
                "ai_job",
            ],
            required: true,
        },
        entityId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: false,
        versionKey: false,
    },
);

auditLogSchema.index({userId: 1, timestamp: -1});
auditLogSchema.index({entity: 1, entityId: 1});
auditLogSchema.index({timestamp: -1});

export const AuditLogModel: Model<IAuditLog> = mongoose.model<IAuditLog>(
    "AuditLog",
    auditLogSchema,
);
