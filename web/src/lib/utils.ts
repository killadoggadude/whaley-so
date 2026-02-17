import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTagLabel(tag: string): string {
  return tag
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getTagColor(tag: string): string {
  const colorMap: Record<string, string> = {
    "talking-head": "bg-blue-100 text-blue-700",
    "portrait": "bg-purple-100 text-purple-700",
    "prompt-source": "bg-green-100 text-green-700",
    "lip-sync": "bg-orange-100 text-orange-700",
    "tts-audio": "bg-pink-100 text-pink-700",
    "captioned": "bg-teal-100 text-teal-700",
  };
  return colorMap[tag] || "";
}
