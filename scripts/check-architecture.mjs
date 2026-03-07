import fs from 'fs';
import path from 'path';

const checks = [
  { root: 'lib', maxLines: 550, extensions: new Set(['.ts', '.tsx']) },
  { root: 'lib/db/queries.ts', maxLines: 25, extensions: new Set(['.ts']) },
  { root: 'lib/application/cohorts.ts', maxLines: 25, extensions: new Set(['.ts']) },
  { root: 'lib/utils.ts', maxLines: 25, extensions: new Set(['.ts']) },
  { root: 'lib/engine/decision.ts', maxLines: 40, extensions: new Set(['.ts']) },
  { root: 'lib/engine/execution.ts', maxLines: 40, extensions: new Set(['.ts']) },
  { root: 'lib/engine/resolution.ts', maxLines: 40, extensions: new Set(['.ts']) },
  { root: 'app/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/admin/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/api/admin/export/route.ts', maxLines: 80, extensions: new Set(['.ts']) },
  { root: 'app/cohorts/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/cohorts/[id]/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/cohorts/[id]/models/[modelId]/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/markets/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/markets/[id]/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/models/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/models/[id]/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'features', maxLines: 350, extensions: new Set(['.ts', '.tsx']) }
];

const boundaryRules = [
  {
    root: 'features',
    extensions: new Set(['.ts', '.tsx']),
    disallow: [
      { prefix: '@/app/', reason: 'feature modules must not import route files directly' }
    ]
  },
  {
    root: 'lib/application',
    extensions: new Set(['.ts', '.tsx']),
    disallow: [
      { prefix: 'next/', reason: 'application modules must stay framework-agnostic' },
      { prefix: '@/app/', reason: 'application modules must not depend on route handlers or pages' }
    ]
  },
  {
    root: 'app/api/cohorts',
    extensions: new Set(['.ts']),
    disallow: [
      { prefix: '@/lib/db', reason: 'cohort routes must go through the application layer' },
      { prefix: '@/lib/db/', reason: 'cohort routes must go through the application layer' },
      { prefix: '@/lib/db/queries', reason: 'cohort routes must go through the application layer' }
    ]
  },
  {
    root: 'app/api/models',
    extensions: new Set(['.ts']),
    disallow: [
      { prefix: '@/lib/db', reason: 'model routes must go through the application layer' },
      { prefix: '@/lib/db/', reason: 'model routes must go through the application layer' },
      { prefix: '@/lib/db/queries', reason: 'model routes must go through the application layer' }
    ]
  },
  {
    root: 'app/api/admin/export',
    extensions: new Set(['.ts']),
    disallow: [
      { prefix: '@/lib/db', reason: 'admin export routes must go through the application layer' },
      { prefix: '@/lib/db/', reason: 'admin export routes must go through the application layer' },
      { prefix: '@/lib/db/queries', reason: 'admin export routes must go through the application layer' }
    ]
  }
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

function collectImports(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const imports = [];
  const patterns = [
    /from\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      imports.push(match[1]);
    }
  }

  return imports;
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

for (const rule of boundaryRules) {
  const absoluteRoot = path.join(process.cwd(), rule.root);
  if (!fs.existsSync(absoluteRoot)) {
    continue;
  }

  const stats = fs.statSync(absoluteRoot);
  const files = stats.isDirectory() ? walk(absoluteRoot, rule.extensions) : [absoluteRoot];

  for (const filePath of files) {
    const imports = collectImports(filePath);

    for (const importPath of imports) {
      const disallowed = rule.disallow.find(({ prefix }) => importPath.startsWith(prefix));
      if (!disallowed) {
        continue;
      }

      violations.push({
        file: path.relative(process.cwd(), filePath),
        importPath,
        reason: disallowed.reason
      });
    }
  }
}

if (violations.length > 0) {
  console.error('Architecture check failed. Violations detected:');
  for (const violation of violations) {
    if ('lineCount' in violation) {
      console.error(
        `- ${violation.file}: ${violation.lineCount} lines (max ${violation.maxLines})`
      );
      continue;
    }

    console.error(
      `- ${violation.file}: disallowed import "${violation.importPath}" (${violation.reason})`
    );
  }
  process.exit(1);
}

console.log('Architecture check passed');
