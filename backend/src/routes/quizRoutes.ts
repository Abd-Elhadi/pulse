import {Router, Request, Response} from "express";
import {authenticate} from "../middlewares/auth";
import {
    getRoomQuizzes,
    getAiJobStatus,
    submitQuizAttempt,
    getQuizForResource,
} from "../controllers/quizController";
import {SubmitAttemptBody} from "../types/quiz";
import {auditLog} from "../middlewares/audit";

const router = Router({mergeParams: true});
router.use(authenticate);

// GET /api/rooms/:id/quizzes — list all quizzes in a room
router.get("/", async (req: Request, res: Response) => {
    try {
        const quizzes = await getRoomQuizzes(
            req.params["roomId"] as string,
            req.user!.userId as string,
        );
        res.status(200).json(quizzes);
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
        res.status(500).json({message: "Internal server error"});
    }
});

// GET /api/rooms/:id/quizzes/job/:jobId — poll AI job status
router.get("/job/:jobId", async (req: Request, res: Response) => {
    try {
        const result = await getAiJobStatus(
            req.params["jobId"] as string,
            req.user!.userId,
        );
        res.status(200).json(result);
    } catch (err) {
        const error = err as Error;
        if (error.message === "JOB_NOT_FOUND") {
            res.status(404).json({message: "Job not found"});
            return;
        }
        if (error.message === "FORBIDDEN") {
            res.status(403).json({message: "Access denied"});
            return;
        }
        res.status(500).json({message: "Internal server error"});
    }
});

// GET /api/rooms/:id/quizzes/resource/:resourceId — get quiz for a resource
router.get("/resource/:resourceId", async (req: Request, res: Response) => {
    try {
        const quiz = await getQuizForResource(
            req.params["resourceId"] as string,
            req.user!.userId,
        );
        if (!quiz) {
            res.status(404).json({message: "No quiz found for this resource"});
            return;
        }
        res.status(200).json(quiz);
    } catch (err) {
        const error = err as Error;
        if (error.message === "FORBIDDEN") {
            res.status(403).json({message: "Access denied"});
            return;
        }
        res.status(500).json({message: "Internal server error"});
    }
});

// POST /api/rooms/:id/quizzes/:quizId/attempt — submit answers
router.post(
    "/:quizId/attempt",
    auditLog({
        action: "create",
        entity: "quiz",
        getEntityId: (req) => req.params["quizId"] as string,
        getMetadata: () => ({action: "quiz_attempted"}),
    }),
    async (
        req: Request<{quizId: string}, object, SubmitAttemptBody>,
        res: Response,
    ) => {
        const {answers} = req.body;
        if (!answers || !Array.isArray(answers)) {
            res.status(400).json({message: "answers array is required"});
            return;
        }
        try {
            const result = await submitQuizAttempt(
                req.params["quizId"],
                req.body,
                req.user!.userId,
            );
            res.status(200).json(result);
        } catch (err) {
            const error = err as Error;
            if (error.message === "QUIZ_NOT_FOUND") {
                res.status(404).json({message: "Quiz not found"});
                return;
            }
            if (error.message === "ANSWER_COUNT_MISMATCH") {
                res.status(400).json({
                    message:
                        "Number of answers does not match number of questions",
                });
                return;
            }
            if (error.message === "FORBIDDEN") {
                res.status(403).json({message: "Access denied"});
                return;
            }
            res.status(500).json({message: "Internal server error"});
        }
    },
);

export default router;
