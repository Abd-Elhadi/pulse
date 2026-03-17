import {Request, Response, NextFunction} from "express";
import mongoose from "mongoose";
import {RoomModel, RoomRole} from "../models/Room";

export const rbac =
    (roles: ("admin" | "editor" | "viewer")[]) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const roomId = req.params.roomId;
        const userId = req.userId;

        if (!roomId || !userId)
            return res.status(400).json({message: "Invalid request"});

        const room = await RoomModel.findById(roomId);
        if (!room) return res.status(404).json({message: "Room not found"});

        const member = room.members.find((m) => m.userId.toString() === userId);
        if (!member)
            return res
                .status(403)
                .json({message: "You are not a member of this room"});

        if (!roles.includes(member.role))
            return res
                .status(403)
                .json({message: "Forbidden: insufficient permissions"});

        next();
    };

export const resolveRoomRole = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    const {roomId} = req.params;

    if (!roomId || !mongoose.Types.ObjectId.isValid(roomId as string)) {
        res.status(400).json({message: "Invalid room ID"});
        return;
    }

    if (!req.user) {
        res.status(401).json({message: "Authentication required."});
        return;
    }

    try {
        const room = await RoomModel.findById(roomId);

        if (!room) {
            res.status(404).json({message: "Room not found"});
            return;
        }

        if (req.user.role === "admin") {
            req.roomRole = "admin";
            next();
            return;
        }

        // Platform admins have full access everywhere
        if (room.ownerId === req.userId) {
            req.roomRole = "admin";
            next();
            return;
        }

        const memeber = room.members.find((m) => m.userId === req.userId!);

        if (memeber) {
            req.roomRole = memeber.role;
            next();
            return;
        }

        res.status(403).json({message: "This room is private."});
    } catch (e) {
        console.error(`resolveRoomRole error: ${e}`);
        res.status(500).json({message: "Internal server error."});
    }
};

/**
 * Requires the user to have at least the specified role in the room.
 * Role hierarchy: admin > editor > viewer
 * Must be used AFTER resolveRoomRole.
 */
export const requireRoomRole = (...roles: RoomRole[]) => {
    const roleHierarchy: Record<RoomRole, number> = {
        viewer: 1,
        editor: 2,
        admin: 3,
    };

    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.roomRole) {
            res.status(403).json({message: "Room access not resolved."});
            return;
        }

        const userLevel = roleHierarchy[req.roomRole];
        const requiredLevel = Math.min(...roles.map((r) => roleHierarchy[r]));
        if (userLevel >= requiredLevel) {
            next();
            return;
        }

        res.status(403).json({
            message: `Room access denied. Required role(s): ${roles.join(", ")}`,
        });
    };
};
