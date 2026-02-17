"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CheckCircle2, RotateCcw, Palette, User, X, Save, RefreshCw } from "lucide-react";
import {
  CAPTION_PRESETS,
  CAPTION_FONTS,
  DEFAULT_CAPTION_SETTINGS,
} from "@/lib/caption-styles";
import type { CustomCaptionSettings } from "@/lib/caption-styles";
import type { CaptionPreset } from "@/types";
import {
  getCaptionPresetsAction,
  saveCaptionPresetAction,
  deleteCaptionPresetAction,
} from "@/app/dashboard/tools/talking-head/caption-actions";

// Mini tooltip preview for preset buttons
function MiniPreview({ presetSettings }: { presetSettings: CustomCaptionSettings }) {
  const tooltipWords = ["Hello", "World"];
  const tooltipHighlightIdx = 1;

  return (
    <div
      className="relative rounded-lg overflow-hidden bg-gradient-to-b from-gray-800 via-gray-900 to-black"
      style={{ width: "70px", height: "120px" }}
    >
      {/* Caption preview positioned based on verticalPosition */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center px-2"
        style={{ top: `${presetSettings.verticalPosition}%`, transform: "translateY(-50%)" }}
      >
        <div
          className="inline-block px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: presetSettings.backgroundColor
              ? `${presetSettings.backgroundColor}${Math.round((presetSettings.backgroundOpacity / 100) * 255).toString(16).padStart(2, "0")}`
              : "transparent",
          }}
        >
          <p
            className="text-center leading-tight"
            style={{
              fontFamily: presetSettings.fontFamily,
              fontSize: `${Math.max(8, presetSettings.fontSize * 0.18)}px`,
              fontWeight: presetSettings.bold ? 700 : 400,
              fontStyle: presetSettings.italic ? "italic" : "normal",
              textShadow: presetSettings.outlineWidth > 0
                ? `0 0 ${presetSettings.outlineWidth * 1.5}px ${presetSettings.outlineColor},
                   ${presetSettings.outlineWidth}px ${presetSettings.outlineWidth}px 0 ${presetSettings.outlineColor},
                   -${presetSettings.outlineWidth}px -${presetSettings.outlineWidth}px 0 ${presetSettings.outlineColor},
                   ${presetSettings.outlineWidth}px -${presetSettings.outlineWidth}px 0 ${presetSettings.outlineColor},
                   -${presetSettings.outlineWidth}px ${presetSettings.outlineWidth}px 0 ${presetSettings.outlineColor}`
                : "none",
              letterSpacing: "0.02em",
            }}
          >
            {tooltipWords.map((word, idx) => (
              <span
                key={idx}
                style={{
                  color: idx === tooltipHighlightIdx ? presetSettings.highlightColor : presetSettings.textColor,
                }}
              >
                {word}{" "}
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
}

interface CaptionCustomizerProps {
  settings: CustomCaptionSettings;
  onChange: (settings: CustomCaptionSettings) => void;
  /** Compact mode shows fewer controls for inline usage */
  compact?: boolean;
}

export function CaptionCustomizer({
  settings,
  onChange,
  compact = false,
}: CaptionCustomizerProps) {
  const [activePresetId, setActivePresetId] = useState<string | null>("classic-tiktok");

  const update = (partial: Partial<CustomCaptionSettings>) => {
    setActivePresetId(null); // User customized — no preset active
    onChange({ ...settings, ...partial });
  };

  const applyPreset = (presetId: string) => {
    const preset = CAPTION_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setActivePresetId(presetId);
      onChange({ ...preset.settings });
    }
  };

  const resetToDefault = () => {
    setActivePresetId("classic-tiktok");
    onChange({ ...DEFAULT_CAPTION_SETTINGS });
  };

  // Preview words
  const previewWords = ["This", "is", "a", "caption", "preview"];
  const visibleWords = previewWords.slice(0, Math.min(settings.wordsPerPage, previewWords.length));
  const highlightIdx = Math.min(2, visibleWords.length - 1);

  // Saved presets state
  const [savedPresets, setSavedPresets] = useState<CaptionPreset[]>([]);
  const [showPresetSave, setShowPresetSave] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isReloadingPresets, setIsReloadingPresets] = useState(false);

  // Fetch saved presets on mount
  useEffect(() => {
    getCaptionPresetsAction().then(({ presets }) => setSavedPresets(presets));
  }, []);

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;

    setIsSaving(true);
    try {
      const { preset } = await saveCaptionPresetAction(presetName.trim(), settings as any);
      if (preset) {
        setShowPresetSave(false);
        setPresetName("");
        setIsReloadingPresets(true);
        const { presets: updated } = await getCaptionPresetsAction();
        setSavedPresets(updated);
        setIsReloadingPresets(false);
      }
    } catch {
      // Error handled by action
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePreset = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteCaptionPresetAction(id);
      setSavedPresets((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // Error handled by action
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Presets row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Presets</Label>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPresetSave(true)}
              className="h-6 px-2 text-xs text-muted-foreground"
              disabled={isSaving || isReloadingPresets}
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefault}
              className="h-6 px-2 text-xs text-muted-foreground"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {showPresetSave && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="h-8 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSavePreset();
                if (e.key === "Escape") setShowPresetSave(false);
              }}
            />
            <Button
              size="sm"
              onClick={handleSavePreset}
              disabled={!presetName.trim() || isSaving}
              className="h-8"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowPresetSave(false);
                setPresetName("");
              }}
              className="h-8"
            >
              Cancel
            </Button>
          </div>
        )}

        <TooltipProvider>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {/* Built-in presets */}
            {CAPTION_PRESETS.map((preset) => {
              const isActive = activePresetId === preset.id || JSON.stringify(settings) === JSON.stringify(preset.settings);
              return (
                <Tooltip key={preset.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className={cn(
                        "relative flex-shrink-0 rounded-md border-2 px-2.5 py-1.5 text-xs font-medium transition-all",
                        isActive
                          ? "border-accent-blue bg-accent-blue/5"
                          : "border-solid border-border bg-muted/50 hover:border-muted-foreground/30"
                      )}
                    >
                      {isActive && (
                        <CheckCircle2 className="absolute -top-1 -right-1 h-3.5 w-3.5 text-accent-blue" />
                      )}
                      {preset.name}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="p-0">
                    <MiniPreview presetSettings={preset.settings} />
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* Saved user presets */}
            {savedPresets.map((preset) => {
              const presetSettings = preset.settings as unknown as CustomCaptionSettings;
              const isActive = activePresetId === `saved-${preset.id}` || JSON.stringify(settings) === JSON.stringify(presetSettings);
              return (
                <Tooltip key={preset.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePresetId(`saved-${preset.id}`);
                        onChange({ ...presetSettings });
                      }}
className={cn(
                          "relative flex-shrink-0 rounded-md border-2 px-2.5 py-1.5 text-xs font-medium transition-all group",
                          isActive
                            ? "border-accent-blue bg-accent-blue/5"
                            : "border-dashed border-border bg-muted/50 hover:border-muted-foreground/30"
                        )}
                      >
                      {isActive && (
                        <CheckCircle2 className="absolute -top-1 -right-1 h-3.5 w-3.5 text-accent-blue" />
                      )}
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>{preset.name}</span>
                      </div>
                      {deletingId === preset.id ? (
                        <RefreshCw className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground animate-spin" />
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePreset(preset.id);
                          }}
                          className="hidden group-hover:flex absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground items-center justify-center transition-opacity"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="p-0">
                    <MiniPreview presetSettings={presetSettings} />
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Live preview */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Preview</Label>
        <div
          className="relative rounded-lg overflow-hidden"
          style={{ aspectRatio: "9/16", maxHeight: compact ? "180px" : "240px" }}
        >
          {/* Dark video-like background */}
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 via-gray-900 to-black" />

          {/* Caption preview positioned based on verticalPosition */}
          <div
            className="absolute left-0 right-0 flex items-center justify-center px-4"
            style={{ top: `${settings.verticalPosition}%`, transform: "translateY(-50%)" }}
          >
            <div
              className="inline-block px-3 py-1.5 rounded"
              style={{
                backgroundColor: settings.backgroundColor
                  ? `${settings.backgroundColor}${Math.round((settings.backgroundOpacity / 100) * 255).toString(16).padStart(2, "0")}`
                  : "transparent",
              }}
            >
              <p
                className="text-center leading-tight"
                style={{
                  fontFamily: settings.fontFamily,
                  fontSize: `${Math.max(10, settings.fontSize * (compact ? 0.22 : 0.28))}px`,
                  fontWeight: settings.bold ? 700 : 400,
                  fontStyle: settings.italic ? "italic" : "normal",
                  textShadow: settings.outlineWidth > 0
                    ? `0 0 ${settings.outlineWidth * 1.5}px ${settings.outlineColor},
                       ${settings.outlineWidth}px ${settings.outlineWidth}px 0 ${settings.outlineColor},
                       -${settings.outlineWidth}px -${settings.outlineWidth}px 0 ${settings.outlineColor},
                       ${settings.outlineWidth}px -${settings.outlineWidth}px 0 ${settings.outlineColor},
                       -${settings.outlineWidth}px ${settings.outlineWidth}px 0 ${settings.outlineColor}`
                    : "none",
                  letterSpacing: "0.02em",
                }}
              >
                {visibleWords.map((word, idx) => (
                  <span
                    key={idx}
                    style={{
                      color: idx === highlightIdx ? settings.highlightColor : settings.textColor,
                    }}
                  >
                    {word}{" "}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customization controls */}
      <div className={cn("space-y-3", compact && "grid grid-cols-2 gap-x-4 gap-y-3 space-y-0")}>
        {/* Font */}
        <div className="space-y-1.5">
          <Label className="text-xs">Font</Label>
          <Select value={settings.fontFamily} onValueChange={(v) => update({ fontFamily: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAPTION_FONTS.map((font) => (
                <SelectItem key={font} value={font}>
                  <span style={{ fontFamily: font }}>{font}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Font size */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Size</Label>
            <span className="text-[10px] text-muted-foreground">{settings.fontSize}px</span>
          </div>
          <Slider
            value={[settings.fontSize]}
            onValueChange={([v]) => update({ fontSize: v })}
            min={24}
            max={80}
            step={2}
            className="w-full"
          />
        </div>

        {/* Text color */}
        <div className="space-y-1.5">
          <Label className="text-xs">Text Color</Label>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="color"
                value={settings.textColor}
                onChange={(e) => update({ textColor: e.target.value })}
                className="opacity-0 absolute inset-0 cursor-pointer"
              />
              <div
                className="h-6 w-8 rounded border border-border"
                style={{ backgroundColor: settings.textColor }}
              />
            </div>
            <Input
              type="text"
              value={settings.textColor}
              onChange={(e) => update({ textColor: e.target.value })}
              className="w-20 h-8 text-xs font-mono"
            />
          </div>
        </div>

        {/* Highlight color */}
        <div className="space-y-1.5">
          <Label className="text-xs">Highlight</Label>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="color"
                value={settings.highlightColor}
                onChange={(e) => update({ highlightColor: e.target.value })}
                className="opacity-0 absolute inset-0 cursor-pointer"
              />
              <div
                className="h-6 w-8 rounded border border-border"
                style={{ backgroundColor: settings.highlightColor }}
              />
            </div>
            <Input
              type="text"
              value={settings.highlightColor}
              onChange={(e) => update({ highlightColor: e.target.value })}
              className="w-20 h-8 text-xs font-mono"
            />
          </div>
        </div>

        {/* Background color & opacity */}
        <div className="space-y-1.5">
          <Label className="text-xs">Background</Label>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="color"
                value={settings.backgroundColor || "#000000"}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                className="opacity-0 absolute inset-0 cursor-pointer"
              />
              <div
                className="h-6 w-8 rounded border border-border"
                style={{ backgroundColor: settings.backgroundColor || "#000000" }}
              />
            </div>
            <Input
              type="text"
              value={settings.backgroundColor}
              onChange={(e) => update({ backgroundColor: e.target.value })}
              className="w-20 h-8 text-xs font-mono"
            />
            <span className="text-[10px] text-muted-foreground">{settings.backgroundOpacity}%</span>
            <Slider
              value={[settings.backgroundOpacity]}
              onValueChange={([v]) => update({ backgroundOpacity: v })}
              min={10}
              max={100}
              step={5}
              className="flex-1"
            />
          </div>
        </div>

        {/* Outline color & width */}
        <div className="space-y-1.5">
          <Label className="text-xs">Outline</Label>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="color"
                value={settings.outlineColor}
                onChange={(e) => update({ outlineColor: e.target.value })}
                className="opacity-0 absolute inset-0 cursor-pointer"
              />
              <div
                className="h-6 w-8 rounded border border-border"
                style={{ backgroundColor: settings.outlineColor }}
              />
            </div>
            <Slider
              value={[settings.outlineWidth]}
              onValueChange={([v]) => update({ outlineWidth: v })}
              min={0}
              max={5}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground">{settings.outlineWidth}px</span>
          </div>
        </div>

        {/* Words per page */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Words per Page</Label>
            <span className="text-[10px] text-muted-foreground">{settings.wordsPerPage}</span>
          </div>
          <Slider
            value={[settings.wordsPerPage]}
            onValueChange={([v]) => update({ wordsPerPage: v })}
            min={2}
            max={8}
            step={1}
            className="w-full"
          />
        </div>

        {/* Position */}
        <div className="space-y-1.5">
          <Label className="text-xs">Position</Label>
          <Select value={settings.position} onValueChange={(v) => {
            // Sync dropdown with verticalPosition
            const newPos = v as CustomCaptionSettings["position"];
            const vPos = newPos === "top" ? 20 : newPos === "center" ? 50 : 70;
            update({ position: newPos, verticalPosition: vPos });
          }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom">Bottom</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="top">Top</SelectItem>
            </SelectContent>
          </Select>

          {/* Vertical position slider (0 = top, 100 = bottom) */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-muted-foreground w-3">Top</span>
            <Slider
              value={[settings.verticalPosition]}
              onValueChange={([v]) => {
                // Update verticalPosition and sync dropdown to nearest position
                const pos = v <= 33 ? "top" : v <= 66 ? "center" : "bottom";
                update({ verticalPosition: v, position: pos });

                // Also update internal position tracking if slider changes outside preset zones
                activePresetId && setActivePresetId(null);
              }}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-3">Btm</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-muted-foreground">{Math.round(settings.verticalPosition)}%</span>
          </div>
        </div>

        {/* Bold & Italic toggles */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.bold}
              onCheckedChange={(v) => update({ bold: v })}
              className="scale-75"
            />
            <Label className="text-xs font-bold">Bold</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.italic}
              onCheckedChange={(v) => update({ italic: v })}
              className="scale-75"
            />
            <Label className="text-xs italic">Italic</Label>
          </div>
        </div>
      </div>

      {activePresetId && (
        <div className="flex items-center gap-1.5">
          <Palette className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            Using preset: {CAPTION_PRESETS.find((p) => p.id === activePresetId)?.name}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline caption customizer for use inside other components.
 * Shows a collapsible panel with just the key controls.
 */
export function CaptionCustomizerInline({
  settings,
  onChange,
}: {
  settings: CustomCaptionSettings;
  onChange: (settings: CustomCaptionSettings) => void;
}) {
  const [savedPresets, setSavedPresets] = useState<CaptionPreset[]>([]);
  const [showPresetSave, setShowPresetSave] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch saved presets on mount
  useEffect(() => {
    getCaptionPresetsAction().then(({ presets }) => setSavedPresets(presets));
  }, []);

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;

    setIsSaving(true);
    try {
      const { preset } = await saveCaptionPresetAction(presetName.trim(), settings as any);
      if (preset) {
        setShowPresetSave(false);
        setPresetName("");
        const { presets: updated } = await getCaptionPresetsAction();
        setSavedPresets(updated);
      }
    } catch {
      // Error handled by action
    } finally {
      setIsSaving(false);
    }
  };

  // Use full CaptionCustomizer when expanded is needed
  // For inline use, just render everything directly
  return (
    <CaptionCustomizer settings={settings} onChange={onChange} compact />
  );
}
