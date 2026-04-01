import {Request, Response, NextFunction} from "express";

export const requireRole = (role: "admin" | "user") => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({message: "Authentication required"});
            return;
        }
        if (req.user.role !== role) {
            res.status(403).json({message: "Insufficient permissions"});
            return;
        }
        next();
    };
};
