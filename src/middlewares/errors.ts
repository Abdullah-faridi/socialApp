import { ErrorRequestHandler, Request, Response, NextFunction } from "express";

export function validateRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.body !== undefined && (req.body === null || typeof req.body !== "object" || Array.isArray(req.body))) {
    res.status(400).json({ error: "Request body must be an object" });
    return;
  }
  if (req.body === undefined) req.body = {};
  next();
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) return;
  if (error?.name === "MulterError") {
    res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      error: error.code === "LIMIT_FILE_SIZE" ? "Uploaded file is too large" : "Invalid upload",
    });
    return;
  }
  const status = Number(error?.statusCode ?? error?.status);
  if (status >= 400 && status < 500) {
    res.status(status).json({ error: error.message || "Invalid request" });
    return;
  }
  console.error("Unhandled request error:", error);
  res.status(500).json({ error: "Internal server error" });
};
