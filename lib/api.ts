import type { JobResponse, ProgressResponse, QualityOption, ScaleOption } from "@/types/api";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "");

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === "object" && payload && "error" in payload
      ? String((payload as { error?: { message?: string } }).error?.message || "Request failed")
      : typeof payload === "string" && payload
        ? payload
        : "Request failed";
    throw new Error(message);
  }

  return payload as T;
}

export async function createJob(file: File, scale: ScaleOption, quality: QualityOption): Promise<JobResponse> {
  const formData = new FormData();
  formData.append("video", file);
  formData.append("scale", scale);
  formData.append("quality", quality);

  const response = await fetch(`${API_BASE_URL}/api/v1/jobs`, {
    method: "POST",
    body: formData,
  });

  return parseResponse<JobResponse>(response);
}

export async function getJob(jobId: string): Promise<JobResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${encodeURIComponent(jobId)}`, {
    cache: "no-store",
  });
  return parseResponse<JobResponse>(response);
}

export async function getJobProgress(jobId: string): Promise<ProgressResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${encodeURIComponent(jobId)}/progress`, {
    cache: "no-store",
  });
  return parseResponse<ProgressResponse>(response);
}

export function getDownloadUrl(jobId: string): string {
  return `${API_BASE_URL}/api/v1/jobs/${encodeURIComponent(jobId)}/download`;
}
