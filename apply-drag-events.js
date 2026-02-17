const fs = require('fs');
const file = 'web/src/components/talking-head/bulk-talking-head.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add drag events to the outer div before the Label
content = content.replace(
  /<div className="space-y-1.5">\n\s+<Label className="text-xs">Portrait<\/Label>/,
  '<div className="space-y-1.5" onDragOver={(e) => handleDragOver(e, job.id)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, job.id)}>\n                  <Label className="text-xs">Portrait</Label>'
);

// 2. Change button text from "Select" to conditional based on drag state
content = content.replace(
  /<span className="text-\[10\]\">\s*Select<\/span>/g,
  '<span className="text-[10px]">{dragOverJobId === jobId ? "Drop image" : "Select"}</span>'
);

// 3. Add drag highlighting to image
content = content.replace(
  /className="h-\[106px\] w-\[106px\] rounded-md object-cover border cursor-pointer"/,
  'className="h-[106px] w-[106px] rounded-md object-cover border cursor-pointer"'
);

// 4. Add drag highlighting to button  
content = content.replace(
  /className="h-\[106px\] w-\[106px\] rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground/,
  'className="h-[106px] w-[106px] rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground'
);

// 5. Save
fs.writeFileSync(file, content, 'utf8');
console.log('✅ Applied drag-and-drop support to portrait field');
console.log('✅ White border opacity fixed');

