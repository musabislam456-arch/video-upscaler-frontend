export type ScaleOption = "2x" | "4x" | "1080p" | "1440p" | "4K";
export type QualityOption = "fast" | "balanced" | "quality" | "max";

export type JobState = "queued" | "processing" | "completed" | "failed";

export interface JobResponse {
  jobId: string;
  state: JobState;
  progress: number;
  status: string;
  scale: ScaleOption;
  quality: QualityOption;
  originalFileName: string;
  outputFileName: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  error: { code: string; message: string } | null;
  links: {
    status: string;
    progress: string;
    download: string | null;
  };
}

export interface ProgressResponse {
  jobId: string;
  state: JobState;
  progress: number;
  status: string;
  updatedAt: string;
  error: { code: string; message: string } | null;
}
