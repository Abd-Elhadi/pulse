import mongoose from "mongoose";
import {env} from "./env.js";

export const connectDatabase = async (): Promise<void> => {
    try {
        await mongoose.connect(env.DATABASE_URL, {
            family: 4,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log("MongoDB Connected via Mongoose");
        console.log("Connected to:", mongoose.connection.host);
    } catch (err) {
        console.error("MongoDB Connection Error: ", err);
        process.exit(1);
    }
};
