import { aiQueue } from "../queues/ai";

export async function getJob(jobId: string) {
  if (!jobId || jobId.length > 200) return null;
  const job = await aiQueue.getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  return {
    jobId: job.id,
    userId: job.data.userId as string,
    state,
    result: job.returnvalue ?? null,
    failedReason: state === "failed" ? job.failedReason : undefined,
  };
}
