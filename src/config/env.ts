export function validateEnvironment() {
  const required = [
    "DATABASE_URL",
    "REDIS_URL",
    "JWT_SECRET",
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_KEY",
    "GEMINI_API_KEY",
  ];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL?.trim())
    missing.push("CLIENT_URL");
  if (missing.length)
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  if ((process.env.JWT_SECRET?.length ?? 0) < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }
  if (
    process.env.COOKIE_SAME_SITE === "none" &&
    process.env.NODE_ENV === "production" &&
    !process.env.CLIENT_URL
  ) {
    throw new Error(
      "CLIENT_URL is required when cross-site cookies are enabled",
    );
  }
  const origins = (
    process.env.CLIENT_URL ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173")
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(
        "CLIENT_URL must contain valid origins separated by commas",
      );
    }
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error(
        "CLIENT_URL entries must be HTTP or HTTPS origins without paths",
      );
    }
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      throw new Error("Production CLIENT_URL origins must use HTTPS");
    }
  }
}
