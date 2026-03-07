import fs from 'fs';
import path from 'path';

const checks = [
  { root: 'lib', maxLines: 550, extensions: new Set(['.ts', '.tsx']) },
  { root: 'lib/db/queries.ts', maxLines: 25, extensions: new Set(['.ts']) },
  { root: 'lib/db/index.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'lib/constants/models.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'lib/application/cron.ts', maxLines: 25, extensions: new Set(['.ts']) },
  { root: 'lib/application/cohorts.ts', maxLines: 25, extensions: new Set(['.ts']) },
  { root: 'lib/application/cohorts/shared/index.ts', maxLines: 25, extensions: new Set(['.ts']) },
  { root: 'lib/application/markets/index.ts', maxLines: 25, extensions: new Set(['.ts']) },
  { root: 'lib/application/markets/queries.ts', maxLines: 25, extensions: new Set(['.ts']) },
  { root: 'lib/application/models/index.ts', maxLines: 25, extensions: new Set(['.ts']) },
  { root: 'lib/db/schema/tables.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'lib/openrouter/client.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'lib/openrouter/prompts.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'lib/openrouter/parser/parseDecision.ts', maxLines: 60, extensions: new Set(['.ts']) },
  { root: 'lib/openrouter/parser/validate.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'lib/utils.ts', maxLines: 25, extensions: new Set(['.ts']) },
  { root: 'lib/utils/date.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'lib/engine/cohort.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'lib/engine/decision.ts', maxLines: 40, extensions: new Set(['.ts']) },
  { root: 'lib/engine/decision/processAgentDecision.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'lib/engine/execution.ts', maxLines: 40, extensions: new Set(['.ts']) },
  { root: 'lib/engine/execution/bet.ts', maxLines: 80, extensions: new Set(['.ts']) },
  { root: 'lib/engine/market.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'lib/engine/execution/sell.ts', maxLines: 80, extensions: new Set(['.ts']) },
  { root: 'lib/engine/resolution.ts', maxLines: 40, extensions: new Set(['.ts']) },
  { root: 'lib/engine/resolution/settlement.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'lib/scoring/brier.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'lib/scoring/pnl.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'lib/types/api.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'lib/types/entities.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'lib/types/entities/trading.ts', maxLines: 20, extensions: new Set(['.ts']) },
  { root: 'app/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/admin/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/api/admin/action/route.ts', maxLines: 60, extensions: new Set(['.ts']) },
  { root: 'app/api/admin/costs/route.ts', maxLines: 50, extensions: new Set(['.ts']) },
  { root: 'app/api/admin/export/route.ts', maxLines: 80, extensions: new Set(['.ts']) },
  { root: 'app/api/admin/login/route.ts', maxLines: 60, extensions: new Set(['.ts']) },
  { root: 'app/api/admin/logs/route.ts', maxLines: 50, extensions: new Set(['.ts']) },
  { root: 'app/api/admin/stats/route.ts', maxLines: 50, extensions: new Set(['.ts']) },
  { root: 'app/api/cron/backup/route.ts', maxLines: 50, extensions: new Set(['.ts']) },
  { root: 'app/api/cron/check-resolutions/route.ts', maxLines: 50, extensions: new Set(['.ts']) },
  { root: 'app/api/cron/run-decisions/route.ts', maxLines: 50, extensions: new Set(['.ts']) },
  { root: 'app/api/cron/start-cohort/route.ts', maxLines: 50, extensions: new Set(['.ts']) },
  { root: 'app/api/cron/sync-markets/route.ts', maxLines: 40, extensions: new Set(['.ts']) },
  { root: 'app/api/cron/take-snapshots/route.ts', maxLines: 50, extensions: new Set(['.ts']) },
  { root: 'app/cohorts/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/cohorts/[id]/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/cohorts/[id]/models/[modelId]/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/api/decisions/[id]/route.ts', maxLines: 50, extensions: new Set(['.ts']) },
  { root: 'app/api/health/route.ts', maxLines: 40, extensions: new Set(['.ts']) },
  { root: 'app/api/leaderboard/route.ts', maxLines: 40, extensions: new Set(['.ts']) },
  { root: 'app/markets/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/markets/[id]/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/api/markets/route.ts', maxLines: 50, extensions: new Set(['.ts']) },
  { root: 'app/api/markets/[id]/route.ts', maxLines: 50, extensions: new Set(['.ts']) },
  { root: 'app/models/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/models/[id]/page.tsx', maxLines: 25, extensions: new Set(['.tsx']) },
  { root: 'app/api/performance-data/route.ts', maxLines: 50, extensions: new Set(['.ts']) },
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
  },
  {
    root: 'app/api/admin/action',
    extensions: new Set(['.ts']),
    disallow: [
      { prefix: '@/lib/db/', reason: 'admin action routes must go through the application layer' },
      { prefix: '@/lib/engine/', reason: 'admin action routes must go through the application layer' }
    ]
  },
  {
    root: 'app/api/admin/costs',
    extensions: new Set(['.ts']),
    disallow: [
      { prefix: '@/lib/db', reason: 'admin cost routes must go through the application layer' },
      { prefix: '@/lib/db/', reason: 'admin cost routes must go through the application layer' }
    ]
  },
  {
    root: 'app/api/admin/logs',
    extensions: new Set(['.ts']),
    disallow: [
      { prefix: '@/lib/db', reason: 'admin log routes must go through the application layer' },
      { prefix: '@/lib/db/', reason: 'admin log routes must go through the application layer' }
    ]
  },
  {
    root: 'app/api/admin/stats',
    extensions: new Set(['.ts']),
    disallow: [
      { prefix: '@/lib/db', reason: 'admin stats routes must go through the application layer' },
      { prefix: '@/lib/db/', reason: 'admin stats routes must go through the application layer' }
    ]
  },
  {
    root: 'app/api/cron',
    extensions: new Set(['.ts']),
    disallow: [
      { prefix: '@/lib/db', reason: 'cron routes must go through the application layer' },
      { prefix: '@/lib/db/', reason: 'cron routes must go through the application layer' },
      { prefix: '@/lib/db/queries', reason: 'cron routes must go through the application layer' },
      { prefix: '@/lib/engine/', reason: 'cron routes must go through the application layer' },
      { prefix: '@/lib/scoring/', reason: 'cron routes must go through the application layer' }
    ]
  },
  {
    root: 'app/api/decisions',
    extensions: new Set(['.ts']),
    disallow: [
      { prefix: '@/lib/db', reason: 'decision routes must go through the application layer' },
      { prefix: '@/lib/db/', reason: 'decision routes must go through the application layer' }
    ]
  },
  {
    root: 'app/api/health',
    extensions: new Set(['.ts']),
    disallow: [
      { prefix: '@/lib/db', reason: 'health routes must go through the application layer' },
      { prefix: '@/lib/db/', reason: 'health routes must go through the application layer' }
    ]
  },
  {
    root: 'app/api/leaderboard',
    extensions: new Set(['.ts']),
    disallow: [
      { prefix: '@/lib/db', reason: 'leaderboard routes must go through the application layer' },
      { prefix: '@/lib/db/', reason: 'leaderboard routes must go through the application layer' },
      { prefix: '@/lib/db/queries', reason: 'leaderboard routes must go through the application layer' }
    ]
  },
  {
    root: 'app/api/markets',
    extensions: new Set(['.ts']),
    disallow: [
      { prefix: '@/lib/db', reason: 'market routes must go through the application layer' },
      { prefix: '@/lib/db/', reason: 'market routes must go through the application layer' },
      { prefix: '@/lib/db/queries', reason: 'market routes must go through the application layer' }
    ]
  },
  {
    root: 'app/api/performance-data',
    extensions: new Set(['.ts']),
    disallow: [
      { prefix: '@/lib/db', reason: 'performance routes must go through the application layer' },
      { prefix: '@/lib/db/', reason: 'performance routes must go through the application layer' }
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
