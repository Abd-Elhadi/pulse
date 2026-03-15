import {Router, Request, Response} from "express";
import {authenticate} from "../middlewares/auth";
import {resolveRoomRole, requireRoomRole} from "../middlewares/room";
import {auditLog} from "../middlewares/audit";
import {
    createRoom,
    deleteRoom,
    getMyRooms,
    getRoomById,
    getRooms,
    inviteMember,
    joinRoom,
    leaveRoom,
    removeMember,
    updateMemberRole,
    updateRoom,
} from "../controllers/roomController";
import {
    InviteMemberBody,
    UpdateMemberRoleBody,
    UpdateRoomBody,
} from "../types/rooms.type";

const router = Router();

router.use(authenticate);

// GET /api/rooms - list public rooms + user's rooms (paginated)
router.get("/", async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
        const limit = Math.min(
            50,
            parseInt(req.query["limit"] as string) || 12,
        );

        const result = await getRooms(req.user!.userId, page, limit);
        res.status(200).json(result);
    } catch (err) {
        console.error("getRooms error:", err);
        res.status(500).json({message: "Internal server error"});
    }
});

// GET /api/rooms/mine - rooms the user owns or is a member of
router.get("/mine", async (req: Request, res: Response) => {
    try {
        const rooms = await getMyRooms(req.user!.userId);
        res.status(200).json(rooms);
    } catch (err) {
        console.error("getMyRooms error:", err);
        res.status(500).json({message: "Internal server error"});
    }
});

router.post(
    "/",
    auditLog({action: "create", entity: "room"}),
    async (req: Request, res: Response) => {
        const {name, description, tags, isPrivate} = req.body;

        if (!name || name.trim().length < 3) {
            res.status(400).json({
                message: "Room name must be at leat 3 characters",
            });
            return;
        }

        try {
            if (!req.user) {
                res.status(403).json({message: "Authentication required."});
                return;
            }
            const room = await createRoom(
                {name, description, tags, isPrivate},
                req.user.userId,
            );
            res.status(201).json(room);
        } catch (e) {
            const error = e as Error;
            if (error.message === "USER_NOT_FOUND") {
                res.status(404).json({message: "User not found"});
                return;
            }

            if (error.message === "ROOM_NAME_ALREADY_EXISTS") {
                res.status(404).json({message: "Room name taken"});
                return;
            }

            console.log(`createRoom error: ${error}`);
            res.status(500).json({message: "Internal server error."});
        }
    },
);

router.get("/:roomId", resolveRoomRole, async (req: Request, res: Response) => {
    try {
        const room = await getRoomById(
            req.params["roomId"] as string,
            req.user!.userId,
        );
        res.status(200).json(room);
    } catch (err) {
        const error = err as Error;
        if (error.message === "ROOM_NOT_FOUND") {
            res.status(404).json({message: "Room not found"});
            return;
        }
        if (error.message === "ROOM_PRIVATE") {
            res.status(403).json({message: "This room is private"});
            return;
        }
        console.error("getRoomById error:", error);
        res.status(500).json({message: "Internal server error"});
    }
});

router.patch(
    "/:roomId",
    resolveRoomRole,
    requireRoomRole("admin"),
    auditLog({
        action: "update",
        entity: "room",
        getEntityId: (req) => req.params["roomId"] as string,
        getMetadata: (req) => ({fields: Object.keys(req.body as object)}),
    }),
    async (
        req: Request<{roomId: string}, object, UpdateRoomBody>,
        res: Response,
    ) => {
        try {
            const room = await updateRoom(
                req.params["roomId"],
                req.body,
                req.user!.userId,
            );
            res.status(200).json(room);
        } catch (err) {
            const error = err as Error;
            if (error.message === "ROOM_NOT_FOUND") {
                res.status(404).json({message: "Room not found"});
                return;
            }
            if (error.message === "FORBIDDEN") {
                res.status(403).json({
                    message: "Only the room owner can update this room",
                });
                return;
            }
            console.error("updateRoom error:", error);
            res.status(500).json({message: "Internal server error"});
        }
    },
);

router.delete(
    "/:roomId",
    resolveRoomRole,
    requireRoomRole("admin"),
    auditLog({
        action: "delete",
        entity: "room",
        getEntityId: (req) => req.params["roomId"] as string,
    }),
    async (req: Request, res: Response) => {
        try {
            await deleteRoom(req.params["roomId"]! as string, req.user!.userId);
            res.status(200).json({message: "Room deleted successfully"});
        } catch (err) {
            const error = err as Error;
            if (error.message === "ROOM_NOT_FOUND") {
                res.status(404).json({message: "Room not found"});
                return;
            }
            if (error.message === "FORBIDDEN") {
                res.status(403).json({
                    message: "Only the room owner can delete this room",
                });
                return;
            }
            console.error("deleteRoom error:", error);
            res.status(500).json({message: "Internal server error"});
        }
    },
);

router.post(
    "/:roomId/join",
    auditLog({
        action: "create",
        entity: "room",
        getEntityId: (req) => req.params["roomId"] as string,
        getMetadata: () => ({action: "member_joined"}),
    }),
    async (req: Request, res: Response) => {
        try {
            const room = await joinRoom(
                req.params["roomId"]! as string,
                req.user!.userId,
            );
            res.status(200).json(room);
        } catch (err) {
            const error = err as Error;
            if (error.message === "ROOM_NOT_FOUND") {
                res.status(404).json({message: "Room not found"});
                return;
            }
            if (error.message === "ROOM_PRIVATE") {
                res.status(403).json({
                    message: "Cannot join a private room without an invite",
                });
                return;
            }
            if (error.message === "ALREADY_MEMBER") {
                res.status(409).json({
                    message: "You are already a member of this room",
                });
                return;
            }
            console.error("joinRoom error:", error);
            res.status(500).json({message: "Internal server error"});
        }
    },
);

router.post(
    "/:roomId/leave",
    auditLog({
        action: "delete",
        entity: "room",
        getEntityId: (req) => req.params["roomId"] as string,
        getMetadata: () => ({action: "member_left"}),
    }),
    async (req: Request, res: Response) => {
        try {
            await leaveRoom(req.params["roomId"]! as string, req.user!.userId);
            res.status(200).json({message: "You have left the room"});
        } catch (err) {
            const error = err as Error;
            if (error.message === "ROOM_NOT_FOUND") {
                res.status(404).json({message: "Room not found"});
                return;
            }
            if (error.message === "OWNER_CANNOT_LEAVE") {
                res.status(400).json({
                    message:
                        "Room owner cannot leave. Transfer ownership or delete the room.",
                });
                return;
            }
            if (error.message === "NOT_A_MEMBER") {
                res.status(400).json({
                    message: "You are not a member of this room",
                });
                return;
            }
            console.error("leaveRoom error:", error);
            res.status(500).json({message: "Internal server error"});
        }
    },
);

router.post(
    "/:roomId/members",
    resolveRoomRole,
    requireRoomRole("admin"),
    auditLog({
        action: "create",
        entity: "room",
        getEntityId: (req) => req.params["roomId"] as string,
        getMetadata: (req) => ({
            action: "member_invited",
            targetUserId: (req.body as InviteMemberBody).userId,
        }),
    }),
    async (
        req: Request<{roomId: string}, object, InviteMemberBody>,
        res: Response,
    ) => {
        const {userId: targetUserId, role} = req.body;

        if (!targetUserId || !role) {
            res.status(400).json({message: "userId and role are required"});
            return;
        }

        if (!["admin", "editor", "viewer"].includes(role)) {
            res.status(400).json({
                message: "role must be admin, editor or viewer",
            });
            return;
        }

        try {
            const room = await inviteMember(
                req.params["roomId"],
                targetUserId,
                role,
                req.user!.userId,
            );
            res.status(200).json(room);
        } catch (e) {
            const error = e as Error;
            if (error.message === "ROM_NOT_FOUND") {
                res.status(404).json({message: "Room not found"});
                return;
            }

            if (error.message == "USER_NOT_FOUND") {
                res.status(404).json({message: "User to invite not found"});
                return;
            }

            if (error.message === "ALREADY_MEMBER") {
                res.status(409).json({
                    message: "User is already a memeber of this room",
                });
                return;
            }

            if (error.message === "FORBIDDEN") {
                res.status(403).json({
                    message: "Only room admins can invite members",
                });
                return;
            }

            console.error(`inviteMemeber error ${error}`);
            res.status(500).json({message: "Internal server error."});
        }
    },
);

router.post(
    "/:roomId/members/:userId",
    resolveRoomRole,
    requireRoomRole("admin"),
    auditLog({
        action: "update",
        entity: "room",
        getEntityId: (req) => req.params["roomId"] as string,
        getMetadata: (req) => ({
            action: "member_role_update",
            targetUserId: req.params["userId"],
            newRole: (req.body as UpdateMemberRoleBody).role,
        }),
    }),
    async (
        req: Request<
            {roomId: string; userId: string},
            object,
            UpdateMemberRoleBody
        >,
        res: Response,
    ) => {
        const {role} = req.body;

        if (!role || !["admin", "editor", "viewer"].includes(role)) {
            res.status(400).json({
                message: "Valid role is required (admin, editor, viewer)",
            });
            return;
        }

        try {
            const room = await updateMemberRole(
                req.params["roomId"],
                req.params["userId"],
                role,
                req.user!.userId,
            );
            res.status(200).json(room);
        } catch (err) {
            const error = err as Error;
            if (error.message === "ROOM_NOT_FOUND") {
                res.status(404).json({message: "Room not found"});
                return;
            }
            if (error.message === "NOT_A_MEMBER") {
                res.status(404).json({
                    message: "User is not a member of this room",
                });
                return;
            }
            if (error.message === "CANNOT_CHANGE_OWNER_ROLE") {
                res.status(400).json({
                    message: "Cannot change the role of the room owner",
                });
                return;
            }
            if (error.message === "FORBIDDEN") {
                res.status(403).json({
                    message: "Only room admins can change member roles",
                });
                return;
            }
            console.error("updateMemberRole error:", error);
            res.status(500).json({message: "Internal server error"});
        }
    },
);

router.delete(
    "/:roomId/members/:userId",
    resolveRoomRole,
    requireRoomRole("admin"),
    auditLog({
        action: "delete",
        entity: "room",
        getEntityId: (req) => req.params["roomId"] as string,
        getMetadata: (req) => ({
            action: "member_removed",
            targetUserId: req.params["userId"],
        }),
    }),
    async (req: Request, res: Response) => {
        try {
            const room = await removeMember(
                req.params["roomId"] as string,
                req.params["userId"] as string,
                req.user!.userId,
            );
            res.status(200).json(room);
        } catch (err) {
            const error = err as Error;
            if (error.message === "ROOM_NOT_FOUND") {
                res.status(404).json({message: "Room not found"});
                return;
            }
            if (error.message === "NOT_A_MEMBER") {
                res.status(404).json({
                    message: "User is not a member of this room",
                });
                return;
            }
            if (error.message === "CANNOT_REMOVE_OWNER") {
                res.status(400).json({message: "Cannot remove the room owner"});
                return;
            }
            if (error.message === "FORBIDDEN") {
                res.status(403).json({
                    message: "Only room admins can remove members",
                });
                return;
            }
            console.error("removeMember error:", error);
            res.status(500).json({message: "Internal server error"});
        }
    },
);

export default router;
