import type { SafeUser } from "./user";
import { Post } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
      sessionId?: string;
    }
  }
}
declare global {
  namespace Express {
    interface Request {
      post?: Post;
    }
  }
}

export {};