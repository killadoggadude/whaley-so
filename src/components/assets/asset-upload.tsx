"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils";
import { toast } from "sonner";

interface UploadingFile {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface AssetUploadProps {
  onUploadComplete: () => void;
}

export function AssetUpload({ onUploadComplete }: AssetUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadingFile[] = Array.from(fileList).map((file) => ({
      file,
      status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAll = async () => {
    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "done") continue;

      setFiles((prev) =>
        prev.map((f, j) => (j === i ? { ...f, status: "uploading" } : f))
      );

      try {
        const formData = new FormData();
        formData.append("file", files[i].file);

        const response = await fetch("/api/assets/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }

        setFiles((prev) =>
          prev.map((f, j) => (j === i ? { ...f, status: "done" } : f))
        );
        successCount++;
      } catch (error) {
        setFiles((prev) =>
          prev.map((f, j) =>
            j === i
              ? {
                  ...f,
                  status: "error",
                  error:
                    error instanceof Error ? error.message : "Upload failed",
                }
              : f
          )
        );
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} file${successCount > 1 ? "s" : ""}`);
      onUploadComplete();
    }
  };

  const pendingFiles = files.filter((f) => f.status !== "done");

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          "rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-accent-blue bg-accent-blue/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Drag & drop files here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Images, audio, video, PDF. Max 50MB each.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,audio/*,video/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* File queue */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
            >
              {item.status === "uploading" && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {item.status === "done" && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {item.status === "error" && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              {item.status === "pending" && (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
              )}

              <span className="flex-1 truncate">{item.file.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(item.file.size)}
              </span>

              {item.error && (
                <span className="text-xs text-destructive">{item.error}</span>
              )}

              {item.status !== "uploading" && item.status !== "done" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}

          {pendingFiles.length > 0 && (
            <Button onClick={uploadAll} disabled={uploading} className="w-full">
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                `Upload ${pendingFiles.length} file${pendingFiles.length > 1 ? "s" : ""}`
              )}
            </Button>
          )}

          {files.length > 0 && !uploading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiles([])}
              className="w-full"
            >
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
