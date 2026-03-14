import {Request, Response, NextFunction} from "express";
import mongoose from "mongoose";
import {AuditLogModel, AuditAction, AuditEntity} from "../models/audit/Audit";
import {UserModel} from "../models/users/User";

export interface AuditOptions {
    action: AuditAction;
    entity: AuditEntity;
    getEntityId?: (req: Request, body: unknown) => string | undefined;
    getMetadata?: (req: Request) => Record<string, unknown>;
}

export const auditLog = (options: AuditOptions) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const originalJson = res.json.bind(res);

        res.json = (body: unknown): Response => {
            // Only log on successful mutating responses (2xx) with an authenticated user
            if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
                const entityId =
                    options.getEntityId?.(req, body) ??
                    (body as Record<string, unknown>)?.["_id"]?.toString() ??
                    (typeof req.params["id"] === "string"
                        ? req.params["id"]
                        : undefined);

                if (entityId) {
                    const metadata = options.getMetadata?.(req) ?? {};
                    const {userId, email} = req.user;

                    // Fetch user's displayName to embed in the log snapshot
                    UserModel.findById(new mongoose.Types.ObjectId(userId))
                        .select({displayName: 1, email: 1})
                        .lean()
                        .then((user) => {
                            return AuditLogModel.create({
                                performedBy: {
                                    userId: new mongoose.Types.ObjectId(userId),
                                    displayName: user?.displayName ?? "Unknown",
                                    email: user?.email ?? email,
                                },
                                action: options.action,
                                entity: options.entity,
                                entityId,
                                metadata,
                                timestamp: new Date(),
                            });
                        })
                        .catch((err: unknown) => {
                            console.error("Audit log error:", err);
                        });
                }
            }

            return originalJson(body);
        };

        next();
    };
};
