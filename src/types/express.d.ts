import type { SafeUser } from "./user";

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
      sessionId?: string;
    }
  }
}

export {};