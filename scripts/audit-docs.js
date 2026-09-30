import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const canonicalFiles = [
  'README.md', 'PRODUCT_STATE.md', '.github/CONTRIBUTING.md', 'docs/README.md',
  'docs/architecture/system-map.md', 'docs/documentation-system.md',
  'docs/design/README.md', 'docs/releases/README.md', 'docs/planning/README.md',
  'docs/planning/repository-roadmap.md', 'docs/versioning-and-release-roadmap.md',
];

// Include tracked docs anywhere plus new unignored docs, so plans can be
// audited before staging. Skills, dependencies and generated builds are excluded.
export function isRepositoryDocument(file) {
  return /\.(?:md|mdx|txt|rst|adoc)$/i.test(file)
    && !/^(?:\.agents|\.claude|\.codex|node_modules|dist(?:_[^/]+)?|coverage|chrome|scratch|test-results|playwright-report)\//.test(file)
    && file !== 'public/robots.txt';
}

export function readPlanMetadata(source) {
  const plain = source.replaceAll('**', '');
  const value = (label) => plain.match(new RegExp('^' + label + ':\\s*\x60?([^\x60\\n|·]+)', 'mi'))?.[1].trim();
  return {
    active: /^Status:\s*active plan(?:\s*[|·]|\s*$)/mi.test(plain),
    branch: value('Baseline branch'),
    version: value('Baseline version'),
  };
}

export function countMarkers(source) {
  const lines = source.split(/\r?\n/);
  const checkboxes = lines.filter((line) => /^\s*(?:[-*+] |\d+\. )\[[ xX]\]/.test(line));
  return {
    unchecked: checkboxes.filter((line) => /\[ \]/.test(line)).length,
    checked: checkboxes.filter((line) => /\[[xX]\]/.test(line)).length,
    migratedCheckboxes: checkboxes.filter((line) => /\[MIGRATED\]/i.test(line)).length,
    keywordLines: lines.filter((line) => /\b(?:TODO|FIXME|TBD|HACK|XXX)\b/.test(line)).length,
  };
}

function classify(file, source) {
  if (file.startsWith('docs/archive/')) return ['historical', 'archive directory'];
  if (/^Status:\s*(?:historical|superseded|closed|archived)/mi.test(source.replaceAll('**', ''))) {
    return ['historical', 'explicit status'];
  }
  if (/^docs\/(?:reports|releases)\/(?!README\.md$)/.test(file)) return ['historical', 'evidence/release directory'];
  if (/^docs\/planning\//.test(file) && !file.endsWith('/README.md')) return ['planning', 'planning directory'];
  if (/(?:plan|backlog|todo|proposal)/i.test(path.basename(file))) return ['planning', 'filename heuristic'];
  return ['reference', 'default; currency requires semantic review'];
}

// File-target checks, not a complete Markdown parser. Ignore code examples,
// inspect inline links and reference definitions, and preserve line numbers.
export function inspectLinks(root, file, source) {
  const masked = source
    .replace(/^\s*(\x60{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, (text) => text.replace(/[^\n]/g, ' '))
    .replace(/\x60[^\x60\n]+\x60/g, (text) => ' '.repeat(text.length));
  const links = [
    ...masked.matchAll(/!?\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^\s)]+)(?:\s+["'][^\n]*?["'])?\s*\)/g),
    ...masked.matchAll(/^\s*\[[^\]\n]+\]:\s*(<[^>\n]+>|\S+)/gm),
  ];
  const issues = [];
  let localLinkCount = 0;
  for (const match of links) {
    const href = match[1].replace(/^<|>$/g, '');
    if (!href || /^(?:#|\/\/)/.test(href)) continue;
    if (/^[a-z][a-z\d+.-]*:/i.test(href) && !/^file:/i.test(href)) continue;
    localLinkCount += 1;
    const line = masked.slice(0, match.index).split('\n').length;
    const issue = (reason) => issues.push({ line, href, reason });
    if (/^(?:file:|\/|[a-z]:[\\/])/i.test(href)) {
      issue('absolute local link is not portable');
      continue;
    }
    let target;
    try {
      target = decodeURIComponent(href.split(/[?#]/)[0]);
    } catch {
      issue('malformed URL escape');
      continue;
    }
    if (target && !fs.existsSync(path.resolve(root, path.dirname(file), target))) {
      issue('missing relative target');
    }
  }
  return { localLinkCount, issues };
}

export function auditDocumentation(root) {
  const gitFiles = (...args) => execFileSync('git', ['ls-files', '-z', ...args], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const tracked = new Set(gitFiles('--cached'));
  const files = [...new Set([...tracked, ...gitFiles('--others', '--exclude-standard')])]
    .filter(isRepositoryDocument).sort();
  const errors = [];
  const contents = new Map();
  for (const file of files) {
    if (!fs.existsSync(path.join(root, file))) {
      errors.push(file + ': tracked document is missing from the working tree');
      continue;
    }
    contents.set(file, fs.readFileSync(path.join(root, file), 'utf8'));
  }
  const activePlans = [...contents].filter(([file, source]) => /^docs\/planning\/sprint-\d+\.md$/.test(file) && readPlanMetadata(source).active);
  const activePlan = activePlans.length === 1 ? activePlans[0][0] : null;
  if (!activePlan) errors.push('docs/planning: expected exactly one active sprint plan; found ' + (activePlans.map(([file]) => file).join(', ') || 'none'));
  const baseline = activePlan ? readPlanMetadata(contents.get(activePlan)) : {};
  const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  if (activePlan && !baseline.branch) errors.push(activePlan + ': missing Baseline branch metadata');
  if (activePlan && baseline.version !== version) errors.push(activePlan + ': Baseline version must match package.json (' + version + ')');
  for (const file of [...canonicalFiles, ...(activePlan ? [activePlan] : [])]) {
    if (!contents.has(file)) errors.push(file + ': canonical document is missing');
  }
  for (const file of ['PRODUCT_STATE.md', 'docs/versioning-and-release-roadmap.md']) {
    const source = contents.get(file) ?? '';
    if (!source.includes(version)) errors.push(file + ': missing current version ' + version);
    if (baseline.branch && !source.includes(baseline.branch)) errors.push(file + ': missing baseline branch ' + baseline.branch);
  }
  const label = 'SYS VER: ' + version.toUpperCase() + ' // ACTIVE';
  if (!fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes(label)) {
    errors.push('index.html: in-game version label is not synchronized (expected "' + label + '")');
  }

  const inventory = [...contents].map(([file, source]) => {
    const [classification, classificationBasis] = classify(file, source);
    const linkAudit = /\.mdx?$/i.test(file) ? inspectLinks(root, file, source) : { localLinkCount: 0, issues: [] };
    // Retain the non-archive gate: classification cannot exempt a dated plan.
    const enforcedLinks = /\.mdx?$/i.test(file) && !file.startsWith('docs/archive/');
    if (enforcedLinks) {
      for (const issue of linkAudit.issues) errors.push(file + ':' + issue.line + ': ' + issue.reason + ': ' + issue.href);
    }
    return {
      path: file,
      tracked: tracked.has(file),
      classification,
      classificationBasis,
      bytes: Buffer.byteLength(source),
      lines: source.split(/\r?\n/).length,
      markers: countMarkers(source),
      linkGate: enforcedLinks ? 'enforced' : file.startsWith('docs/archive/') ? 'historical-report-only' : 'not-markdown',
      localLinkCount: linkAudit.localLinkCount,
      linkIssues: linkAudit.issues,
    };
  });
  const sum = (field) => inventory.reduce((total, item) => total + item.markers[field], 0);
  return {
    schemaVersion: 1,
    generator: 'node scripts/audit-docs.js --inventory docs/reports/documentation-audit-inventory-2026-09-30.json',
    scope: 'Tracked repository .md/.mdx/.txt/.rst/.adoc files plus new unignored files, excluding agent skills, dependencies, build/test outputs and public/robots.txt.',
    limitations: [
      'Mechanical inventory and file-target link audit, not semantic review of every document or proof that a feature works.',
      'Unchecked boxes and TODO/FIXME/TBD/HACK/XXX lines are raw candidates, not a deduplicated backlog; checked boxes are not acceptance evidence.',
      'migratedCheckboxes counts literal [MIGRATED] checkbox tags, overlapping checked or unchecked counts; migration does not prove completion.',
      'Classification is path/status/filename based; dated material outside archives still receives enforced Markdown file-target checks.',
      'External URLs, heading anchors, HTML links, implicit reference usage, and non-Markdown text links are not validated; no external services were contacted.',
    ],
    activePlan,
    baseline: { branch: baseline.branch ?? null, version },
    summary: {
      documents: inventory.length,
      trackedDocuments: inventory.filter((item) => item.tracked).length,
      newDocuments: inventory.filter((item) => !item.tracked).length,
      bytes: inventory.reduce((total, item) => total + item.bytes, 0),
      byClassification: Object.fromEntries(['historical', 'planning', 'reference'].map((value) => [value, inventory.filter((item) => item.classification === value).length])),
      markers: Object.fromEntries(['unchecked', 'checked', 'migratedCheckboxes', 'keywordLines'].map((field) => [field, sum(field)])),
      markdownFilesWithEnforcedLinks: inventory.filter((item) => item.linkGate === 'enforced').length,
      linkIssues: inventory.reduce((total, item) => total + item.linkIssues.length, 0),
      historicalLinkIssues: inventory.filter((item) => item.linkGate === 'historical-report-only').reduce((total, item) => total + item.linkIssues.length, 0),
      currentAuditIssues: errors.length,
    },
    errors,
    files: inventory,
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--inventory' || !args[1].endsWith('.json'))) {
    throw new Error('Usage: node scripts/audit-docs.js [--inventory path/to/inventory.json]');
  }
  const report = auditDocumentation(process.cwd());
  if (args[0] === '--inventory') {
    fs.mkdirSync(path.dirname(path.resolve(args[1])), { recursive: true });
    fs.writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n');
    console.log('Documentation inventory written: ' + args[1] + ' (' + report.summary.documents + ' documents).');
  }
  if (report.errors.length) {
    console.error('Documentation audit failed with ' + report.errors.length + ' issue(s):');
    for (const error of report.errors) console.error('- ' + error);
    process.exitCode = 1;
  } else {
    console.log('Documentation audit passed (' + report.summary.documents + ' inventoried documents, ' + report.summary.markdownFilesWithEnforcedLinks + ' Markdown files with enforced links, ' + report.activePlan + ', ' + report.baseline.branch + ' / ' + report.baseline.version + ').');
  }
  console.log('Archive link issues preserved in inventory: ' + report.summary.historicalLinkIssues + '.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
