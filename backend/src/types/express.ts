import {JwtPayload} from "jsonwebtoken";
import {RoomRole} from "../models/Room";

declare global {
    namespace Express {
        interface Request {
            userId?: string;
            user?: JwtPayload;
            roomRole?: RoomRole;
        }
    }
}

export {};
