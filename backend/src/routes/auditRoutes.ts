import {Router, Request, Response} from "express";
import {authenticate} from "../middlewares/auth";
import {requireRole} from "../middlewares/requireRole";
import {getAuditLogs} from "../controllers/auditController";
import {AuditAction, AuditEntity} from "../models/Audit";

const router = Router();

router.use(authenticate);
router.use(requireRole("admin"));

// GET /api/audit?page=1&limit=20&action=create&entity=room&userId=xxx&from=2024-01-01&to=2024-12-31
router.get("/", async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
    const limit = Math.min(100, parseInt(req.query["limit"] as string) || 20);

    const validActions: AuditAction[] = ["create", "update", "delete"];
    const validEntities: AuditEntity[] = [
        "user",
        "room",
        "message",
        "resource",
        "quiz",
    ];

    const action = req.query["action"] as string | undefined;
    const entity = req.query["entity"] as string | undefined;

    if (action && !validActions.includes(action as AuditAction)) {
        res.status(400).json({
            message: `Invalid action. Must be one of: ${validActions.join(", ")}`,
        });
        return;
    }

    if (entity && !validEntities.includes(entity as AuditEntity)) {
        res.status(400).json({
            message: `Invalid entity. Must be one of: ${validEntities.join(", ")}`,
        });
        return;
    }

    const from = req.query["from"]
        ? new Date(req.query["from"] as string)
        : undefined;
    const to = req.query["to"]
        ? new Date(req.query["to"] as string)
        : undefined;

    if (from && isNaN(from.getTime())) {
        res.status(400).json({message: "Invalid 'from' date"});
        return;
    }
    if (to && isNaN(to.getTime())) {
        res.status(400).json({message: "Invalid 'to' date"});
        return;
    }

    try {
        const result = await getAuditLogs({
            page,
            limit,
            action: action as AuditAction | undefined,
            entity: entity as AuditEntity | undefined,
            userId: req.query["userId"] as string | undefined,
            from,
            to,
        });
        res.status(200).json(result);
    } catch (err) {
        console.error("getAuditLogs error:", err);
        res.status(500).json({message: "Internal server error"});
    }
});

export default router;
