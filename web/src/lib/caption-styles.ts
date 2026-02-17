import type { WordTimestamp } from "@/types";

/**
 * Caption style definition for ASS subtitle formatting.
 * Colors use ASS format: &HAABBGGRR (hex, alpha-blue-green-red).
 */
export interface CaptionStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  primaryColor: string;     // Default text color (&HBBGGRR)
  highlightColor: string;   // Active word color (&HBBGGRR)
  outlineColor: string;     // Outline color
  shadowColor: string;      // Shadow color
  backgroundColor: string;  // Background box color (empty = no background)
  outlineWidth: number;
  shadowDepth: number;
  bold: boolean;
  italic: boolean;
  alignment: number;        // ASS alignment (2 = bottom center)
  marginV: number;          // Vertical margin from bottom
  wordsPerPage: number;     // How many words shown at once
  // CSS preview properties
  previewBg: string;
  previewText: string;
  previewHighlight: string;
}

/**
 * User-customizable caption settings.
 * Uses standard hex colors (#RRGGBB) which get converted to ASS format internally.
 */
export interface CustomCaptionSettings {
  fontFamily: string;
  fontSize: number;          // 24-80
  textColor: string;         // hex #RRGGBB
  highlightColor: string;    // hex #RRGGBB
  backgroundColor: string;   // hex #RRGGBB (empty = transparent)
  backgroundOpacity: number; // 0-100
  outlineColor: string;      // hex #RRGGBB
  outlineWidth: number;      // 0-5
  bold: boolean;
  italic: boolean;
  wordsPerPage: number;      // 2-8
  position: "bottom" | "center" | "top";
}

/**
 * Available font families for captions.
 */
export const CAPTION_FONTS = [
  "Arial",
  "Helvetica",
  "Impact",
  "Georgia",
  "Verdana",
  "Trebuchet MS",
  "Courier New",
  "Comic Sans MS",
  "Futura",
  "Tahoma",
] as const;

/**
 * Default custom caption settings.
 */
export const DEFAULT_CAPTION_SETTINGS: CustomCaptionSettings = {
  fontFamily: "Arial",
  fontSize: 60,
  textColor: "#FFFFFF",
  highlightColor: "#FFFF00",
  backgroundColor: "",
  backgroundOpacity: 60,
  outlineColor: "#000000",
  outlineWidth: 3,
  bold: true,
  italic: false,
  wordsPerPage: 3,
  position: "center",
};

/**
 * Predefined caption style presets that users can start from.
 */
export const CAPTION_PRESETS: Array<{
  id: string;
  name: string;
  settings: CustomCaptionSettings;
  previewBg: string;
  previewText: string;
  previewHighlight: string;
}> = [
  {
    id: "classic-tiktok",
    name: "Classic TikTok",
    settings: {
      fontFamily: "Impact",
      fontSize: 60,
      textColor: "#FFFFFF",
      highlightColor: "#FFFF00",
      backgroundColor: "",
      backgroundOpacity: 60,
      outlineColor: "#000000",
      outlineWidth: 3,
      bold: true,
      italic: false,
      wordsPerPage: 2,
      position: "center",
    },
    previewBg: "bg-black",
    previewText: "text-white",
    previewHighlight: "text-yellow-400",
  },
  {
    id: "capcut-pop",
    name: "CapCut Pop",
    settings: {
      fontFamily: "Arial",
      fontSize: 64,
      textColor: "#FFFFFF",
      highlightColor: "#00D9FF",
      backgroundColor: "",
      backgroundOpacity: 60,
      outlineColor: "#000000",
      outlineWidth: 4,
      bold: true,
      italic: false,
      wordsPerPage: 2,
      position: "center",
    },
    previewBg: "bg-black",
    previewText: "text-white",
    previewHighlight: "text-cyan-400",
  },
  {
    id: "neon-highlight",
    name: "Neon Highlight",
    settings: {
      fontFamily: "Arial",
      fontSize: 58,
      textColor: "#FFFFFF",
      highlightColor: "#39FF14",
      backgroundColor: "",
      backgroundOpacity: 60,
      outlineColor: "#00FF00",
      outlineWidth: 2,
      bold: true,
      italic: false,
      wordsPerPage: 3,
      position: "center",
    },
    previewBg: "bg-black",
    previewText: "text-white",
    previewHighlight: "text-lime-400",
  },
  {
    id: "bold-minimal",
    name: "Bold Minimal",
    settings: {
      fontFamily: "Arial",
      fontSize: 56,
      textColor: "#FFFFFF",
      highlightColor: "#FFFFFF",
      backgroundColor: "",
      backgroundOpacity: 60,
      outlineColor: "#000000",
      outlineWidth: 1,
      bold: true,
      italic: false,
      wordsPerPage: 3,
      position: "center",
    },
    previewBg: "bg-black",
    previewText: "text-white",
    previewHighlight: "text-white",
  },
  {
    id: "warm-viral",
    name: "Warm Viral",
    settings: {
      fontFamily: "Arial",
      fontSize: 62,
      textColor: "#FFFFFF",
      highlightColor: "#FF6B35",
      backgroundColor: "",
      backgroundOpacity: 60,
      outlineColor: "#4A2C2A",
      outlineWidth: 3,
      bold: true,
      italic: false,
      wordsPerPage: 2,
      position: "center",
    },
    previewBg: "bg-black",
    previewText: "text-white",
    previewHighlight: "text-orange-500",
  },
  {
    id: "clean-subtitle",
    name: "Clean Subtitle",
    settings: {
      fontFamily: "Arial",
      fontSize: 52,
      textColor: "#FFFFFF",
      highlightColor: "#87CEEB",
      backgroundColor: "",
      backgroundOpacity: 60,
      outlineColor: "#000000",
      outlineWidth: 2,
      bold: false,
      italic: false,
      wordsPerPage: 3,
      position: "bottom",
    },
    previewBg: "bg-black",
    previewText: "text-white",
    previewHighlight: "text-sky-400",
  },
];

// Keep backward compatibility
export const CAPTION_STYLES: CaptionStyle[] = CAPTION_PRESETS.map((p) =>
  customSettingsToStyle(p.id, p.name, p.settings, p.previewBg, p.previewText, p.previewHighlight)
);

/**
 * Convert hex color (#RRGGBB) to ASS color format (&H00BBGGRR).
 * ASS uses BGR order with alpha prefix.
 */
export function hexToASS(hex: string, alpha: number = 0): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "&H00FFFFFF";
  const r = clean.substring(0, 2);
  const g = clean.substring(2, 4);
  const b = clean.substring(4, 6);
  const a = Math.round((alpha / 100) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return `&H${a}${b}${g}${r}`.toUpperCase();
}

/**
 * Convert ASS color (&HAABBGGRR) back to hex (#RRGGBB).
 */
export function assToHex(ass: string): string {
  const clean = ass.replace("&H", "").replace("&h", "");
  if (clean.length < 6) return "#FFFFFF";
  // Format: AABBGGRR — we need RR, GG, BB
  const offset = clean.length === 8 ? 2 : 0;
  const b = clean.substring(offset, offset + 2);
  const g = clean.substring(offset + 2, offset + 4);
  const r = clean.substring(offset + 4, offset + 6);
  return `#${r}${g}${b}`;
}

/**
 * Convert CustomCaptionSettings to a CaptionStyle for ASS generation.
 */
function customSettingsToStyle(
  id: string,
  name: string,
  settings: CustomCaptionSettings,
  previewBg: string = "bg-black",
  previewText: string = "text-white",
  previewHighlight: string = "text-yellow-400"
): CaptionStyle {
  const marginV = settings.position === "top" ? 60 : settings.position === "center" ? 400 : 60;
  const alignment = settings.position === "top" ? 8 : settings.position === "center" ? 5 : 2;

  return {
    id,
    name,
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    primaryColor: hexToASS(settings.textColor),
    highlightColor: hexToASS(settings.highlightColor),
    outlineColor: hexToASS(settings.outlineColor),
    shadowColor: settings.backgroundColor
      ? hexToASS(settings.backgroundColor, 100 - settings.backgroundOpacity)
      : hexToASS("#000000", 80),
    backgroundColor: settings.backgroundColor
      ? hexToASS(settings.backgroundColor, 100 - settings.backgroundOpacity)
      : "",
    outlineWidth: settings.outlineWidth,
    shadowDepth: settings.backgroundColor ? 0 : 2,
    bold: settings.bold,
    italic: settings.italic,
    alignment,
    marginV,
    wordsPerPage: settings.wordsPerPage,
    previewBg,
    previewText,
    previewHighlight,
  };
}

/**
 * Convert seconds to ASS timestamp format: H:MM:SS.cc (centiseconds)
 */
function toASSTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/**
 * Generate a complete ASS subtitle file with karaoke-style word highlighting.
 * Accepts either a CaptionStyle or CustomCaptionSettings.
 */
export function generateASS(
  words: WordTimestamp[],
  styleOrSettings: CaptionStyle | CustomCaptionSettings
): string {
  if (words.length === 0) return "";

  // Convert CustomCaptionSettings to CaptionStyle if needed
  const style: CaptionStyle = "id" in styleOrSettings
    ? styleOrSettings
    : customSettingsToStyle("custom", "Custom", styleOrSettings);

  // Determine if we should use a background box (BorderStyle 3)
  const hasBackground = style.backgroundColor && style.backgroundColor !== "";
  const borderStyle = hasBackground ? 3 : 1;
  const backColour = hasBackground ? style.backgroundColor : style.shadowColor;

  // Build header
  const header = `[Script Info]
Title: Captions
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${style.fontFamily},${style.fontSize},${style.primaryColor},${style.highlightColor},${style.outlineColor},${backColour},${style.bold ? -1 : 0},${style.italic ? -1 : 0},0,0,100,100,0,0,${borderStyle},${style.outlineWidth},${style.shadowDepth},${style.alignment},40,40,${style.marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  // Group words into pages
  const pages: WordTimestamp[][] = [];
  for (let i = 0; i < words.length; i += style.wordsPerPage) {
    pages.push(words.slice(i, i + style.wordsPerPage));
  }

  // Generate dialogue events for each page
  const events: string[] = [];

  for (const page of pages) {
    if (page.length === 0) continue;

    const pageEnd = page[page.length - 1].end;

    // For each word in the page, create a separate event where that word is highlighted
    for (let wordIdx = 0; wordIdx < page.length; wordIdx++) {
      const word = page[wordIdx];
      const wordStart = word.start;
      const wordEnd = wordIdx < page.length - 1
        ? page[wordIdx + 1].start
        : pageEnd;

      // Build the text with override tags
      const textParts = page.map((w, idx) => {
        if (idx === wordIdx) {
          return `{\\c${style.highlightColor}}${w.word}{\\c${style.primaryColor}}`;
        }
        return w.word;
      });

      const text = textParts.join(" ");
      events.push(
        `Dialogue: 0,${toASSTime(wordStart)},${toASSTime(wordEnd)},Default,,0,0,0,,${text}`
      );
    }
  }

  return `${header}\n${events.join("\n")}\n`;
}

/**
 * Generate ASS from CustomCaptionSettings (convenience function for API route).
 */
export function generateASSFromCustom(
  words: WordTimestamp[],
  settings: CustomCaptionSettings
): string {
  return generateASS(words, settings);
}

/**
 * Get a caption style by ID. Falls back to "bold-white".
 */
export function getCaptionStyle(styleId: string): CaptionStyle {
  return CAPTION_STYLES.find((s) => s.id === styleId) || CAPTION_STYLES[0];
}

/**
 * Get a preset by ID. Falls back to first preset.
 */
export function getCaptionPreset(presetId: string) {
  return CAPTION_PRESETS.find((p) => p.id === presetId) || CAPTION_PRESETS[0];
}
