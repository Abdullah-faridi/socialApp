import { prisma } from "../config/db";
import { createRoomInput } from "../types/roomCreate";

export const ChatRoomModel = {
  async create(createdBy: string, data: createRoomInput) {
    return prisma.chatRoom.create({
      data: {
        ...data,
        createdBy,
        members: {
          create: { userId: createdBy },
        },
      },
      include: {
        creator: {
          select: { id: true, fullName: true, profileImageURL: true },
        },
        _count: {
          select: { members: true },
        },
      },
    });
  },
  async getAllPublic() {
    return prisma.chatRoom.findMany({
      where: { type: "PUBLIC" },
      include: {
        creator: {
          select: { id: true, fullName: true, profileImageURL: true },
        },
        _count: {
          select: { members: true, messages: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },
  async findById(roomId: string) {
    return prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        creator: {
          select: { id: true, fullName: true, profileImageURL: true },
        },
        _count: {
          select: { members: true },
        },
      },
    });
  },
  async findBySlug(slug: string) {
    return prisma.chatRoom.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
  },
  async joinRoom(userId: string, roomId: string) {
    const existing = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: { userId, roomId },
      },
    });

    if (existing) return { alreadyMember: true };

    await prisma.roomMember.create({
      data: { userId, roomId },
    });

    return { alreadyMember: false };
  },
  async leaveRoom(userId: string, roomId: string) {
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { createdBy: true },
    });

    if (room?.createdBy === userId) {
      throw new Error("Room creator cannot leave. Delete the room instead.");
    }

    return prisma.roomMember.delete({
      where: {
        userId_roomId: { userId, roomId },
      },
    });
  },
  async isMember(userId: string, roomId: string) {
    const member = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: { userId, roomId },
      },
    });
    return !!member;
  },
  async getMembers(roomId: string) {
    return prisma.roomMember.findMany({
      where: { roomId },
      include: {
        user: {
          select: { id: true, fullName: true, profileImageURL: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  },
  async getUserRooms(userId: string) {
    return prisma.roomMember.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            _count: {
              select: { members: true, messages: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  },
  async deleteRoom(roomId: string) {
    return prisma.chatRoom.delete({
      where: { id: roomId },
    });
  },
};
