import fs from 'fs';
import path from 'path';

const checks = [
  { root: 'lib', maxLines: 550, extensions: new Set(['.ts', '.tsx']) },
  { root: 'lib/db/queries.ts', maxLines: 25, extensions: new Set(['.ts']) }
];

function walk(dirPath, extensions) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath, extensions));
      continue;
    }

    if (extensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function countLines(filePath) {
  return fs.readFileSync(filePath, 'utf8').split('\n').length;
}

const violations = [];

for (const check of checks) {
  const absoluteRoot = path.join(process.cwd(), check.root);
  const stats = fs.statSync(absoluteRoot);
  const files = stats.isDirectory() ? walk(absoluteRoot, check.extensions) : [absoluteRoot];

  for (const filePath of files) {
    const lineCount = countLines(filePath);
    if (lineCount > check.maxLines) {
      violations.push({
        file: path.relative(process.cwd(), filePath),
        lineCount,
        maxLines: check.maxLines
      });
    }
  }
}

if (violations.length > 0) {
  console.error('Architecture check failed. Oversized files detected:');
  for (const violation of violations) {
    console.error(
      `- ${violation.file}: ${violation.lineCount} lines (max ${violation.maxLines})`
    );
  }
  process.exit(1);
}

console.log('Architecture check passed');
