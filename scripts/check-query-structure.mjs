import fs from 'node:fs';
import path from 'node:path';

const barrelPath = path.join('lib', 'db', 'queries.ts');
const queryDir = path.join('lib', 'db', 'queries');
const maxModuleLines = 400;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const barrelLines = fs.readFileSync(barrelPath, 'utf8').split(/\r?\n/);
const barrelBody = barrelLines.filter((line) => {
  const trimmed = line.trim();
  return trimmed !== '' && !trimmed.startsWith('/**') && trimmed !== '*/' && !trimmed.startsWith('*');
});

if (barrelBody.length === 0) {
  fail('Expected lib/db/queries.ts to re-export domain modules.');
}

for (const line of barrelBody) {
  if (!line.startsWith('export * from ')) {
    fail('lib/db/queries.ts should stay a pure barrel. Invalid line: ' + line);
  }
}

for (const entry of fs.readdirSync(queryDir)) {
  if (!entry.endsWith('.ts')) continue;

  const filePath = path.join(queryDir, entry);
  const lineCount = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).length;
  if (lineCount > maxModuleLines) {
    fail(filePath + ' has ' + lineCount + ' lines; limit is ' + maxModuleLines + '. Split it further before merging.');
  }
}

console.log('Query structure checks passed.');
