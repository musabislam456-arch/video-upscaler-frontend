"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { createJob, getDownloadUrl, getJob, getJobProgress } from "@/lib/api";
import type { JobResponse, QualityOption, ScaleOption } from "@/types/api";

const MAX_FILE_SIZE_MB = 500;
const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm", ".avi"];
const SCALE_OPTIONS: { value: ScaleOption; label: string; hint: string }[] = [
  { value: "2x", label: "2x", hint: "Double dimensions" },
  { value: "4x", label: "4x", hint: "Four times dimensions" },
  { value: "1080p", label: "1080p", hint: "Full HD target" },
  { value: "1440p", label: "1440p", hint: "Quad HD target" },
  { value: "4K", label: "4K", hint: "Ultra HD target" },
];
const QUALITY_OPTIONS: { value: QualityOption; label: string; hint: string }[] = [
  { value: "fast", label: "Fast", hint: "Shortest processing time" },
  { value: "balanced", label: "Balanced", hint: "Speed and quality" },
  { value: "quality", label: "Quality", hint: "Higher detail" },
  { value: "max", label: "Max", hint: "Highest available quality" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): string | null {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return `Unsupported video format. Use ${ACCEPTED_EXTENSIONS.join(", ")}.`;
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
  }
  return null;
}

function StatusIcon({ state }: { state: JobResponse["state"] | "idle" }) {
  if (state === "completed") return <span className="status-icon status-icon--success">✓</span>;
  if (state === "failed") return <span className="status-icon status-icon--error">!</span>;
  if (state === "processing") return <span className="status-icon status-icon--spin">↻</span>;
  return <span className="status-icon">•</span>;
}

export default function UpscalerApp() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [scale, setScale] = useState<ScaleOption>("2x");
  const [quality, setQuality] = useState<QualityOption>("balanced");
  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);

  const canStart = Boolean(file) && !busy;

  useEffect(() => {
    if (!job || ["completed", "failed"].includes(job.state)) return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const [progress, currentJob] = await Promise.all([
          getJobProgress(job.jobId),
          getJob(job.jobId),
        ]);
        if (stopped) return;
        setJob((prev) => prev ? { ...prev, ...currentJob, progress: progress.progress, status: progress.status } : currentJob);

        if (!["completed", "failed"].includes(progress.state)) {
          timer = setTimeout(poll, 1500);
        } else {
          setBusy(false);
        }
      } catch (pollError) {
        if (stopped) return;
        setError(pollError instanceof Error ? pollError.message : "Unable to read job progress.");
        setBusy(false);
      }
    };

    timer = setTimeout(poll, 400);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [job?.jobId, job?.state]);

  const selectedScale = useMemo(() => SCALE_OPTIONS.find((item) => item.value === scale), [scale]);
  const selectedQuality = useMemo(() => QUALITY_OPTIONS.find((item) => item.value === quality), [quality]);

  const acceptFile = (candidate: File) => {
    setError(null);
    const validationError = validateFile(candidate);
    if (validationError) {
      setError(validationError);
      return;
    }
    setJob(null);
    setFile(candidate);
  };

  const onFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) acceptFile(selected);
    event.target.value = "";
  };

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) acceptFile(dropped);
  };

  const startUpscale = async () => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const created = await createJob(file, scale, quality);
      setJob(created);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to start the job.");
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setJob(null);
    setError(null);
    setBusy(false);
  };

  const progress = job?.progress ?? 0;
  const state = job?.state ?? "idle";

  return (
    <main className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">2×</div>
            <div>
              <div className="brand-name">Video Upscaler</div>
              <div className="brand-subtitle">CPU-only processing</div>
            </div>
          </div>
          <div className="runtime-pill"><span className="runtime-dot" /> Ready for upload</div>
        </header>

        <section className="hero-copy">
          <p className="eyebrow">LOCAL-FIRST VIDEO WORKFLOW</p>
          <h1>Upscale your video without a GPU.</h1>
          <p className="hero-text">Upload a video, choose a target and quality preset, then follow the processing job from queue to downloadable output.</p>
        </section>

        <section className="workspace">
          <div className="card upload-card">
            <div className="card-heading">
              <div>
                <p className="step">01</p>
                <h2>Source video</h2>
              </div>
              {file && <button className="ghost-button" onClick={reset} type="button">Clear</button>}
            </div>

            <input ref={inputRef} className="sr-only" type="file" accept={ACCEPTED_EXTENSIONS.join(",")} onChange={onFileInput} />

            <div
              className={`dropzone ${dragActive ? "dropzone--active" : ""} ${file ? "dropzone--filled" : ""}`}
              onDragEnter={onDragEnter}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              {file ? (
                <>
                  <div className="file-icon">VID</div>
                  <div className="file-meta">
                    <strong title={file.name}>{file.name}</strong>
                    <span>{formatBytes(file.size)}</span>
                  </div>
                  <button className="secondary-button" onClick={() => inputRef.current?.click()} type="button">Replace</button>
                </>
              ) : (
                <>
                  <div className="upload-icon">↑</div>
                  <div>
                    <strong>Drop your video here</strong>
                    <p>or click to browse files</p>
                  </div>
                  <button className="secondary-button" onClick={() => inputRef.current?.click()} type="button">Choose video</button>
                  <span className="format-note">MP4, MOV, MKV, WEBM, AVI · max {MAX_FILE_SIZE_MB} MB</span>
                </>
              )}
            </div>
          </div>

          <div className="card options-card">
            <div className="card-heading">
              <div>
                <p className="step">02</p>
                <h2>Output</h2>
              </div>
            </div>

            <div className="option-group">
              <div className="option-label-row"><span>Scale</span><span>{selectedScale?.hint}</span></div>
              <div className="option-grid option-grid--5">
                {SCALE_OPTIONS.map((option) => (
                  <button key={option.value} type="button" className={`option-button ${scale === option.value ? "option-button--selected" : ""}`} onClick={() => setScale(option.value)}>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="option-group">
              <div className="option-label-row"><span>Quality</span><span>{selectedQuality?.hint}</span></div>
              <div className="option-grid option-grid--4">
                {QUALITY_OPTIONS.map((option) => (
                  <button key={option.value} type="button" className={`option-button ${quality === option.value ? "option-button--selected" : ""}`} onClick={() => setQuality(option.value)}>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button className="primary-button" disabled={!canStart} onClick={startUpscale} type="button">
              {busy ? "Processing…" : "Start upscaling"}
            </button>
          </div>
        </section>

        <section className="card status-card">
          <div className="card-heading">
            <div>
              <p className="step">03</p>
              <h2>Processing</h2>
            </div>
            <div className={`status-chip status-chip--${state}`}><StatusIcon state={state} /> {state === "idle" ? "Waiting" : state}</div>
          </div>

          {job ? (
            <div className="status-content">
              <div className="job-line">
                <div><span className="muted">Job ID</span><code>{job.jobId}</code></div>
                <div className="status-text">{job.status}</div>
              </div>
              <div className="progress-track" aria-label={`Processing progress ${progress}%`}><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <div className="progress-meta"><span>{progress}%</span><span>{job.state === "queued" ? "Waiting for worker" : job.state === "completed" ? "Output ready" : "CPU worker active"}</span></div>

              {job.state === "completed" && job.links.download && (
                <a className="download-button" href={getDownloadUrl(job.jobId)} download>
                  <span>↓</span> Download output
                </a>
              )}
              {job.state === "failed" && job.error && (
                <div className="error-box"><strong>{job.error.code}</strong><span>{job.error.message}</span></div>
              )}
            </div>
          ) : (
            <div className="empty-status"><StatusIcon state="idle" /><div><strong>Your job status will appear here.</strong><p>Start an upload to receive a unique job ID and live progress.</p></div></div>
          )}
        </section>

        {error && <div className="global-error" role="alert"><strong>Request error</strong><span>{error}</span></div>}

        <footer className="footer">
          <span>No GPU required by the web app.</span>
          <span>Frontend and processing API are independently deployable.</span>
        </footer>
      </div>
    </main>
  );
}
