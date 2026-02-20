export type SubscriptionTier = "free" | "starter" | "pro" | "agency";
export type SubscriptionStatus = "trial" | "active" | "cancelled" | "past_due";
export type ApiService = "elevenlabs" | "higgsfield" | "wavespeed" | "anthropic" | "openai" | "google";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  trial_end_date: string | null;
  monthly_reel_limit: number;
  models_limit: number;
  current_reels_used: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserApiKey {
  id: string;
  user_id: string;
  service: ApiService;
  encrypted_api_key: string;
  created_at: string;
  updated_at: string;
}

export interface MaskedApiKey {
  service: ApiService;
  masked_key: string;
  created_at: string;
  updated_at: string;
}

export interface TtsSettings {
  stability: number;
  similarity_boost: number;
  style: number;
}

export interface TtsRequest {
  text: string;
  voice_id: string;
  settings: TtsSettings;
}

export interface TranscriptionResult {
  url: string;
  platform: string;
  transcript: string;
  word_count: number;
  error?: string;
}

export type AssetFileType = "image" | "audio" | "video" | "document";

export interface Asset {
  id: string;
  user_id: string;
  filename: string;
  file_path: string;
  file_type: AssetFileType;
  mime_type: string;
  file_size: number;
  tags: string[];
  is_favorite: boolean;
  ai_model_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AssetWithUrl extends Asset {
  signed_url: string;
}

export interface AssetFilters {
    file_type?: AssetFileType;
    tags?: string[];
    is_favorite?: boolean;
    search?: string;
    ai_model_id?: string | null;
    sort_by?: "created_at" | "file_size" | "filename";
    sort_order?: "asc" | "desc";
    limit?: number;
    offset?: number;
    ids?: string;
  }

export interface AiModel {
  id: string;
  user_id: string;
  name: string;
  description: string;
  voice_id: string;
  voice_settings: TtsSettings;
  reference_image_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiModelWithImages extends AiModel {
  reference_images: AssetWithUrl[];
}

export interface Prompt {
  id: string;
  user_id: string;
  model_id: string | null;
  source_image_id: string | null;
  prompt_text: string;
  prompt_index: number;
  variation_label: string;
  is_edited: boolean;
  video_type: 'dancing_reel' | 'talking_head' | null;
  preview_image_url: string | null;
  category: 'pose' | 'outfit' | 'background' | 'expression' | 'general' | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PromptWithSourceImage extends Prompt {
  source_image?: AssetWithUrl;
}

// ----- Generations (Week 6) -----

export type GenerationStatus =
  | "pending"
  | "submitting"
  | "completed"
  | "failed";

export interface GenerationSettings {
  aspect_ratio: string;
  model: string;              // "nano-banana-pro" | "minimax-image-01" | "instagirl"
  ai_model_id?: string;       // UUID of user's AI model profile (for reference images)
}

export interface Generation {
  id: string;
  user_id: string;
  prompt_id: string | null;
  prompt_text: string;
  status: GenerationStatus;
  higgsfield_job_id: string | null;
  model: string;
  settings: GenerationSettings;
  result_urls: string[];
  saved_asset_ids: string[];
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const ASPECT_RATIOS = [
  { label: "Landscape (16:9)", value: "16:9" },
  { label: "Portrait (9:16)", value: "9:16" },
  { label: "Square (1:1)", value: "1:1" },
  { label: "Portrait (3:4)", value: "3:4" },
  { label: "Landscape (4:3)", value: "4:3" },
] as const;

export const WAVESPEED_MODELS = [
  { label: "Nano Banana Pro (Recommended)", value: "nano-banana-pro", supportsReference: true },
  { label: "MiniMax Image-01 (Character Reference)", value: "minimax-image-01", supportsReference: true },
  { label: "Instagirl (Influencer-Optimized)", value: "instagirl", supportsReference: false },
] as const;

// MiniMax uses pixel dimensions, Nano Banana Pro uses aspect_ratio directly
export const ASPECT_RATIO_TO_SIZE: Record<string, string> = {
  "16:9": "1280*720",
  "9:16": "720*1280",
  "1:1": "1024*1024",
  "3:4": "864*1152",
  "4:3": "1152*864",
};

export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  aspect_ratio: "9:16",
  model: "nano-banana-pro",
};

// ----- Threads Accounts (Week 9) -----

export type TokenStatus = "valid" | "expiring_soon" | "expired";

export interface ThreadsAccount {
  id: string;
  user_id: string;
  threads_user_id: string;
  username: string;
  profile_pic_url: string;
  access_token: string; // encrypted
  token_expires_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ThreadsAccountWithStatus extends Omit<ThreadsAccount, "access_token"> {
  token_status: TokenStatus;
}

// ----- Captions (Video Captioning) -----

export interface WordTimestamp {
  word: string;
  start: number;  // seconds
  end: number;    // seconds
}

// ----- Viral Reels Library -----

export type ReelPlatform = "instagram" | "tiktok" | "youtube";
export type ReelCategory = "talking_head" | "dancing" | "motion_control" | "general";

export interface ViralReel {
  id: string;
  user_id: string;
  url: string;
  platform: ReelPlatform;
  shortcode: string | null;
  thumbnail_url: string | null;
  notes: string;
  tags: string[];
  is_favorite: boolean;
  is_curated: boolean;
  category: ReelCategory;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface ViralReelFilters {
  search?: string;
  is_favorite?: boolean;
  min_views?: number;
  max_views?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
  is_curated?: boolean;
  category?: ReelCategory;
}

// ----- Gallery -----

export type GalleryVideoType = "talking_head" | "dancing" | "motion_control";

export interface GalleryItem {
  id: string;
  user_id: string;
  video_type: GalleryVideoType;
  video_url: string;
  thumbnail_url: string | null;
  script_text: string | null;
  model_image_url: string | null;
  views: number;
  remakes: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// ----- Generation Queue -----

export type GenerationType = "talking_head" | "tts" | "image_gen" | "transcript";

export type QueueStatus = "pending" | "processing" | "completed" | "failed" | "retrying";

export interface GenerationQueue {
  id: string;
  user_id: string;
  generation_type: GenerationType;
  payload: Record<string, unknown>;
  priority: number;
  status: QueueStatus;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}


// ----- Caption Presets (User-Saved Caption Styles) -----

export interface CaptionPreset {
  id: string;
  user_id: string;
  name: string;
  settings: Record<string, unknown>; // CustomCaptionSettings as JSONB
  created_at: string;
  updated_at: string;
}
