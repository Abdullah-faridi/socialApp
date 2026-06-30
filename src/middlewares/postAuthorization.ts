import {Request , Response , NextFunction} from "express"
import { PostModel } from "../models/post";
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
