import { prisma } from "../config/db";
import { updatePost } from "../types/patch";
import { CreatePostInput } from "../types/postCreate";
export const PostModel = {
  async findAll(cursor ? : string , limit : number=20) {
    const posts = await prisma.post.findMany({
      take : limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip : cursor ? 1  : 0,
      include: {
        author: {
          select: { id: true, fullName: true, profileImageURL: true }
        },
        _count: {
          select: { likes: true, comments: true }
        }
      }
    }) 
    const hasMore = posts.length > limit;
    if(hasMore) posts.pop();
    return {
      posts, 
      hasMore,
      nextCursor : hasMore ? posts[posts.length - 1].id : null
    }
  },

  async create(authorId: string, data: CreatePostInput) {
  return prisma.post.create({
    data: {
      ...data,
      authorId, 
      }
    })
  },
  async update(postId : string, data:updatePost){
    return prisma.post.update({where : {id : postId} , data});
  },
  async findById(postId : string){
     return prisma.post.findUnique({where : {id : postId}});
  },
  async delete(postId :string){
    return prisma.post.delete({where : {id : postId}});
  },
};
