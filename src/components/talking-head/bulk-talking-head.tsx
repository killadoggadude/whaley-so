"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Trash2,
  Loader2,
  Video,
  AlertCircle,
  CheckCircle2,
  Upload,
  Search,
  ImageIcon,
  Download,
  Save,
  Mic,
  X,
  Subtitles,
  RefreshCw,
  Info,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CaptionCustomizerInline } from "./caption-customizer";
import { DEFAULT_CAPTION_SETTINGS } from "@/lib/caption-styles";
import type { CustomCaptionSettings } from "@/lib/caption-styles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WordTimestamp } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getAssetsAction } from "@/app/dashboard/assets/actions";
import type { AiModelWithImages, AssetWithUrl } from "@/types";

interface BulkTalkingHeadProps {
  aiModels: AiModelWithImages[];
}

interface BulkJob {
  id: string;
  script: string;
  imageId: string | null;
  imageUrl: string | null;
  status: "pending" | "generating_voice" | "uploading_audio" | "submitting" | "polling" | "captioning" | "completed" | "failed";
  error?: string;
  audioUrl?: string;
  audioSignedUrl?: string;
  taskId?: string;
  videoUrl?: string;
  captionedVideoUrl?: string;
  videoAssetId?: string;
  pollCount?: number;
  words?: WordTimestamp[];
}

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 200;

// Step section component for visual stepping through the workflow
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

export function BulkTalkingHead({ aiModels }: BulkTalkingHeadProps) {
  const voiceModels = aiModels.filter((m) => m.voice_id && m.voice_id.trim());
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [resolution, setResolution] = useState("480p");
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [captionSettings, setCaptionSettings] = useState<CustomCaptionSettings>({ ...DEFAULT_CAPTION_SETTINGS });
  const [jobs, setJobs] = useState<BulkJob[]>([{ id: crypto.randomUUID(), script: "", imageId: null, imageUrl: null, status: "pending" }]);
  const [running, setRunning] = useState(false);
  const pollingRefs = useRef<Map<string, boolean>>(new Map());
  const [pickerJobId, setPickerJobId] = useState<string | null>(null);
  const [pickerImages, setPickerImages] = useState<AssetWithUrl[]>([]);
  const [pickerTotal, setPickerTotal] = useState(0);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOverJobId, setDragOverJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bulkImagePool, setBulkImagePool] = useState<Array<{ id: string; url: string }>>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkDragOver, setBulkDragOver] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Re-caption dialog state
  const [recaptionJobId, setRecaptionJobId] = useState<string | null>(null);
  const [recaptionSettings, setRecaptionSettings] = useState<CustomCaptionSettings>({ ...DEFAULT_CAPTION_SETTINGS });
  const [recaptioning, setRecaptioning] = useState(false);

  const selectedModel = voiceModels.find((m) => m.id === selectedModelId) || null;

  useEffect(() => {
    return () => {
      pollingRefs.current.forEach((_, key) => pollingRefs.current.set(key, false));
    };
  }, []);

  const addJob = () => {
    setJobs((prev) => [...prev, { id: crypto.randomUUID(), script: "", imageId: null, imageUrl: null, status: "pending" }]);
  };

  const removeJob = (id: string) => {
    if (jobs.length <= 1) return;
    pollingRefs.current.set(id, false);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const updateJob = (id: string, updates: Partial<BulkJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...updates } : j)));
  };

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
   * Bypasses the API route to avoid Vercel's 4.5MB body limit.
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

      // Upload directly to Supabase Storage
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

      // Create asset record in DB
      const { data: asset, error: dbError } = await supabase
        .from("assets")
        .insert({
          user_id: user.id,
          filename: file.name,
          file_path: filePath,
          file_type: "image",
          mime_type: file.type,
          file_size: file.size,
          tags: ["talking-head", "portrait"],
          metadata: {},
        })
        .select("id")
        .single();

      if (dbError) {
        await supabase.storage.from("assets").remove([filePath]);
        toast.error(`Database error: ${dbError.message}`);
        return null;
      }

      // Get signed URL
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

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported');
      return;
    }

    await handleImageUpload(file, jobId);
  };

  /**
   * Upload multiple images directly to Supabase Storage from the browser.
   * Uses concurrency limit of 3 and bypasses the API route body size limit.
   */
  const uploadBulkImages = async (files: File[] | FileList) => {
    setBulkUploading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setBulkUploading(false);
      return;
    }

    // Validate and collect eligible files
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

    // Upload with concurrency limit of 3
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
                tags: ["talking-head", "portrait"],
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
      toast.success(`${uploadedImages.length} image${uploadedImages.length === 1 ? '' : 's'} uploaded to pool`);
      if (failedCount > 0) {
        toast.error(`${failedCount} image${failedCount === 1 ? '' : 's'} failed to upload`);
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

    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Only image files are supported");
      return;
    }

    await uploadBulkImages(imageFiles);
  };

  const removeBulkImage = (id: string) => {
    setBulkImagePool((prev) => prev.filter(img => img.id !== id));
  };

  const clearBulkPool = () => {
    setBulkImagePool([]);
  };

  const assignPoolImages = () => {
    const emptyJobs = jobs.filter(j => j.status === "pending" && j.script.trim() && !j.imageId && !j.imageUrl);
    if (emptyJobs.length === 0 || bulkImagePool.length === 0) return { assignedCount: 0, assignedJobIds: [] };

    const available = [...bulkImagePool].sort(() => Math.random() - 0.5);
    const assignCount = Math.min(emptyJobs.length, available.length);

    const updatedJobs: Array<{ id: string; imageId: string; imageUrl: string }> = [];
    const assignedJobIds: string[] = [];
    for (let i = 0; i < assignCount; i++) {
      const jobId = emptyJobs[i].id;
      updatedJobs.push({ id: jobId, imageId: available[i].id, imageUrl: available[i].url });
      assignedJobIds.push(jobId);
    }
    setJobs(prev => prev.map(j => {
      const update = updatedJobs.find(u => u.id === j.id);
      return update ? { ...j, imageId: update.imageId, imageUrl: update.imageUrl } : j;
    }));

    return { assignedCount: assignCount, assignedJobIds };
  };

  const addCaptionsToJob = useCallback(async (jobId: string, videoUrl: string, audioUrl: string, customSettingsOverride?: CustomCaptionSettings) => {
    updateJob(jobId, { status: "captioning" });
    try {
      // Step 1: Transcribe audio to get word timestamps
      const transcribeRes = await fetch("/api/talking-head/transcribe-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl }),
      });
      const transcribeData = await transcribeRes.json();

      if (!transcribeRes.ok || !transcribeData.words?.length) {
        const reason = transcribeData.error || "No word timestamps returned";
        console.error("Caption transcription failed:", reason);
        toast.warning(`Captions skipped: transcription failed — ${reason}`);
        updateJob(jobId, { status: "completed", videoUrl });
        return;
      }

      // Step 2: Burn captions into video via FFmpeg
      const captionRes = await fetch("/api/talking-head/add-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, words: transcribeData.words, customSettings: customSettingsOverride || captionSettings }),
      });
      const captionData = await captionRes.json();

      if (!captionRes.ok) {
        const reason = captionData.error || "Unknown error";
        console.error("Caption burn-in failed:", reason);
        toast.warning(`Captions skipped: burn-in failed — ${reason}`);
        updateJob(jobId, { status: "completed", videoUrl, words: transcribeData.words });
        return;
      }

      updateJob(jobId, { status: "completed", captionedVideoUrl: captionData.signedUrl, videoAssetId: captionData.assetId, words: transcribeData.words });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      console.error("Caption error:", err);
      toast.warning(`Captions skipped: ${reason}`);
      updateJob(jobId, { status: "completed", videoUrl });
    }
  }, [captionSettings]);

  const handleRecaption = async () => {
    if (!recaptionJobId) return;

    const job = jobs.find((j) => j.id === recaptionJobId);
    if (!job || !job.videoUrl || !job.words || !job.words.length) {
      toast.error("Cannot re-caption: missing video or word timestamps");
      setRecaptionJobId(null);
      return;
    }

    setRecaptioning(true);
    try {
      const captionRes = await fetch("/api/talking-head/add-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: job.videoUrl, words: job.words, customSettings: recaptionSettings }),
      });
      const captionData = await captionRes.json();

      if (!captionRes.ok) {
        toast.error(captionData.error || "Failed to re-caption video");
        setRecaptioning(false);
        return;
      }

      updateJob(job.id, { captionedVideoUrl: captionData.signedUrl, videoAssetId: captionData.assetId });
      toast.success("Captions updated successfully");
      setRecaptionJobId(null);
    } catch (err) {
      console.error("Re-caption error:", err);
      toast.error("Failed to re-caption video");
    } finally {
      setRecaptioning(false);
    }
  };

  const pollJob = useCallback(async (jobId: string, taskId: string, shouldCaption: boolean, audioSignedUrlForCaption: string) => {
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

          if (shouldCaption) {
            addCaptionsToJob(jobId, data.videoUrl, audioSignedUrlForCaption);
          } else {
            updateJob(jobId, { status: "completed", videoUrl: data.videoUrl });
          }
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
        console.warn(`Poll error for job ${jobId} (attempt ${attempts}):`, err);

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
      updateJob(jobId, { status: "failed", error: `Timed out after ${attempts} polls (${Math.round(attempts * POLL_INTERVAL_MS / 1000)}s)` });
    }
  }, [addCaptionsToJob]);

  const processJob = useCallback(async (job: BulkJob, model: AiModelWithImages) => {
    updateJob(job.id, { status: "generating_voice" });
    try {
      const ttsRes = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: job.script, voice_id: model.voice_id, settings: model.voice_settings }),
      });

      if (!ttsRes.ok) {
        const err = await ttsRes.json().catch(() => ({ error: "TTS failed" }));
        updateJob(job.id, { status: "failed", error: err.error || "TTS failed" });
        return;
      }

      const audioBlob = await ttsRes.blob();
      const blobUrl = URL.createObjectURL(audioBlob);
      updateJob(job.id, { audioUrl: blobUrl });

      updateJob(job.id, { status: "uploading_audio" });
      const formData = new FormData();
      formData.append("file", audioBlob, "talking-head-audio.mp3");

      const uploadRes = await fetch("/api/talking-head/upload-audio", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        updateJob(job.id, { status: "failed", error: uploadData.error || "Audio upload failed" });
        return;
      }

      updateJob(job.id, { audioSignedUrl: uploadData.signedUrl });

      updateJob(job.id, { status: "submitting" });
      const submitRes = await fetch("/api/talking-head/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioSignedUrl: uploadData.signedUrl, imageSignedUrl: job.imageUrl, resolution }),
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok) {
        updateJob(job.id, { status: "failed", error: submitData.error || "Submit failed" });
        return;
      }

      updateJob(job.id, { status: "polling", taskId: submitData.taskId, pollCount: 0 });
      pollJob(job.id, submitData.taskId, captionsEnabled, uploadData.signedUrl);
    } catch (err) {
      updateJob(job.id, { status: "failed", error: err instanceof Error ? err.message : "Processing failed" });
    }
  }, [resolution, captionsEnabled, pollJob]);

  const handleRunAll = async () => {
    if (!selectedModel) {
      toast.error("Select a model first");
      return;
    }

    const emptyJobs = jobs.filter((j) => j.status === "pending" && j.script.trim() && !j.imageId && !j.imageUrl);
    if (emptyJobs.length > 0) {
      if (bulkImagePool.length < emptyJobs.length) {
        toast.error(`Not enough images in pool. Need ${emptyJobs.length} image${emptyJobs.length === 1 ? "" : "s"}, have ${bulkImagePool.length}. Add more images or select manually.`);
        return;
      }

      const { assignedCount, assignedJobIds } = assignPoolImages();
      if (assignedCount === 0) {
        toast.error("Failed to assign images from pool");
        return;
      }

      // Wait a tick for React state to update
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Now read jobs again - they should have images
      const allValidJobs = jobs.filter((j) => j.script.trim() && j.imageId && j.imageUrl && j.status === "pending");

      if (allValidJobs.length === 0) {
        toast.error("No valid jobs to process. Each needs a script and image.");
        return;
      }

      setRunning(true);
      toast.info(`Starting ${allValidJobs.length} video generation${allValidJobs.length > 1 ? "s" : ""}...`);

      for (const job of allValidJobs) {
        processJob(job, selectedModel);
      }
    } else {
      const validJobs = jobs.filter((j) => j.script.trim() && j.imageId && j.imageUrl && j.status === "pending");

      if (validJobs.length === 0) {
        toast.error("No valid jobs to process. Each needs a script and image.");
        return;
      }

      setRunning(true);
      toast.info(`Starting ${validJobs.length} video generation${validJobs.length > 1 ? "s" : ""}...`);

      for (const job of validJobs) {
        processJob(job, selectedModel);
      }
    }
  };

  const handleSaveVideo = async (jobId: string, videoUrl: string) => {
    try {
      const res = await fetch("/api/talking-head/save", {
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
  const processingCount = jobs.filter(
    (j) => j.status === "generating_voice" || j.status === "uploading_audio" || j.status === "submitting" || j.status === "polling" || j.status === "captioning"
  ).length;
  const allDone = running && processingCount === 0;
  const emptyJobsCount = jobs.filter(j => j.status === "pending" && j.script.trim() && !j.imageId && !j.imageUrl).length;
  const canRun = !running && selectedModelId && jobs.some((j) => j.script.trim() && (j.imageId || bulkImagePool.length >= emptyJobsCount));

  return (
    <div className="space-y-6">
      <StepSection
        step={1}
        title="Select Model & Resolution"
        description="Choose which model voice to use for narration and the output video resolution. Models need voice settings configured in the Models page."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Model (Voice)</Label>
            {voiceModels.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No models with voice configured. <a href="/dashboard/models" className="underline font-medium">Add voice settings</a>
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model..." />
                </SelectTrigger>
                <SelectContent>
                  {voiceModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        {m.reference_images.length > 0 ? (
                          <img src={m.reference_images[0].signed_url} alt="" className="h-5 w-5 rounded-sm object-cover" />
                        ) : (
                          <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Resolution</Label>
            <Select value={resolution} onValueChange={setResolution}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="480p">480p — $0.03/sec</SelectItem>
                <SelectItem value="720p">720p — $0.06/sec</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </StepSection>

      <StepSection
        step={2}
        title="Captions (Optional)"
        description="Add auto-synced captions to your videos. Choose from TikTok-style presets or customize the look."
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Subtitles className="h-4 w-4 text-muted-foreground" />
              <Label>Add Captions</Label>
            </div>
            <Switch checked={captionsEnabled} onCheckedChange={setCaptionsEnabled} disabled={running} />
          </div>

          {captionsEnabled && !running && (
            <CaptionCustomizerInline settings={captionSettings} onChange={setCaptionSettings} />
          )}
        </div>
      </StepSection>

      <StepSection
        step={3}
        title="Upload Images"
        description="Upload portrait images for your videos. Images are randomly assigned to scripts that don't have a manually selected image."
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
            className={cn(
              "border-2 border-dashed rounded-lg p-4 transition-all",
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
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{bulkImagePool.length} image{bulkImagePool.length === 1 ? '' : 's'} in pool (randomly assigned to videos without images)</p>
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

      <StepSection
        step={4}
        title="Add Scripts"
        description="Add one or more scripts. Each script becomes a separate video. You can manually assign images or let the pool handle it."
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
              "rounded-lg p-4 space-y-3",
              job.status === "completed" && "border border-green-500 bg-green-500/5",
              job.status === "failed" && "border border-destructive bg-destructive/5"
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
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Script</Label>
                  <Textarea
                    value={job.script}
                    onChange={(e) => updateJob(job.id, { script: e.target.value })}
                    placeholder="Paste the script for this video..."
                    rows={4}
                    className="resize-y text-sm"
                    disabled={running}
                  />
                  <span className="text-xs text-muted-foreground">{job.script.trim().split(/\s+/).filter(Boolean).length} words</span>
                </div>

                <div className="space-y-1.5"
                  onDragOver={(e) => handleDragOver(e, job.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, job.id)}>
                  <Label className="text-xs">Portrait</Label>
                  {job.imageUrl ? (
                    <div className="relative group">
                      <img
                        src={job.imageUrl}
                        alt="Selected"
                        className={cn(
                          "h-[106px] w-[106px] rounded-md object-cover border cursor-pointer",
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
                        "h-[106px] w-[106px] rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors",
                        dragOverJobId === job.id ? "border-accent-blue bg-accent-blue/10" : "hover:border-accent-blue/50 hover:text-accent-blue"
                      )}
                    >
                      <ImageIcon className="h-5 w-5" />
                      <span className="text-[10px]">
                        {dragOverJobId === job.id ? "Drop image" : "Select"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {job.status !== "pending" && job.status !== "completed" && job.status !== "failed" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-blue" />
                  <span className="text-xs">
                    {job.status === "generating_voice" && "Generating voice..."}
                    {job.status === "uploading_audio" && "Uploading audio..."}
                    {job.status === "submitting" && "Submitting video job..."}
                    {job.status === "polling" && `Generating video... ${Math.round((job.pollCount || 0) * 3)}s`}
                    {job.status === "captioning" && "Adding captions..."}
                  </span>
                </div>
                {job.status === "polling" && (
                  <Progress value={Math.min(((job.pollCount || 0) / MAX_POLL_ATTEMPTS) * 100, 95)} className="h-1.5" />
                )}
              </div>
            )}

            {job.status === "failed" && job.error && <p className="text-xs text-destructive">{job.error}</p>}

            {job.status === "completed" && (job.captionedVideoUrl || job.videoUrl) && (
              <div className="space-y-2">
                {job.captionedVideoUrl && (
                  <Badge variant="secondary" className="gap-1 text-xs mb-1">
                    <Subtitles className="h-3 w-3" />
                    Captioned
                  </Badge>
                )}
                <video
                  controls
                  src={job.captionedVideoUrl || job.videoUrl}
                  className="w-full max-h-[200px] rounded-md bg-black"
                  preload="metadata"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = (job.captionedVideoUrl || job.videoUrl)!;
                      a.download = `talking-head-${idx + 1}.mp4`;
                      a.target = "_blank";
                      a.click();
                    }}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download
                  </Button>
                  {job.words && job.words.length > 0 && job.videoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRecaptionJobId(job.id);
                        setRecaptionSettings({ ...DEFAULT_CAPTION_SETTINGS });
                      }}
                    >
                      <Subtitles className="h-3.5 w-3.5 mr-1" />
                      Re-caption
                    </Button>
                  )}
                  {job.videoAssetId ? (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Saved
                    </Badge>
                  ) : (
                    <Button size="sm" onClick={() => handleSaveVideo(job.id, (job.captionedVideoUrl || job.videoUrl)!)}>
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

      <div className="flex gap-2">
        <Button onClick={handleRunAll} disabled={!canRun} size="lg" className="flex-1">
          <Video className="h-4 w-4 mr-2" />
          {running
            ? allDone
              ? "All Done"
              : `Processing ${processingCount} video${processingCount !== 1 ? "s" : ""}...`
            : `Generate ${jobs.filter((j) => j.script.trim() && (j.imageId || bulkImagePool.length)).length} Video${emptyJobsCount > 0 ? ` (${emptyJobsCount} from pool)` : ""}`}
        </Button>

        {allDone && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setRunning(false);
              setJobs([{ id: crypto.randomUUID(), script: "", imageId: null, imageUrl: null, status: "pending" }]);
            }}
          >
            Start New Batch
          </Button>
        )}
      </div>

      <Dialog open={pickerJobId !== null} onOpenChange={(open) => !open && setPickerJobId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Portrait Image</DialogTitle>
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

          {selectedModel && selectedModel.reference_images.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1.5">{selectedModel.name}&apos;s Reference Images</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {selectedModel.reference_images.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    className="h-14 w-14 rounded-md overflow-hidden border-2 border-transparent hover:border-accent-blue/50 transition-all flex-shrink-0"
                    onClick={() => handlePickerSelect(img)}
                  >
                    <img src={img.signed_url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

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
                    className="relative aspect-square overflow-hidden rounded-md border-2 border-transparent hover:border-accent-blue/50 transition-all"
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

      <Dialog open={recaptionJobId !== null} onOpenChange={(open) => !open && setRecaptionJobId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Re-caption Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Choose new caption styles. This will regenerate the captioned video with your new settings.
            </p>
            <CaptionCustomizerInline settings={recaptionSettings} onChange={setRecaptionSettings} />
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setRecaptionJobId(null)} disabled={recaptioning}>
                Cancel
              </Button>
              <Button onClick={handleRecaption} disabled={recaptioning}>
                {recaptioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Subtitles className="h-4 w-4 mr-2" />}
                {recaptioning ? "Recaptioning..." : "Apply New Captions"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobStatusBadge({ status, pollCount }: { status: BulkJob["status"]; pollCount?: number }) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="text-xs">Pending</Badge>;
    case "generating_voice":
      return <Badge variant="secondary" className="text-xs gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Voice
      </Badge>;
    case "uploading_audio":
      return <Badge variant="secondary" className="text-xs gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Upload
      </Badge>;
    case "submitting":
      return <Badge variant="secondary" className="text-xs gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Submit
      </Badge>;
    case "polling":
      return <Badge variant="secondary" className="text-xs gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        {Math.round((pollCount || 0) * 3)}s
      </Badge>;
    case "captioning":
      return <Badge variant="secondary" className="text-xs gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Captions
      </Badge>;
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