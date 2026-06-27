import { prisma } from "../config/db";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { SafeUser } from "../types/user";
import { PatchUser } from "../types/patch";

export const safeUserSelect = {
  id: true,
  fullName: true,
  email: true,
  profileImageURL: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserWithPassword = SafeUser & { password: string };

export const UserModel = {
  async create(data: {fullName: string; email: string;password: string;}): Promise<SafeUser> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { ...data, password: hashedPassword },
      select: safeUserSelect
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
      select:safeUserSelect,
    });
  },
  async findByIdPublic(userId : string){
     return prisma.user.findUnique({where:{id:userId} , select : safeUserSelect});
  },
  async update(userId: string ,data: PatchUser){
     return prisma.user.update({where:{id:userId},data,select:safeUserSelect})
  }
};
