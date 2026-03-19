import {env} from "./config/env";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRouter from "./routes/authRoutes";
import roomsRouter from "./routes/roomRoutes";
import messageRouter from "./routes/messageRoutes";
import resourcesRouter from "./routes/resourceRoutes";
import quizzesRouter from "./routes/quizRoutes";
import auditRouter from "./routes/auditRoutes";

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(cors({origin: env.FRONTEND_URL, credentials: true}));

app.use("/api/auth", authRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/rooms/:roomId/messages", messageRouter);
app.use("/api/rooms/:roomId/resources", resourcesRouter);
app.use("/api/rooms/:roomId/quizzes", quizzesRouter);
app.use("/api/audit", auditRouter);

app.use((_req, res) => {
    res.status(404).json({message: "Route not found"});
});

app.use(
    (
        err: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
    ) => {
        console.error("Unhandled error:", err.message);
        res.status(500).json({message: err.message});
    },
);

export default app;
