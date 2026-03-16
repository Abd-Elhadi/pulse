import {Router, Request, Response} from "express";
import {authenticate} from "../middlewares/auth";
import {getMessageHistory} from "../controllers/messageController";

const router = Router({mergeParams: true});

router.use(authenticate);

// GET /api/rooms/:roomId/messages?page=1&limit=50
router.get("/", async (req: Request, res: Response) => {
    const roomId = req.params["roomId"] as string;
    const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
    const limit = Math.min(100, parseInt(req.query["limit"] as string) || 50);

    if (!roomId) {
        res.status(400).json({message: "Room ID is required"});
        return;
    }

    try {
        const result = await getMessageHistory(
            roomId,
            req.user!.userId,
            page,
            limit,
        );
        res.status(200).json(result);
    } catch (err) {
        const error = err as Error;
        if (error.message === "ROOM_NOT_FOUND") {
            res.status(404).json({message: "Room not found"});
            return;
        }
        if (error.message === "ROOM_PRIVATE") {
            res.status(403).json({message: "Access denied"});
            return;
        }
        console.error("getMessageHistory error:", error);
        res.status(500).json({message: "Internal server error"});
    }
});

export default router;
