import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routes/authRoutes";

const app = express();
const PORT = Number(process.env["PORT"] ?? 5000);

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

app.use("/api/auth", authRouter);

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
        console.error("Unhandled error:", err);
        res.status(500).json({message: "Internal server error"});
    },
);

export default app;
