import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checkOnly = process.argv.includes('--check');
const nextDir = path.join(root, '.next');
const standaloneDir = path.join(nextDir, 'standalone');
const sourceStaticDir = path.join(nextDir, 'static');
const targetStaticDir = path.join(standaloneDir, '.next', 'static');
const sourcePublicDir = path.join(root, 'public');
const targetPublicDir = path.join(standaloneDir, 'public');

function fail(message) {
  console.error(`Standalone asset check failed: ${message}`);
  process.exit(1);
}

function requireDir(dir, label) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    fail(`${label} is missing at ${path.relative(root, dir)}`);
  }
}

function listFiles(dir, predicate) {
  const files = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (predicate(fullPath)) {
        files.push(fullPath);
      }
    }
  };
  visit(dir);
  return files;
}

function copyDir(source, target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

requireDir(standaloneDir, 'Next standalone output');
requireDir(sourceStaticDir, 'Next static asset output');

if (!checkOnly) {
  copyDir(sourceStaticDir, targetStaticDir);

  if (fs.existsSync(sourcePublicDir)) {
    copyDir(sourcePublicDir, targetPublicDir);
  }
}

requireDir(targetStaticDir, 'Standalone static asset output');

const cssFiles = listFiles(targetStaticDir, (file) => file.endsWith('.css'));
const jsFiles = listFiles(targetStaticDir, (file) => file.endsWith('.js'));
const fontFiles = listFiles(targetStaticDir, (file) => /\.(woff2?|ttf|otf)$/.test(file));

if (cssFiles.length === 0) {
  fail('no CSS files found under .next/standalone/.next/static');
}

if (jsFiles.length === 0) {
  fail('no JavaScript chunks found under .next/standalone/.next/static');
}

if (fontFiles.length === 0) {
  fail('no font files found under .next/standalone/.next/static');
}

for (const file of [...cssFiles, ...jsFiles, ...fontFiles]) {
  if (fs.statSync(file).size === 0) {
    fail(`empty asset file: ${path.relative(root, file)}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  mode: checkOnly ? 'check' : 'prepare',
  css_files: cssFiles.length,
  js_files: jsFiles.length,
  font_files: fontFiles.length
}));
