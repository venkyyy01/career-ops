import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateStatus, normalizeStatus } from './statuses.mjs';

const CAREER_OPS = dirname(fileURLToPath(import.meta.url));

export function getAppsFile() {
  return existsSync(join(CAREER_OPS, 'data/applications.md'))
    ? join(CAREER_OPS, 'data/applications.md')
    : join(CAREER_OPS, 'applications.md');
}

export function normalizeCompany(name) {
  return name.toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

export function roleFuzzyMatch(a, b) {
  const wordsA = a.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const wordsB = b.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const overlap = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  return overlap.length >= 2;
}

export function extractReportNum(reportStr) {
  const m = reportStr.match(/\[(\d+)\]/);
  return m ? parseInt(m[1]) : null;
}

export function parseScore(s) {
  const m = s.replace(/\*\*/g, '').match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

export function parseAppLine(line) {
  const parts = line.split('|').map(s => s.trim());
  if (parts.length < 9) return null;
  const num = parseInt(parts[1]);
  if (isNaN(num) || num === 0) return null;
  return {
    num, date: parts[2], company: parts[3], role: parts[4],
    score: parts[5], status: parts[6], pdf: parts[7], report: parts[8],
    notes: parts[9] || '', raw: line,
  };
}

export function parseTracker(appsFile) {
  if (!existsSync(appsFile)) return [];
  const content = readFileSync(appsFile, 'utf-8');
  const entries = [];
  for (const line of content.split('\n')) {
    if (!line.startsWith('|')) continue;
    const app = parseAppLine(line);
    if (app && app.num > 0) entries.push(app);
  }
  return entries;
}

export { validateStatus, normalizeStatus };
