-- Add video_type, preview_image_url, and category to prompts table
-- for categorized prompt library (Dancing Reel / Talking Head)

ALTER TABLE public.prompts
ADD COLUMN video_type TEXT CHECK (video_type IN ('dancing_reel', 'talking_head', null)),
ADD COLUMN preview_image_url TEXT,
ADD COLUMN category TEXT CHECK (category IN ('pose', 'outfit', 'background', 'expression', 'general', null)) DEFAULT 'general';

CREATE INDEX idx_prompts_video_type ON public.prompts(video_type) WHERE video_type IS NOT NULL;
CREATE INDEX idx_prompts_user_video_type ON public.prompts(user_id, video_type) WHERE video_type IS NOT NULL;
