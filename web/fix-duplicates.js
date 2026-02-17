const fs = require('fs');
const file = 'src/components/talking-head/bulk-talking-head.tsx';
let content = fs.readFileSync(file, 'utf8');
let lineCount = 0;

// Split into lines and process
const lines = content.split('\n');
const fixedLines = [];
const seenDeclarations = new Set();
const seenPatterns = [
  /\bconst\s*\[([^]]+)\]\s*=\s*useState/,
  /\bconst\s*\[([^]]+)\]\s*=\s*useState/,
  /\blet\s+\[[^]]+\]\s*=\s*useState/,
  /\bconst\s+([^}]+)\s*=\s*useState<[^>]+>;?/,
];

let duplicateLines = 0;

lines.forEach((line, index) => {
  const lineNum = index + 1;
  let isDuplicate = false;

  // Check for duplicate useState declarations
  const stateMatch = line.match(/const\s*(\[[^\]]+\])?(\s*=\s*useState<[^>]+)?/);
  
  if (stateMatch) {
    const declName = stateMatch[1] || '';
    if (seenDeclarations.has(declName)) {
      console.log(`⚠️  Line ${lineNum}: Duplicate declaration: ${declName}`);
      duplicateLines++;
      isDuplicate = true;
    } else {
      seenDeclarations.add(declName);
    }
  }

  // Keep clean lines, skip duplicates
  if (!isDuplicate) {
    fixedLines.push(line);
  }
});

if (duplicateLines > 0 && duplicateLines < 10) {
  const fixedContent = fixedLines.join('\n');
  fs.writeFileSync(file, fixedContent, 'utf8');
  console.log(`✅ Removed ${duplicateLines} duplicate declarations`);
  console.log(`✅ Cleaned from duplicates, kept ${fixedLines.length} lines`);
} else if (duplicateLines >= 10) {
  console.error('❌ Too many duplicates, using backup restore');
  process.exit(1);
}

process.exit(safe ? 0 : 1);
