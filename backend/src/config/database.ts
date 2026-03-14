import mongoose from "mongoose";
import {env} from "./env";

export const connectDatabase = async (): Promise<void> => {
    try {
        await mongoose.connect(env.DATABASE_URL, {dbName: "pulse"});
        console.log(`Database connected successfully.`);
    } catch (err) {
        console.log(`Databse connection error: ${err}`);
    }
};
