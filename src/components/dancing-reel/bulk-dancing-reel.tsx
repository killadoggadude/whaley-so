"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Loader2,
  Music,
  AlertCircle,
  CheckCircle2,
  Upload,
  Search,
  ImageIcon,
  Download,
  Save,
  X,
  Info,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getAssetsAction } from "@/app/dashboard/assets/actions";
import type { AiModelWithImages, AssetWithUrl } from "@/types";

interface BulkDancingReelProps {
  aiModels: AiModelWithImages[];
}

interface DancingJob {
  id: string;
  imageId: string | null;
  imageUrl: string | null;
  status: "pending" | "submitting" | "polling" | "completed" | "failed";
  error?: string;
  taskId?: string;
  videoUrl?: string;
  videoAssetId?: string;
  pollCount?: number;
}

const DEFAULT_PROMPT =
  "natural, energetic and realistic sexy dance moves, she is dancing sexy to a tiktok trend music and moving her hips and arms as if she is dancing to a trending song for a tiktok dance video, not talking, no slow motion";

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 200;

function StepSection({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
          {step}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">{title}</h3>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function BulkDancingReel({ aiModels }: BulkDancingReelProps) {
  // Shared settings
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [duration, setDuration] = useState<5 | 10>(5);

  // Jobs
  const [jobs, setJobs] = useState<DancingJob[]>([
    { id: crypto.randomUUID(), imageId: null, imageUrl: null, status: "pending" },
  ]);
  const [running, setRunning] = useState(false);
  const pollingRefs = useRef<Map<string, boolean>>(new Map());

  // Image picker dialog
  const [pickerJobId, setPickerJobId] = useState<string | null>(null);
  const [pickerImages, setPickerImages] = useState<AssetWithUrl[]>([]);
  const [pickerTotal, setPickerTotal] = useState(0);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOverJobId, setDragOverJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk image pool
  const [bulkImagePool, setBulkImagePool] = useState<Array<{ id: string; url: string }>>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkDragOver, setBulkDragOver] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      pollingRefs.current.forEach((_, key) => pollingRefs.current.set(key, false));
    };
  }, []);

  const addJob = () => {
    setJobs((prev) => [...prev, { id: crypto.randomUUID(), imageId: null, imageUrl: null, status: "pending" }]);
  };

  const removeJob = (id: string) => {
    if (jobs.length <= 1) return;
    pollingRefs.current.set(id, false);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const updateJob = (id: string, updates: Partial<DancingJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...updates } : j)));
  };

  // ---- Image Picker ----

  const fetchPickerImages = useCallback(async (append: boolean) => {
    setPickerLoading(true);
    const offset = append ? pickerImages.length : 0;
    const result = await getAssetsAction({
      file_type: "image",
      search: pickerSearch || undefined,
      sort_by: "created_at",
      sort_order: "desc",
      limit: 30,
      offset,
    });
    if (append) {
      setPickerImages((prev) => [...prev, ...result.assets]);
    } else {
      setPickerImages(result.assets);
    }
    setPickerTotal(result.total);
    setPickerLoading(false);
  }, [pickerSearch, pickerImages.length]);

  useEffect(() => {
    if (pickerJobId) {
      setPickerSearch("");
      fetchPickerImages(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerJobId]);

  const handlePickerSearch = (value: string) => {
    setPickerSearch(value);
    const t = setTimeout(() => fetchPickerImages(false), 300);
    return () => clearTimeout(t);
  };

  const handlePickerSelect = (image: AssetWithUrl) => {
    if (pickerJobId) {
      updateJob(pickerJobId, { imageId: image.id, imageUrl: image.signed_url });
      setPickerJobId(null);
    }
  };

  /**
   * Upload a single image directly to Supabase Storage from the browser.
   */
  const handleImageUpload = async (file: File, targetJobId?: string) => {
    if (!file || !file.type.startsWith("image/")) return null;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File exceeds 50MB size limit");
      return null;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return null;
      }

      const uuid = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${user.id}/image/${uuid}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        return null;
      }

      const { data: asset, error: dbError } = await supabase
        .from("assets")
        .insert({
          user_id: user.id,
          filename: file.name,
          file_path: filePath,
          file_type: "image",
          mime_type: file.type,
          file_size: file.size,
          tags: ["dancing-reel", "portrait"],
          metadata: {},
        })
        .select("id")
        .single();

      if (dbError) {
        await supabase.storage.from("assets").remove([filePath]);
        toast.error(`Database error: ${dbError.message}`);
        return null;
      }

      const { data: urlData } = await supabase.storage
        .from("assets")
        .createSignedUrl(filePath, 3600);

      const uploaded = { id: asset.id, url: urlData?.signedUrl || "" };
      const jobIdToUpdate = targetJobId || pickerJobId;
      if (jobIdToUpdate) {
        updateJob(jobIdToUpdate, { imageId: uploaded.id, imageUrl: uploaded.url });
        if (!targetJobId) setPickerJobId(null);
      }

      return uploaded;
    } catch {
      toast.error("Failed to upload image");
      return null;
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePickerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleImageUpload(file);
  };

  const handleDragOver = (e: React.DragEvent, jobId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!running) setDragOverJobId(jobId);
  };

  const handleDragLeave = () => {
    setDragOverJobId(null);
  };

  const handleDrop = async (e: React.DragEvent, jobId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverJobId(null);
    if (running) return;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported");
      return;
    }

    await handleImageUpload(file, jobId);
  };

  // ---- Bulk Image Pool ----

  const uploadBulkImages = async (files: File[] | FileList) => {
    setBulkUploading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setBulkUploading(false);
      return;
    }

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds 50MB limit`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      setBulkUploading(false);
      return;
    }

    const CONCURRENCY = 3;
    const uploadedImages: Array<{ id: string; url: string }> = [];
    let failedCount = 0;

    for (let i = 0; i < validFiles.length; i += CONCURRENCY) {
      const batch = validFiles.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          try {
            const uuid = crypto.randomUUID();
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const filePath = `${user.id}/image/${uuid}_${safeName}`;

            const { error: uploadError } = await supabase.storage
              .from("assets")
              .upload(filePath, file, { contentType: file.type, upsert: false });

            if (uploadError) return null;

            const { data: asset, error: dbError } = await supabase
              .from("assets")
              .insert({
                user_id: user.id,
                filename: file.name,
                file_path: filePath,
                file_type: "image",
                mime_type: file.type,
                file_size: file.size,
                tags: ["dancing-reel", "portrait"],
                metadata: {},
              })
              .select("id")
              .single();

            if (dbError) {
              await supabase.storage.from("assets").remove([filePath]);
              return null;
            }

            const { data: urlData } = await supabase.storage
              .from("assets")
              .createSignedUrl(filePath, 3600);

            if (!urlData?.signedUrl) return null;
            return { id: asset.id, url: urlData.signedUrl };
          } catch {
            return null;
          }
        })
      );

      for (const result of batchResults) {
        if (result) {
          uploadedImages.push(result);
        } else {
          failedCount++;
        }
      }
    }

    if (uploadedImages.length > 0) {
      setBulkImagePool((prev) => [...prev, ...uploadedImages]);
      toast.success(`${uploadedImages.length} image${uploadedImages.length === 1 ? "" : "s"} uploaded to pool`);
      if (failedCount > 0) {
        toast.error(`${failedCount} image${failedCount === 1 ? "" : "s"} failed to upload`);
      }
    } else {
      toast.error("Failed to upload images");
    }

    setBulkUploading(false);
  };

  const handleBulkFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadBulkImages(files);
    }
    if (bulkFileInputRef.current) bulkFileInputRef.current.value = "";
  };

  const handleBulkDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!running) setBulkDragOver(true);
  };

  const handleBulkDragLeave = () => {
    setBulkDragOver(false);
  };

  const handleBulkDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBulkDragOver(false);
    if (running) return;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Only image files are supported");
      return;
    }

    await uploadBulkImages(imageFiles);
  };

  const removeBulkImage = (id: string) => {
    setBulkImagePool((prev) => prev.filter((img) => img.id !== id));
  };

  const clearBulkPool = () => {
    setBulkImagePool([]);
  };

  const assignPoolImages = () => {
    const emptyJobs = jobs.filter((j) => j.status === "pending" && !j.imageId && !j.imageUrl);
    if (emptyJobs.length === 0 || bulkImagePool.length === 0) return { assignedCount: 0 };

    const available = [...bulkImagePool].sort(() => Math.random() - 0.5);
    const assignCount = Math.min(emptyJobs.length, available.length);

    const updatedJobs: Array<{ id: string; imageId: string; imageUrl: string }> = [];
    for (let i = 0; i < assignCount; i++) {
      updatedJobs.push({ id: emptyJobs[i].id, imageId: available[i].id, imageUrl: available[i].url });
    }
    setJobs((prev) =>
      prev.map((j) => {
        const update = updatedJobs.find((u) => u.id === j.id);
        return update ? { ...j, imageId: update.imageId, imageUrl: update.imageUrl } : j;
      })
    );

    return { assignedCount: assignCount };
  };

  // ---- Processing ----

  const pollJob = useCallback(async (jobId: string, taskId: string) => {
    pollingRefs.current.set(jobId, true);
    let attempts = 0;
    let consecutiveErrors = 0;

    while (pollingRefs.current.get(jobId) && attempts < MAX_POLL_ATTEMPTS) {
      attempts++;
      updateJob(jobId, { pollCount: attempts });

      try {
        const res = await fetch(`/api/talking-head/status?taskId=${encodeURIComponent(taskId)}`);
        const data = await res.json();

        if (data.status === "completed" && data.videoUrl) {
          pollingRefs.current.set(jobId, false);
          updateJob(jobId, { status: "completed", videoUrl: data.videoUrl });
          return;
        }

        if (data.status === "failed") {
          pollingRefs.current.set(jobId, false);
          updateJob(jobId, { status: "failed", error: data.error || "Video generation failed" });
          return;
        }

        consecutiveErrors = 0;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      } catch (err) {
        consecutiveErrors++;
        console.warn(`Poll error for dancing job ${jobId} (attempt ${attempts}):`, err);

        if (consecutiveErrors >= 3) {
          pollingRefs.current.set(jobId, false);
          updateJob(jobId, { status: "failed", error: "Network error after multiple retries" });
          return;
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    }

    if (pollingRefs.current.get(jobId)) {
      pollingRefs.current.set(jobId, false);
      updateJob(jobId, { status: "failed", error: `Timed out after ${attempts} polls (~${Math.round(attempts * POLL_INTERVAL_MS / 1000)}s)` });
    }
  }, []);

  const processJob = useCallback(
    async (job: DancingJob) => {
      updateJob(job.id, { status: "submitting" });
      try {
        const res = await fetch("/api/dancing-reel/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: job.imageUrl,
            prompt: prompt.trim(),
            duration,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          updateJob(job.id, { status: "failed", error: data.error || "Submit failed" });
          return;
        }

        updateJob(job.id, { status: "polling", taskId: data.taskId, pollCount: 0 });
        pollJob(job.id, data.taskId);
      } catch (err) {
        updateJob(job.id, { status: "failed", error: err instanceof Error ? err.message : "Processing failed" });
      }
    },
    [prompt, duration, pollJob]
  );

  const handleRunAll = async () => {
    if (!prompt.trim()) {
      toast.error("Enter a prompt first");
      return;
    }

    // Auto-assign pool images to jobs that need them
    const emptyJobs = jobs.filter((j) => j.status === "pending" && !j.imageId && !j.imageUrl);
    if (emptyJobs.length > 0) {
      if (bulkImagePool.length < emptyJobs.length) {
        toast.error(`Not enough images. Need ${emptyJobs.length} more, have ${bulkImagePool.length} in pool. Add more images or remove jobs.`);
        return;
      }
      assignPoolImages();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const validJobs = jobs.filter((j) => j.status === "pending" && j.imageId && j.imageUrl);
    if (validJobs.length === 0) {
      toast.error("No valid jobs to process. Each needs an image.");
      return;
    }

    setRunning(true);
    toast.info(`Starting ${validJobs.length} dancing reel generation${validJobs.length > 1 ? "s" : ""}...`);

    for (const job of validJobs) {
      processJob(job);
    }
  };

  const handleSaveVideo = async (jobId: string, videoUrl: string) => {
    try {
      const res = await fetch("/api/dancing-reel/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        updateJob(jobId, { videoAssetId: data.assetId });
        toast.success("Video saved to library!");
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save video");
    }
  };

  const completedCount = jobs.filter((j) => j.status === "completed").length;
  const failedCount = jobs.filter((j) => j.status === "failed").length;
  const processingCount = jobs.filter((j) => j.status === "submitting" || j.status === "polling").length;
  const allDone = running && processingCount === 0;
  const emptyJobsCount = jobs.filter((j) => j.status === "pending" && !j.imageId && !j.imageUrl).length;
  const canRun = !running && prompt.trim() && jobs.some((j) => j.imageId || bulkImagePool.length >= emptyJobsCount);

  return (
    <div className="space-y-6">
      {/* Step 1: Prompt & Settings */}
      <StepSection
        step={1}
        title="Prompt & Duration"
        description="Set the dance prompt and video duration. These settings apply to all videos in this batch."
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Dance Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the dancing motion..."
              rows={4}
              className="resize-y text-sm"
              disabled={running}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {prompt.trim().split(/\s+/).filter(Boolean).length} words
              </span>
              {prompt !== DEFAULT_PROMPT && (
                <button
                  type="button"
                  onClick={() => setPrompt(DEFAULT_PROMPT)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  disabled={running}
                >
                  Reset to default
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Duration</Label>
            <div className="flex gap-2">
              <Button
                variant={duration === 5 ? "default" : "outline"}
                size="sm"
                onClick={() => setDuration(5)}
                disabled={running}
                className="flex-1"
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                5 seconds (~$0.35/video)
              </Button>
              <Button
                variant={duration === 10 ? "default" : "outline"}
                size="sm"
                onClick={() => setDuration(10)}
                disabled={running}
                className="flex-1"
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                10 seconds (~$0.70/video)
              </Button>
            </div>
          </div>
        </div>
      </StepSection>

      {/* Step 2: Upload Images */}
      <StepSection
        step={2}
        title="Upload Images"
        description="Upload portrait images for your dancing reels. Images are randomly assigned to jobs that don't have a manually selected image."
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-base">Bulk Image Pool</Label>
            {bulkImagePool.length > 0 && (
              <button
                type="button"
                onClick={clearBulkPool}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          <div
            onDragOver={handleBulkDragOver}
            onDragLeave={handleBulkDragLeave}
            onDrop={handleBulkDrop}
            onClick={() => !running && !bulkUploading && bulkFileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-4 transition-all cursor-pointer",
              bulkDragOver ? "border-accent-blue bg-accent-blue/5" : "hover:border-accent-blue/50",
              running ? "opacity-50 pointer-events-none" : ""
            )}
          >
            <input
              ref={bulkFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleBulkFileSelect}
              className="hidden"
            />

            {bulkImagePool.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                {bulkUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">Uploading images...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8" />
                    <p className="text-sm">Drop images here or click to browse</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <p className="text-xs text-muted-foreground">
                  {bulkImagePool.length} image{bulkImagePool.length === 1 ? "" : "s"} in pool (randomly assigned to videos without images)
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {bulkImagePool.map((img) => (
                    <div key={img.id} className="relative group flex-shrink-0">
                      <img src={img.url} alt="" className="h-16 w-16 rounded-md object-cover border" />
                      <button
                        type="button"
                        onClick={() => removeBulkImage(img.id)}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="border border-dashed rounded-md px-3 py-1 text-xs text-muted-foreground hover:text-accent-blue cursor-pointer inline-flex items-center gap-1 w-fit"
                >
                  <Plus className="h-3 w-3" /> Add more
                </div>
              </div>
            )}
          </div>
        </div>
      </StepSection>

      {/* Step 3: Jobs */}
      <StepSection
        step={3}
        title="Videos"
        description="Each row becomes a separate dancing reel. Add more rows for more videos. You can manually assign images or let the pool handle it."
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">Videos ({jobs.length})</Label>
            <Button variant="outline" size="sm" onClick={addJob} disabled={running}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Video
            </Button>
          </div>

          {jobs.map((job, idx) => (
            <div
              key={job.id}
              className={cn(
                "rounded-lg border p-4 space-y-3",
                job.status === "completed" && "border-green-500 bg-green-500/5",
                job.status === "failed" && "border-destructive bg-destructive/5",
                job.status === "pending" && "border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Video {idx + 1}</span>
                <div className="flex items-center gap-2">
                  <JobStatusBadge status={job.status} pollCount={job.pollCount} />
                  {!running && jobs.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeJob(job.id)} className="h-7 w-7 p-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {job.status === "pending" && (
                <div
                  className="flex items-center gap-3"
                  onDragOver={(e) => handleDragOver(e, job.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, job.id)}
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs">Image</Label>
                    {job.imageUrl ? (
                      <div className="relative group">
                        <img
                          src={job.imageUrl}
                          alt="Selected"
                          className={cn(
                            "h-[80px] w-[45px] rounded-md object-cover border cursor-pointer",
                            dragOverJobId === job.id ? "ring-2 ring-accent-blue ring-offset-2" : ""
                          )}
                          onClick={() => !running && setPickerJobId(job.id)}
                        />
                        {!running && (
                          <button
                            type="button"
                            onClick={() => updateJob(job.id, { imageId: null, imageUrl: null })}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPickerJobId(job.id)}
                        disabled={running}
                        className={cn(
                          "h-[80px] w-[45px] rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors",
                          dragOverJobId === job.id ? "border-accent-blue bg-accent-blue/10" : "hover:border-accent-blue/50 hover:text-accent-blue"
                        )}
                      >
                        <ImageIcon className="h-4 w-4" />
                        <span className="text-[9px]">
                          {dragOverJobId === job.id ? "Drop" : "Select"}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 text-sm text-muted-foreground">
                    {job.imageId ? (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        Image ready
                      </Badge>
                    ) : (
                      <span className="text-xs">No image — will use pool</span>
                    )}
                  </div>
                </div>
              )}

              {job.status !== "pending" && job.status !== "completed" && job.status !== "failed" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-blue" />
                    <span className="text-xs">
                      {job.status === "submitting" && "Submitting to Kling 2.6 Pro..."}
                      {job.status === "polling" && `Generating video... ${Math.round((job.pollCount || 0) * 5)}s`}
                    </span>
                  </div>
                  {job.status === "polling" && (
                    <Progress value={Math.min(((job.pollCount || 0) / MAX_POLL_ATTEMPTS) * 100, 95)} className="h-1.5" />
                  )}
                </div>
              )}

              {job.status === "failed" && job.error && (
                <p className="text-xs text-destructive">{job.error}</p>
              )}

              {job.status === "completed" && job.videoUrl && (
                <div className="space-y-2">
                  <video
                    controls
                    src={job.videoUrl}
                    className="w-full max-h-[200px] rounded-md bg-black"
                    preload="metadata"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = job.videoUrl!;
                        a.download = `dancing-reel-${idx + 1}.mp4`;
                        a.target = "_blank";
                        a.click();
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Download
                    </Button>
                    {job.videoAssetId ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Saved
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleSaveVideo(job.id, job.videoUrl!)}>
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Save to Library
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </StepSection>

      {/* Status summary */}
      {running && (
        <div className="flex items-center gap-3 text-sm">
          {processingCount > 0 && (
            <Badge variant="secondary">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              {processingCount} processing
            </Badge>
          )}
          {completedCount > 0 && (
            <Badge variant="secondary" className="text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {completedCount} completed
            </Badge>
          )}
          {failedCount > 0 && (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              {failedCount} failed
            </Badge>
          )}
        </div>
      )}

      {/* Run button */}
      <div className="flex gap-2">
        <Button onClick={handleRunAll} disabled={!canRun} size="lg" className="flex-1">
          <Music className="h-4 w-4 mr-2" />
          {running
            ? allDone
              ? "All Done"
              : `Processing ${processingCount} video${processingCount !== 1 ? "s" : ""}...`
            : `Generate ${jobs.filter((j) => j.imageId || bulkImagePool.length).length} Dancing Reel${jobs.length > 1 ? "s" : ""} (${duration}s each)`}
        </Button>

        {allDone && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setRunning(false);
              setJobs([{ id: crypto.randomUUID(), imageId: null, imageUrl: null, status: "pending" }]);
            }}
          >
            Start New Batch
          </Button>
        )}
      </div>

      {/* Image Picker Dialog */}
      <Dialog open={pickerJobId !== null} onOpenChange={(open) => !open && setPickerJobId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Image</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search images..." value={pickerSearch} onChange={(e) => handlePickerSearch(e.target.value)} className="pl-9" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePickerUpload}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              Upload
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {pickerImages.length === 0 && !pickerLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">No images found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pb-2">
                {pickerImages.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    className="relative aspect-[9/16] overflow-hidden rounded-md border-2 border-transparent hover:border-accent-blue/50 transition-all"
                    onClick={() => handlePickerSelect(image)}
                  >
                    <img src={image.signed_url} alt={image.filename} className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            {pickerImages.length < pickerTotal && (
              <div className="flex justify-center py-2">
                <Button variant="outline" size="sm" onClick={() => fetchPickerImages(true)} disabled={pickerLoading}>
                  {pickerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load More"}
                </Button>
              </div>
            )}
          </div>

          {pickerJobId && (
            <p className="text-xs text-muted-foreground">
              Click an image to select it for this video. Uploaded images are auto-saved to your asset library.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobStatusBadge({ status, pollCount }: { status: DancingJob["status"]; pollCount?: number }) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="text-xs">Pending</Badge>;
    case "submitting":
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Submitting
        </Badge>
      );
    case "polling":
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {Math.round((pollCount || 0) * 5)}s
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="secondary" className="text-xs gap-1 text-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Done
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="text-xs gap-1">
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
  }
}
