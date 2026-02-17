const PRICING_480P = 0.03;
const PRICING_720P = 0.06;
const MIN_CHARGE = 0.15;
const MAX_DURATION_SEC = 600;

export async function getAudioDuration(audioUrl: string): Promise<number | null> {
  try {
    const response = await fetch(audioUrl, { method: 'HEAD' });
    if (!response.ok) {
      console.error('Failed to fetch audio file');
      return null;
    }

    const audio = new Audio(audioUrl);
    
    return new Promise((resolve) => {
      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        resolve(duration);
      });

      audio.addEventListener('error', () => {
        console.error('Failed to load audio metadata');
        resolve(null);
      });

      audio.load();
    });
  } catch (error) {
    console.error('Error getting audio duration:', error);
    return null;
  }
}

export function calculateVideoCost(
  duration: number,
  resolution: "480p" | "720p"
): { duration: number; cost: number } {
  const safeDuration = Math.min(duration, MAX_DURATION_SEC);
  const rate = resolution === "480p" ? PRICING_480P : PRICING_720P;
  const rawCost = safeDuration * rate;
  const finalCost = Math.max(rawCost, MIN_CHARGE);

  return {
    duration: safeDuration,
    cost: parseFloat(finalCost.toFixed(2)),
  };
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function calculateTTSCost(text: string): number {
  const characterCount = text.length;
  const ratePerCharacter = 0.00022;
  const cost = characterCount * ratePerCharacter;
  return parseFloat(cost.toFixed(2));
}