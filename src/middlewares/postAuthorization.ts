import {Request , Response , NextFunction} from "express"
import { PostModel } from "../models/post";

export function canModifyPost(allowAdmin =false){
    return async(req : Request ,res : Response, next : NextFunction)=>{
        const targetId = req.params.id;
        const post = await PostModel.findById(targetId);
        if (!post) {
            res.status(404).json({
            error: "Post not found",
            });
            return;
        }
        const isAuthor = post.authorId === req.user!.id;
        const isAdmin =
            req.user?.role === "ADMIN" ||
            req.user?.role === "MODERATOR";

        if(!isAuthor && !(isAdmin && allowAdmin)){
            res.status(403).json({
                error : "forbidden"
            });
            return;
        }
        next();
    }
}

export async function postExists(req: Request,res: Response,next: NextFunction) {
    const post = await PostModel.findById(req.params.id);
    if (!post) {
        res.status(404).json({
        error: "Post not found",
        });
        return;
    }
    req.post = post; 
    next();
}
