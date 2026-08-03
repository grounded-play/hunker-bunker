#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE_PATH = path.join(ROOT, 'steam/claim-evidence.json');
const REPORT_PATH = path.join(ROOT, 'steam/claims-report.json');
const NEGATION = /\b(not|no|never|without|unchecked|pending|until|in progress|do not|don't|cannot|can't|isn't|is not)\b/i;

function paragraphs(text) {
    return String(text ?? '')
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
}

export function findUnsupportedClaims(text, claims, file = '<text>') {
    const violations = [];
    for (const paragraph of paragraphs(text)) {
        const normalized = paragraph.toLowerCase();
        for (const [claim, rule] of Object.entries(claims ?? {})) {
            if (rule.accepted) continue;
            for (const phrase of rule.phrases ?? []) {
                if (!normalized.includes(String(phrase).toLowerCase())) continue;
                if (NEGATION.test(paragraph)) continue;
                violations.push({ claim, phrase, file, excerpt: paragraph.slice(0, 240) });
            }
        }
    }
    return violations;
}

export function buildClaimsReport(root = ROOT) {
    const evidence = JSON.parse(fs.readFileSync(path.join(root, path.relative(ROOT, EVIDENCE_PATH)), 'utf8'));
    const violations = [];
    for (const relativeFile of evidence.copyFiles) {
        const absoluteFile = path.join(root, relativeFile);
        if (!fs.existsSync(absoluteFile)) {
            violations.push({ claim: 'copy_file', phrase: 'missing', file: relativeFile, excerpt: '' });
            continue;
        }
        violations.push(...findUnsupportedClaims(
            fs.readFileSync(absoluteFile, 'utf8'),
            evidence.claims,
            relativeFile
        ));
    }
    return {
        version: 1,
        copyFiles: evidence.copyFiles,
        claimStatus: Object.fromEntries(
            Object.entries(evidence.claims).map(([name, rule]) => [name, rule.accepted ? 'accepted' : 'held'])
        ),
        violations
    };
}

export function claimsReportMatches(existing, report) {
    try {
        return JSON.stringify(JSON.parse(existing)) === JSON.stringify(report);
    } catch {
        return false;
    }
}

function main() {
    const check = process.argv.includes('--check');
    const report = buildClaimsReport();
    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    if (check) {
        const existing = fs.existsSync(REPORT_PATH) ? fs.readFileSync(REPORT_PATH, 'utf8') : '';
        // Compare JSON values instead of bytes. Git may check tracked JSON out
        // with CRLF on Windows, which must not make a current report look stale.
        if (!claimsReportMatches(existing, report)) {
            console.error('[steam-claims] report is missing or stale; run npm run steam:claims');
            process.exitCode = 1;
            return;
        }
    } else {
        fs.writeFileSync(REPORT_PATH, serialized);
    }
    if (report.violations.length) {
        for (const violation of report.violations) {
            console.error(`[steam-claims] ${violation.file}: unsupported ${violation.claim} claim (${violation.phrase})`);
        }
        process.exitCode = 1;
        return;
    }
    console.log(`[steam-claims] ok (${Object.keys(report.claimStatus).length} controlled claims, ${report.copyFiles.length} copy files)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
