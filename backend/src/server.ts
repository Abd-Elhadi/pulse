import http from "http";
import dotenv from "dotenv";
import app from "./app";
import {connectDatabase} from "./config/database";
import {setupSocket} from "./websocket/socket";

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

setupSocket(server);

const startServer = async (): Promise<void> => {
    await connectDatabase();
    app.listen(PORT, () => {
        console.log(`app running on http://localhost:${PORT}`);
    });
};

startServer().catch((err: unknown) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
