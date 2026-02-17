const fs = require('fs');
const file = 'src/components/talking-head/bulk-talking-head.tsx';

let content = fs.readFileSync(file, 'utf-8');
const errors = [
  { pattern: 'dragOverJobId', desc: 'dragOverJobId state variable' },
  { pattern: 'handleDragOver', desc: 'drag-related handlers' },
  { pattern: 'border-destructive/30', desc: 'white border opacity issue' }
];

let foundErrors = 0;
errors.forEach(err => {
  if (content.includes(err.pattern)) {
    console.log('❌ Found:', err.desc);
    foundErrors++;
  } else {
    console.log('✓ Clean:', err.desc);
  }
});

console.log('📊 Status:', foundErrors === 0 ? 'RESTORED CLEAN - READY TO APPLY CHANGES' : 'NEEDS RESTORE');

const testBuild = content.includes('dragOverJobId') ? 1 : 0;
const testBorder = content.includes('border-destructive/30') ? 1 : 0;

console.log('Diagnostics:');
console.log('-', testBuild > 0 ? 'dragOverJobId exists' : 'dragOverJobId clean');
console.log('-', testBorder > 0 ? 'border opacity issue exists' : 'border opacity clean');

process.exit(foundErrors || testBuild > 0 ? 1 : 0);
