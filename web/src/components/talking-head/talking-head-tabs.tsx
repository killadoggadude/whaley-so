"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TalkingHeadWizard } from "./talking-head-wizard";
import { BulkTalkingHead } from "./bulk-talking-head";
import { Video, Layers } from "lucide-react";
import type { AiModelWithImages } from "@/types";

interface TalkingHeadTabsProps {
  aiModels: AiModelWithImages[];
  prefillVideoUrl?: string;
}

export function TalkingHeadTabs({ aiModels, prefillVideoUrl }: TalkingHeadTabsProps) {
  return (
    <Tabs defaultValue="single" className="space-y-4">
      <TabsList>
        <TabsTrigger value="single" className="gap-1.5">
          <Video className="h-3.5 w-3.5" />
          Single Video
        </TabsTrigger>
        <TabsTrigger value="bulk" className="gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          Bulk Generate
        </TabsTrigger>
      </TabsList>

      <TabsContent value="single">
        <TalkingHeadWizard aiModels={aiModels} prefillVideoUrl={prefillVideoUrl} />
      </TabsContent>

      <TabsContent value="bulk">
        <BulkTalkingHead aiModels={aiModels} />
      </TabsContent>
    </Tabs>
  );
}
