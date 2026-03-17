import {Router, Request, Response} from "express";
import {authenticate} from "../middlewares/auth";
import {resolveRoomRole, requireRoomRole} from "../middlewares/room";
import {auditLog} from "../middlewares/audit";
import {
    getPresignedUploadUrl,
    confirmUpload,
    getRoomResources,
    deleteResource,
} from "../controllers/resourceController";
import {ConfirmUploadBody} from "../types/resource";

const router = Router({mergeParams: true});
router.use(authenticate);

router.get("/", resolveRoomRole, async (req: Request, res: Response) => {
    try {
        const resources = await getRoomResources(
            req.params["roomId"] as string,
            req.user!.userId,
        );
        res.status(200).json(resources);
    } catch (e) {
        const error = e as Error;
        if (error.message === "ROOM_NOT_FOUND") {
            res.status(404).json({message: "Room not found."});
        }
        if (error.message === "FORBIDDEN") {
            res.status(403).json({message: "Access denied"});
            return;
        }
        res.status(500).json({message: "Internal server error."});
    }
});

router.post(
    "/presign",
    resolveRoomRole,
    requireRoomRole("admin"),
    async (req: Request, res: Response) => {
        const {mimeType, fileName} = req.body as {
            mimeType: string;
            fileName: string;
        };

        if (!mimeType || !fileName) {
            res.status(400).json({
                message: "mimeType and fileName are required",
            });
            return;
        }

        const allowedMimeTypes = ["application/pdf", "image/jpeg"];

        if (!allowedMimeTypes.includes(mimeType)) {
            res.status(400).json({
                message: "File type not allowed. Supported: PDF, JPEG",
            });
            return;
        }

        try {
            const result = await getPresignedUploadUrl(
                req.params["roomId"] as string,
                req.user!.userId,
                mimeType,
                fileName,
            );
            res.status(200).json(result);
        } catch (err) {
            const error = err as Error;
            if (error.message === "ROOM_NOT_FOUND") {
                res.status(404).json({message: "Room not found"});
                return;
            }
            if (error.message === "FORBIDDEN") {
                res.status(403).json({message: "Access denied"});
                return;
            }
            console.error("getPresignedUploadUrl error:", error);
            res.status(500).json({message: "Internal server error"});
        }
    },
);

router.post(
    "/confirm",
    resolveRoomRole,
    requireRoomRole("admin"),
    auditLog({
        action: "create",
        entity: "resource",
        getMetadata: (req) => ({
            fileName: (req.body as ConfirmUploadBody).fileName,
        }),
    }),
    async (
        req: Request<{roomId: string}, object, ConfirmUploadBody>,
        res: Response,
    ) => {
        const {s3Key, fileName, mimeType, sizeBytes, fileType, generateQuiz} =
            req.body;
        if (!s3Key || !fileName || !mimeType || !sizeBytes || !fileType) {
            res.status(400).json({
                message:
                    "s3Key, fileName, mimeType, sizeBytes, and fileType are required",
            });
            return;
        }

        try {
            const resource = await confirmUpload(
                req.params["roomId"] as string,
                req.user!.userId,
                {s3Key, fileName, mimeType, sizeBytes, fileType, generateQuiz},
            );
            res.status(201).json(resource);
        } catch (e) {
            const error = e as Error;
            if (error.message === "ROOM_NOT_FOUND") {
                res.status(404).json({message: "Room not found"});
                return;
            }
            if (error.message === "FORBIDDEN") {
                res.status(403).json({message: "Access denied"});
                return;
            }
            console.error("confirmUpload error:", error);
            res.status(500).json({message: "Internal server error"});
        }
    },
);

router.delete(
    "/:resourceId",
    resolveRoomRole,
    requireRoomRole("admin"),
    auditLog({
        action: "delete",
        entity: "resource",
        getEntityId: (req) => req.params["resourceId"] as string,
    }),
    async (req: Request, res: Response) => {
        try {
            await deleteResource(
                req.params["resourceId"]! as string,
                req.user!.userId as string,
            );
            res.status(200).json({message: "Resource deleted"});
        } catch (err) {
            const error = err as Error;
            if (error.message === "RESOURCE_NOT_FOUND") {
                res.status(404).json({message: "Resource not found"});
                return;
            }
            if (error.message === "FORBIDDEN") {
                res.status(403).json({message: "Access denied"});
                return;
            }
            console.error("deleteResource error:", error);
            res.status(500).json({message: "Internal server error"});
        }
    },
);

export default router;
