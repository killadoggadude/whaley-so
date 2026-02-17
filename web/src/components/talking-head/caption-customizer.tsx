"use client";

import { useState } from "react";
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
import { CheckCircle2, RotateCcw, Palette } from "lucide-react";
import {
  CAPTION_PRESETS,
  CAPTION_FONTS,
  DEFAULT_CAPTION_SETTINGS,
} from "@/lib/caption-styles";
import type { CustomCaptionSettings } from "@/lib/caption-styles";

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

  return (
    <div className="space-y-4">
      {/* Presets row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Presets</Label>
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
        <TooltipProvider>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {CAPTION_PRESETS.map((preset) => (
              <Tooltip key={preset.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className={cn(
                      "relative flex-shrink-0 rounded-md border-2 px-2.5 py-1.5 text-xs font-medium transition-all",
                      activePresetId === preset.id
                        ? "border-accent-blue bg-accent-blue/5"
                        : "border-transparent bg-muted/50 hover:border-muted-foreground/30"
                    )}
                  >
                    {activePresetId === preset.id && (
                      <CheckCircle2 className="absolute -top-1 -right-1 h-3.5 w-3.5 text-accent-blue" />
                    )}
                    {preset.name}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="p-0">
                  <MiniPreview presetSettings={preset.settings} />
                </TooltipContent>
              </Tooltip>
            ))}
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
              <Input
                type="color"
                value={settings.textColor}
                onChange={(e) => update({ textColor: e.target.value })}
                className="h-8 w-10 p-0.5 cursor-pointer border rounded"
              />
            </div>
            <Input
              value={settings.textColor}
              onChange={(e) => update({ textColor: e.target.value })}
              className="h-8 text-xs flex-1 font-mono"
              placeholder="#FFFFFF"
            />
          </div>
        </div>

        {/* Highlight color */}
        <div className="space-y-1.5">
          <Label className="text-xs">Highlight Color</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={settings.highlightColor}
              onChange={(e) => update({ highlightColor: e.target.value })}
              className="h-8 w-10 p-0.5 cursor-pointer border rounded"
            />
            <Input
              value={settings.highlightColor}
              onChange={(e) => update({ highlightColor: e.target.value })}
              className="h-8 text-xs flex-1 font-mono"
              placeholder="#FFFF00"
            />
          </div>
        </div>

        {/* Outline color */}
        <div className="space-y-1.5">
          <Label className="text-xs">Outline Color</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={settings.outlineColor}
              onChange={(e) => update({ outlineColor: e.target.value })}
              className="h-8 w-10 p-0.5 cursor-pointer border rounded"
            />
            <Input
              value={settings.outlineColor}
              onChange={(e) => update({ outlineColor: e.target.value })}
              className="h-8 text-xs flex-1 font-mono"
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Outline width */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Outline Width</Label>
            <span className="text-[10px] text-muted-foreground">{settings.outlineWidth}px</span>
          </div>
          <Slider
            value={[settings.outlineWidth]}
            onValueChange={([v]) => update({ outlineWidth: v })}
            min={0}
            max={5}
            step={1}
            className="w-full"
          />
        </div>

        {/* Background color */}
        <div className="space-y-1.5">
          <Label className="text-xs">Background</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={settings.backgroundColor || "#000000"}
              onChange={(e) => update({ backgroundColor: e.target.value })}
              className="h-8 w-10 p-0.5 cursor-pointer border rounded"
            />
            <Input
              value={settings.backgroundColor}
              onChange={(e) => update({ backgroundColor: e.target.value })}
              className="h-8 text-xs flex-1 font-mono"
              placeholder="Empty = no bg"
            />
            {settings.backgroundColor && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => update({ backgroundColor: "" })}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Background opacity (only when bg is set) */}
        {settings.backgroundColor && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Background Opacity</Label>
              <span className="text-[10px] text-muted-foreground">{settings.backgroundOpacity}%</span>
            </div>
            <Slider
              value={[settings.backgroundOpacity]}
              onValueChange={([v]) => update({ backgroundOpacity: v })}
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        )}

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
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Caption Style</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-xs"
        >
          {expanded ? "Collapse" : "Customize"}
        </Button>
      </div>

      {/* Quick presets always visible */}
      <TooltipProvider>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CAPTION_PRESETS.map((preset) => {
            const isActive = JSON.stringify(settings) === JSON.stringify(preset.settings);
            return (
              <Tooltip key={preset.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onChange({ ...preset.settings })}
                    className={cn(
                      "relative flex-shrink-0 rounded-md border-2 px-2 py-1 text-[10px] font-medium transition-all",
                      isActive
                        ? "border-accent-blue bg-accent-blue/5"
                        : "border-transparent bg-muted/50 hover:border-muted-foreground/30"
                    )}
                  >
                    {isActive && (
                      <Badge
                        variant="default"
                        className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 p-0 flex items-center justify-center"
                      >
                        <CheckCircle2 className="h-2.5 w-2.5" />
                      </Badge>
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
        </div>
      </TooltipProvider>

      {expanded && (
        <CaptionCustomizer settings={settings} onChange={onChange} compact />
      )}
    </div>
  );
}
