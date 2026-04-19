import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const CAREER_OPS = dirname(fileURLToPath(import.meta.url));
const parseYaml = yaml.load;

export function buildTitleFilter(titleFilter) {
  const positive = (titleFilter?.positive || []).map(k => k.toLowerCase());
  const negative = (titleFilter?.negative || []).map(k => k.toLowerCase());

  return (title) => {
    if (!title) return false;
    const lower = title.toLowerCase();
    const hasPositive = positive.length === 0 || positive.some(k => lower.includes(k));
    const hasNegative = negative.some(k => lower.includes(k));
    return hasPositive && !hasNegative;
  };
}

export function buildLocationFilter(preferredLocations, excludedLocations) {
  const preferred = (preferredLocations || []).map(l => l.toLowerCase());
  const excluded = (excludedLocations || []).map(l => l.toLowerCase());

  return (locationText) => {
    if (!locationText) return true;
    const lower = locationText.toLowerCase();

    if (excluded.some(e => lower.includes(e))) return false;
    if (preferred.length === 0) return true;

    return preferred.some(p => {
      if (p.includes('remote')) return lower.includes('remote') || lower.includes('work from home') || lower.includes('hybrid');
      return lower.includes(p);
    });
  };
}

export function loadSeenUrls(scanHistoryPath, pipelinePath, applicationsPath) {
  const seen = new Set();

  if (scanHistoryPath && existsSync(scanHistoryPath)) {
    const lines = readFileSync(scanHistoryPath, 'utf-8').split('\n');
    for (const line of lines.slice(1)) {
      const url = line.split('\t')[0];
      if (url) seen.add(url);
    }
  }

  if (pipelinePath && existsSync(pipelinePath)) {
    const text = readFileSync(pipelinePath, 'utf-8');
    for (const match of text.matchAll(/- \[[ x]\] (https?:\/\/\S+)/g)) {
      seen.add(match[1]);
    }
  }

  if (applicationsPath && existsSync(applicationsPath)) {
    const text = readFileSync(applicationsPath, 'utf-8');
    for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(match[0]);
    }
  }

  return seen;
}

export function loadProfile(profilePath) {
  const fallback = {
    location: { city: 'Toronto', country: 'Canada', province: 'Ontario', timezone: 'EST' },
    crawler: { interval_hours: 4, max_results_per_scan: 50 },
  };

  if (!profilePath || !existsSync(profilePath)) return fallback;

  try {
    return parseYaml(readFileSync(profilePath, 'utf-8'));
  } catch (e) {
    console.log(`Warning: Could not load ${profilePath}: ${e.message}`);
    return fallback;
  }
}
