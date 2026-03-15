import {JwtPayload} from "jsonwebtoken";
import {RoomRole} from "../models/rooms/Room";

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
