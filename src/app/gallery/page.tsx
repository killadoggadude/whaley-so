import { GalleryClient } from "./gallery-client";
import type { GalleryItem, GalleryVideoType } from "@/types";

export const metadata = {
  title: "Community Gallery | thirst.so",
  description: "Discover and recreate viral videos from our community",
};

async function getGalleryItems(videoType?: GalleryVideoType) {
  try {
    const params = new URLSearchParams();
    if (videoType) params.set("video_type", videoType);
    params.set("limit", "50");
    params.set("sort", "newest");

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/gallery/list?${params}`, {
      cache: "no-store",
    });

    if (!res.ok) return { items: [], total: 0 };

    return res.json();
  } catch {
    return { items: [], total: 0 };
  }
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const videoType = searchParams.type as GalleryVideoType | undefined;
  const { items, total } = await getGalleryItems(videoType);

  return (
    <GalleryClient
      initialItems={items as GalleryItem[]}
      initialTotal={total}
      initialType={videoType || "all"}
    />
  );
}
