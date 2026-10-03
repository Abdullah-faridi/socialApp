import { prisma } from "../config/db";
import bcrypt from "bcrypt";
import { Prisma, Role } from "@prisma/client";
import { SafeUser } from "../types/user";
import { PatchUser } from "../types/patch";

export const safeUserSelect = {
  id: true,
  fullName: true,
  username: true,
  profileImageURL: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const authenticatedUserSelect = {
  ...safeUserSelect,
  email: true,
  role: true,
  isBanned: true,
} satisfies Prisma.UserSelect;

const privateSafeUserSelect = {
  ...authenticatedUserSelect,
} satisfies Prisma.UserSelect;

export const publicProfileSelect = {
  ...safeUserSelect,

  count: {
    select: {
      followers: true,
      following: true,
      posts: true,
    },
  },
} as const;
export type UserWithPassword = SafeUser & { password: string };

export const UserModel = {
  async create(data: {
    fullName: string;
    username: string;
    email: string;
    password: string;
  }): Promise<SafeUser> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { ...data, password: hashedPassword },
      select: authenticatedUserSelect,
    });
    return user;
  },

  async login(email: string, password: string): Promise<UserWithPassword> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("User not found");
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");
    return user;
  },

  async findAll(): Promise<SafeUser[]> {
    return prisma.user.findMany({
      select: authenticatedUserSelect,
    });
  },

  async findByIdPublic(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: safeUserSelect,
    });
  },
  async findAvatarKey(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileImageKey: true },
    });
    return user?.profileImageKey ?? null;
  },

  async update(userId: string, data: PatchUser) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return prisma.user.update({
      where: { id: userId },
      data: { ...data, ...(data.email ? { email: data.email.trim().toLowerCase() } : {}) },
      select: privateSafeUserSelect,
    });
  },

  async followUser(followerId: string, followingId: string) {
    return prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });
  },

  async unfollowUser(followerId: string, followingId: string) {
    return prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  },

  async getFollowing(userId: string) {
    return prisma.follow.findMany({
      where: {
        followerId: userId,
      },
      include: {
        following: {
          select: safeUserSelect,
        },
      },
    });
  },

  async getFollowers(userId: string) {
    return prisma.follow.findMany({
      where: {
        followingId: userId,
      },
      include: {
        follower: {
          select: safeUserSelect,
        },
      },
    });
  },

  async existingFollow(followerId: string, followingId: string) {
    return prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  },
  async userFollows(userId: string) {
    return prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
  },
  async ban(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
      },
      select: authenticatedUserSelect,
    });
  },
  async unBan(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: false,
      },
      select: authenticatedUserSelect,
    });
  },
  async updateRole(userId: string, newRole: Role) {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role: newRole,
      },
      select: authenticatedUserSelect,
    });
  },
  async updateAvatar(userId: string, url: string, key: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        profileImageURL: url,
        profileImageKey: key,
      },
      select: safeUserSelect,
    });
  },
};
