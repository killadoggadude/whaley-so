"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import type { TranscriptionResult } from "@/types";

interface TranscriptionResultsProps {
  results: TranscriptionResult[];
}

export function TranscriptionResults({ results }: TranscriptionResultsProps) {
  const copyTranscript = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const exportCsv = () => {
    const header = "URL,Platform,Transcript,Word Count\n";
    const rows = results
      .map(
        (r) =>
          `"${r.url}","${r.platform}","${r.transcript.replace(/"/g, '""')}",${r.word_count}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcriptions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcriptions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (results.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Results ({results.length})
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportJson}>
            <Download className="h-4 w-4 mr-1" />
            JSON
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">URL</TableHead>
              <TableHead className="w-[100px]">Platform</TableHead>
              <TableHead>Transcript</TableHead>
              <TableHead className="w-[80px]">Words</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result, index) => (
              <TableRow key={index}>
                <TableCell className="font-mono text-xs truncate max-w-[200px]">
                  {result.url}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{result.platform}</Badge>
                </TableCell>
                <TableCell>
                  {result.error ? (
                    <span className="text-destructive text-sm">
                      {result.error}
                    </span>
                  ) : (
                    <p className="text-sm line-clamp-3">{result.transcript}</p>
                  )}
                </TableCell>
                <TableCell className="text-sm">{result.word_count}</TableCell>
                <TableCell>
                  {result.transcript && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyTranscript(result.transcript)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
