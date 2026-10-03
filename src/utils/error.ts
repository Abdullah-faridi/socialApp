export function getErrorMessage(err: unknown): string {
  console.error("Request failed:", err);
  return "Internal server error";
}
