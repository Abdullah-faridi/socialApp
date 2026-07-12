import jwt from "jsonwebtoken";
const secret = process.env.JWT_SECRET as string;
import { JwtPayload } from "../types/auth";
export function createTokenForUser(userId: string, sessionId: string): string {
  return jwt.sign({ userId, sessionId }, secret, { expiresIn: "30d" });
}

export function validateToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, secret);
  return decoded as JwtPayload;
}
