import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const canonicalFiles = [
  'README.md',
  'PRODUCT_STATE.md',
  'CONTRIBUTING.md',
  'docs/README.md',
  'docs/architecture/system-map.md',
  'docs/documentation-system.md',
  'docs/design/README.md',
  'docs/releases/README.md',
  'docs/planning/README.md',
  'docs/planning/sprint-30.md',
  'docs/planning/repository-roadmap.md',
  'docs/versioning-and-release-roadmap.md',
];

const errors = [];
const contents = new Map();

for (const relativePath of canonicalFiles) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`${relativePath}: canonical document is missing`);
    continue;
  }
  contents.set(relativePath, fs.readFileSync(absolutePath, 'utf8'));
}

const auditedMarkdownFiles = new Set(
  canonicalFiles.filter((relativePath) => !relativePath.startsWith('docs/archive/')),
);
function collectMarkdown(directory) {
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const relativePath = path.posix.join(directory, entry.name);
    if (relativePath === 'docs/archive') continue;
    if (entry.isDirectory()) collectMarkdown(relativePath);
    else if (/\.mdx?$/.test(entry.name)) auditedMarkdownFiles.add(relativePath);
  }
}
collectMarkdown('docs');

for (const relativePath of auditedMarkdownFiles) {
  if (!contents.has(relativePath)) {
    contents.set(relativePath, fs.readFileSync(path.join(root, relativePath), 'utf8'));
  }
}

const markdownLink = /\[[^\]]*\]\(([^)]+)\)/g;
for (const [relativePath, source] of contents) {
  if (/\]\(<?file:\/\//.test(source)) {
    errors.push(`${relativePath}: absolute file:// links are not portable`);
  }

  for (const match of source.matchAll(markdownLink)) {
    const href = match[1]
      .trim()
      .replace(/^<|>$/g, '')
      .split(/\s+["']/)[0];
    if (!href || /^(?:https?:|mailto:|data:|#)/.test(href)) continue;

    const target = decodeURIComponent(href.split('#')[0]);
    if (!target) continue;
    const resolved = path.resolve(root, path.dirname(relativePath), target);
    if (!fs.existsSync(resolved)) {
      errors.push(`${relativePath}: broken link ${href}`);
    }
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
const version = packageJson.version;
const expectedVersion = '2.3.1-beta';
const expectedBranch = 'dev/sprint-30';
if (version !== expectedVersion) {
  errors.push(`package.json: expected Sprint 30 version ${expectedVersion}, found ${version}`);
}

const synchronizedFiles = [
  'PRODUCT_STATE.md',
  'docs/planning/sprint-30.md',
  'docs/versioning-and-release-roadmap.md',
];
for (const relativePath of synchronizedFiles) {
  const source = contents.get(relativePath) ?? '';
  if (!source.includes(expectedVersion)) {
    errors.push(`${relativePath}: missing current version ${expectedVersion}`);
  }
  if (!source.includes(expectedBranch)) {
    errors.push(`${relativePath}: missing current branch ${expectedBranch}`);
  }
}

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!indexHtml.includes('SYS VER: 2.3.1-BETA // ACTIVE')) {
  errors.push('index.html: in-game version label is not synchronized');
}

const planningDir = path.join(root, 'docs/planning');
const activePlans = fs
  .readdirSync(planningDir)
  .filter((name) => /^sprint-\d+\.md$/.test(name))
  .filter((name) => fs.readFileSync(path.join(planningDir, name), 'utf8').includes('Status: active plan'));
if (activePlans.length !== 1 || activePlans[0] !== 'sprint-30.md') {
  errors.push(`docs/planning: expected only sprint-30.md to be active; found ${activePlans.join(', ') || 'none'}`);
}

if (errors.length) {
  console.error(`Documentation audit failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Documentation audit passed (${canonicalFiles.length} canonical files, `
      + `${auditedMarkdownFiles.size} current/non-archive Markdown files, Sprint 30 / ${version}).`,
  );
}
