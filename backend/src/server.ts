import http from "http";
import dotenv from "dotenv";
import app from "./app";
import {connectDatabase} from "./config/database";
import {setupSocket} from "./websocket/socket";

dotenv.config();

const PORT = Number(process.env.PORT ?? 5000);

const server = http.createServer(app);

setupSocket(server);

const startServer = async (): Promise<void> => {
    try {
        await connectDatabase();

        server.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
};

startServer();
