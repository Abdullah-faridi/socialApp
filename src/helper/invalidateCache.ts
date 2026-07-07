import redisClient from "../config/redis";

export async function invalidateUserFeedsCache(userId:string) {
    await redisClient.del(`feed:foryou:${userId}`);
}
export async function invalidateFollowingCache(userId:string) {
    await redisClient.del(`user:following:${userId}`)
    await redisClient.del(`feed:foryou:${userId}`) 
}
export async function invalidateLikeCache(userId: string) {
  await redisClient.del(`user:likedAuthors:${userId}`)
  await redisClient.del(`feed:foryou:${userId}`)
}