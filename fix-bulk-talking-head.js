const fs = require('fs');
const path = 'web/src/components/talking-head/bulk-talking-head.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix white border opacity issue
content = content.replace(
  /job\.status === "completed" && "border-green-500\/30 bg-green-500\/5",\s*job\.status === "failed" && "border-destructive\/30 bg-destructive\/5"/g,
  'job.status === "completed" && "border-green-500 bg-green-500/5", job.status === "failed" && "border-destructive bg-destructive/5"'
);

// 2. Add drag events to portrait section (replace lines 617-650)
const portraitSectionStart = '                <div className="space-y-1.5">\n                  <Label className="text-xs">Portrait</Label>';
const portraitSectionEnd = '                </div>';
const portraitSectionRegex = new RegExp(
  escapeRegExp(portraitSectionStart) + '[\\s\\S]*?' + escapeRegExp(portraitSectionEnd),
  'g'
);

const newPortraitSection = \`                <div className="cn(
                  "space-y-1.5 transition-all",
                  dragOverJobId === jobId && "scale-[1.02]"
                )}>
                  <Label className="text-xs">Portrait</Label>
                  \${job.imageUrl ? (
                    <div className="relative group">
                      <div
                        className={cn(
                          "rounded-lg overflow-hidden cursor-pointer transition-all",
                          dragOverJobId === jobId
                            ? "ring-2 ring-accent-blue ring-offset-2"
                            : "hover:ring-2 hover:ring-accent-blue/50"
                        )}
                        onClick={() => !running && setPickerJobId(job.id)}
                      >
                        <img
                          src={job.imageUrl}
                          alt="Selected"
                          className="h-[106px] w-[106px] object-cover"
                        />
                      </div>
                      {!running && (
                        <button
                          type="button"
                          onClick={() =>
                            updateJob(job.id, { imageId: null, imageUrl: null })
                          }
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPickerJobId(job.id)}
                      disabled={running}
                      className={cn(
                        "h-[106px] w-[106px] rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground transition-all",
                        dragOverJobId === jobId
                          ? "border-accent-blue bg-accent-blue/10"
                          : "hover:border-accent-blue/50 hover:text-accent-blue"
                      )}
                    >
                      <ImageIcon className="h-5 w-5" />
                      <span className="text-[10px]">
                        {dragOverJobId === jobId ? "Drop image" : "Select"}
                      </span>
                    </button>
                  )}
                </div>\`;

content = content.replace(portraitSectionRegex, newPortraitSection);

fs.writeFileSync(path, content, 'utf-8');
console.log('✅ Modified portrait section for drag-and-drop');
console.log('✅ Fixed white border opacity issue');

function escapeRegExp(string) {
  return string.replace(/[.*+?^\\${}()|\\[\\]\\\\]/g, '\\\\$&');
}
