import { prisma } from "../config/db";
import { ToggleRelation } from "../helper/toggle";

export const LikeModel = {
    async add(postId : string , userId : string){
        const result = await ToggleRelation(prisma.like , 
            {
                userId_postId :{
                    userId,
                    postId
                }
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
    async getLikeCount(postId: string) {
        return prisma.like.count({
            where: {
            postId,
            },
    });
}

}