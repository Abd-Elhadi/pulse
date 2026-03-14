import mongoose, {Document, Schema, Model} from "mongoose";

export type AuditAction = "create" | "update" | "delete";
export type AuditEntity = "user" | "room" | "message" | "resource" | "quiz";

export interface IAuditUser {
    userId: mongoose.Types.ObjectId;
    displayName: string;
    email: string;
}

export interface IAuditLog extends Document {
    _id: mongoose.Types.ObjectId;
    performedBy: IAuditUser;
    action: AuditAction;
    entity: AuditEntity;
    entityId: string;
    metadata: any;
    timestamp: Date;
}

const auditUserSchema = new Schema<IAuditUser>(
    {
        userId: {type: Schema.Types.ObjectId, required: true},
        displayName: {type: String, required: true},
        email: {type: String, required: true},
    },
    {_id: false},
);

const auditLogSchema = new Schema<IAuditLog>(
    {
        performedBy: {
            type: auditUserSchema,
            required: true,
        },
        action: {
            type: String,
            enum: ["create", "update", "delete"],
            required: true,
        },
        entity: {
            type: String,
            enum: ["user", "room", "message", "resource", "quiz"],
            required: true,
        },
        entityId: {
            type: String,
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

auditLogSchema.index({"performedBy.userId": 1, timestamp: -1});
auditLogSchema.index({entity: 1, entityId: 1});
auditLogSchema.index({timestamp: -1});

export const AuditLogModel: Model<IAuditLog> = mongoose.model<IAuditLog>(
    "AuditLog",
    auditLogSchema,
);
