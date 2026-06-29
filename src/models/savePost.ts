import { prisma } from "../config/db";
import { ToggleRelation } from "../helper/toggle";

export const savePostModel= {
    async add(postId : string, userId : string){
        const result = await ToggleRelation(prisma.savedPost , 
            {
                userId_postId: {
                    userId,
                    postId
                },
            },
            {
                userId,
                postId
            }
    );
    return {
        saved : result.active
    }
    },
    async saveCount(postId : string){
        return prisma.savedPost.count({where : {postId}});
    }
}