import { NotificationType } from "@prisma/client";

export interface CreateNotificationInput {
  userId: string;
  actorId: string;
  type: NotificationType;
  entityId?: string;
  entityType?: string;
}
