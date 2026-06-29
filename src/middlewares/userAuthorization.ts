import { Role } from "@prisma/client";
import {Request , Response , NextFunction} from "express"
export function authorize(roles : string[]){
    return (req : Request , res:Response , next:NextFunction) => {
        if(!req.user){
            res.status(401).json({error : "Unauthorized"});
            return;
        }
        if(!roles.includes(req.user.role)){
            res.status(404).json({error : "page not found"})
            return;
        }
        next();
    }
}

export function canEditUser(req : Request , res:Response , next:NextFunction){
    if(!req.user){
        res.status(401).json({error : "Unauthorized"});
            return;
    }
    const targetId = req.params.id;
    const isOwner = targetId === req.user.id;
    const isAdmin = req.user.role === Role.ADMIN;
    if (!isAdmin && !isOwner) {
        res.status(403).json({
        error: "Forbidden",
        });
        return;
    }
    next()
}
