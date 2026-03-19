import {AuditLogModel, AuditAction, AuditEntity} from "../models/Audit";

export interface AuditLogQuery {
    page: number;
    limit: number;
    action?: AuditAction;
    entity?: AuditEntity;
    userId?: string;
    from?: Date;
    to?: Date;
}

export interface AuditLogResponse {
    logs: {
        _id: string;
        performedBy: {
            userId: string;
            displayName: string;
            email: string;
        };
        action: AuditAction;
        entity: AuditEntity;
        entityId: string;
        metadata: Record<string, unknown>;
        timestamp: string;
    }[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const getAuditLogs = async (
    query: AuditLogQuery,
): Promise<AuditLogResponse> => {
    const {page, limit, action, entity, userId, from, to} = query;

    const filter: Record<string, unknown> = {};

    if (action) filter["action"] = action;
    if (entity) filter["entity"] = entity;
    if (userId) filter["performedBy.userId"] = userId;
    if (from || to) {
        filter["timestamp"] = {
            ...(from ? {$gte: from} : {}),
            ...(to ? {$lte: to} : {}),
        };
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
        AuditLogModel.find(filter)
            .sort({timestamp: -1})
            .skip(skip)
            .limit(limit)
            .lean(),
        AuditLogModel.countDocuments(filter),
    ]);

    return {
        logs: logs.map((log) => ({
            _id: log._id.toString(),
            performedBy: {
                userId: log.performedBy.userId.toString(),
                displayName: log.performedBy.displayName,
                email: log.performedBy.email,
            },
            action: log.action,
            entity: log.entity,
            entityId: log.entityId,
            metadata: log.metadata as Record<string, unknown>,
            timestamp: log.timestamp.toISOString(),
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
};
