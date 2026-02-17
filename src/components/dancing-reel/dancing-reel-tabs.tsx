"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SingleDancingReel } from "./single-dancing-reel";
import { BulkDancingReel } from "./bulk-dancing-reel";
import { Music, Layers } from "lucide-react";
import type { AiModelWithImages } from "@/types";

interface DancingReelTabsProps {
  aiModels: AiModelWithImages[];
}

export function DancingReelTabs({ aiModels }: DancingReelTabsProps) {
  return (
    <Tabs defaultValue="single" className="space-y-4">
      <TabsList>
        <TabsTrigger value="single" className="gap-1.5">
          <Music className="h-3.5 w-3.5" />
          Single Video
        </TabsTrigger>
        <TabsTrigger value="bulk" className="gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          Bulk Generate
        </TabsTrigger>
      </TabsList>

      <TabsContent value="single">
        <SingleDancingReel aiModels={aiModels} />
      </TabsContent>

      <TabsContent value="bulk">
        <BulkDancingReel aiModels={aiModels} />
      </TabsContent>
    </Tabs>
  );
}
