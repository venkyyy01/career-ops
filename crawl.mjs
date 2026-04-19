#!/usr/bin/env node

/**
 * crawl.mjs — Continuous web crawler for hidden job listings
 * 
 * Runs indefinitely, scanning job sites on a schedule to find:
 * - Latest job postings
 * - Hidden jobs not on main job boards
 * - Direct company career pages
 * 
 * Usage:
 *   node crawl.mjs                    # Run once
 *   node crawl.mjs --continuous       # Run continuously (default interval: 4 hours)
 *   node crawl.mjs --interval 2       # Set interval to 2 hours
 *   node crawl.mjs --dry-run          # Preview without writing
 * 
 * Environment:
 *   CRAWL_INTERVAL_HOURS=4    # Default interval between scans
 *   CRAWL_MAX_RESULTS=50      # Max new jobs per scan
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';
import { buildTitleFilter, buildLocationFilter, loadSeenUrls, loadProfile } from './lib/filters.mjs';
const parseYaml = yaml.load;

// ── Config ──────────────────────────────────────────────────────────

const PORTALS_PATH = 'portals.yml';
const SCAN_HISTORY_PATH = 'data/scan-history.tsv';
const PIPELINE_PATH = 'data/pipeline.md';
const APPLICATIONS_PATH = 'data/applications.md';
const CRAWL_LOG_PATH = 'data/crawl-log.md';
const PROFILE_PATH = 'config/profile.yml';

const DEFAULT_INTERVAL_HOURS = 4;
const DEFAULT_MAX_RESULTS = 50;
const FETCH_TIMEOUT_MS = 15_000;
const REQUEST_DELAY_MS = 1000;

mkdirSync('data', { recursive: true });

// ── Load Configuration ──────────────────────────────────────────────

function loadConfig() {
  const config = parseYaml(readFileSync(PORTALS_PATH, 'utf-8'));
  const profile = loadProfile(PROFILE_PATH);

  const loc = profile.location || {};
  const crawler = profile.crawler || {};
  const city = loc.city || 'Toronto';
  const country = loc.country || 'Canada';
  const province = loc.province || 'Ontario';

  const preferredLocations = crawler.preferred_locations || [
    `${city}, ${province}`,
    'Remote (Canada)',
    'Remote (US - Open to remote)',
  ];
  const excludedLocations = crawler.excluded_locations || [];

  const locationQueries = [
    `${city} ${province}`,
    `${city} ${province.includes(city) ? '' : province}`.trim(),
    `${country} remote`,
    `${country} hybrid`,
    `${city} area`,
    `${province} remote`,
    `${country} work from home`,
  ];

  if (loc.visa_status?.toLowerCase().includes('remote') || loc.location_flexibility?.toLowerCase().includes('remote')) {
    locationQueries.push('remote', 'work from home', 'anywhere');
  }

  const baseQueries = config.search_queries || [];
  const locationFilteredQueries = baseQueries.flatMap(q => {
    if (q.includes('site:linkedin') || q.includes('site:indeed') || q.includes('site:eluta') || q.includes('site:monster')) {
      return [
        `${q} ${city}`,
        `${q} ${country}`,
      ];
    }
    return [q];
  });

  return {
    searchQueries: [
      ...locationFilteredQueries,
      ...locationQueries.map(l => `site:indeed.ca Senior Backend Engineer ${l}`),
      ...locationQueries.map(l => `site:linkedin.com Senior Software Engineer ${l}`),
    ],
    titleFilter: config.title_filter || { positive: [], negative: [] },
    trackedCompanies: (config.tracked_companies || []).filter(c => c.enabled !== false),
    location: loc,
    preferredLocations,
    excludedLocations,
    crawlerConfig: {
      interval_hours: crawler.interval_hours || 4,
      max_results: crawler.max_results_per_scan || 50,
    },
  };
}

// ── Load Seen URLs (Dedup) ──────────────────────────────────────────

function getSeenUrls() {
  return loadSeenUrls(SCAN_HISTORY_PATH, PIPELINE_PATH, APPLICATIONS_PATH);
}

// ── Web Search ──────────────────────────────────────────────────────

async function searchJobs(query) {
  // Use DuckDuckGo (no API key needed)
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  
  try {
    const res = await fetch(searchUrl, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });
    
    if (!res.ok) {
      console.log(`  Search failed: ${res.status}`);
      return [];
    }
    
    const html = await res.text();
    return parseSearchResults(html);
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function parseSearchResults(html) {
  const jobs = [];
  
  // Extract job results from DuckDuckGo HTML
  const resultRegex = /<a class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  
  let match;
  while ((match = resultRegex.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].replace(/<[^>]+>/g, '').trim();
    const snippet = match[3].replace(/<[^>]+>/g, '').trim();
    
    // Filter out non-job URLs
    if (url && title && !url.includes('google') && !url.includes('youtube')) {
      jobs.push({ title, url, snippet });
    }
  }
  
  return jobs;
}

// ── Direct Company Crawl ───────────────────────────────────────────

async function crawlCompanyCareers(company) {
  const jobs = [];
  const { name, careers_url } = company;
  
  if (!careers_url) return jobs;
  
  // Try common job board patterns
  const patterns = [
    careers_url,
    `${careers_url}/jobs`,
    `${careers_url}/careers`,
    `${careers_url}/job-board`,
  ];
  
  for (const url of patterns) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      
      const res = await fetch(url, { 
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      
      if (res.ok) {
        const html = await res.text();
        const extracted = extractJobLinks(html, url, name);
        jobs.push(...extracted);
      }
      
      clearTimeout(timer);
      await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
    } catch (e) {
      console.log(`  Failed to fetch ${url}: ${e.message}`);
    }
  }
  
  return jobs;
}

function extractJobLinks(html, baseUrl, companyName) {
  const jobs = [];
  
  // Look for common job posting patterns
  const patterns = [
    /<a[^>]+href="([^"]*job[^"]*)"[^>]*>([^<]+)<\/a>/gi,
    /<a[^>]+href="([^"]*career[^"]*)"[^>]*>([^<]+)<\/a>/gi,
    /<a[^>]+href="([^"]*jobs[^"]*)"[^>]*>([^<]+)<\/a>/gi,
    /<a[^>]+href="(\/jobs\/[^"]+)"[^>]*>([^<]+)<\/a>/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let url = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      
      if (url.startsWith('/')) {
        const urlObj = new URL(baseUrl);
        url = `${urlObj.origin}${url}`;
      }
      
      if (title && url && url.startsWith('http')) {
        jobs.push({ title, url, company: companyName, source: 'direct' });
      }
    }
  }
  
  return jobs;
}

// ── Pipeline Writer ─────────────────────────────────────────────────

function appendToPipeline(offers) {
  if (offers.length === 0) return 0;

  let text = existsSync(PIPELINE_PATH) 
    ? readFileSync(PIPELINE_PATH, 'utf-8') 
    : '# Pendientes\n\n## Pendientes\n\n| # | URL | Company | Notes |\n|---|-----|---------|-------|\n';

  const marker = '## Pendientes';
  const idx = text.indexOf(marker);
  
  let newText = '';
  const date = new Date().toISOString().split('T')[0];
  
  offers.forEach((o, i) => {
    newText += `| ${text.split('\n').filter(l => l.startsWith('| ')).length + i + 1} | [${o.title}](${o.url}) | ${o.company || 'Unknown'} | Crawled ${date} |\n`;
  });

  if (idx !== -1) {
    const insertIdx = text.indexOf('\n', idx + marker.length);
    text = text.slice(0, insertIdx + 1) + '\n' + newText + text.slice(insertIdx + 1);
  } else {
    text += '\n' + newText;
  }

  writeFileSync(PIPELINE_PATH, text);
  return offers.length;
}

function logCrawlResults(stats) {
  const date = new Date().toISOString();
  const logEntry = `## ${date}\n- Search queries: ${stats.queries}\n- Results found: ${stats.found}\n- New jobs: ${stats.new}\n- Errors: ${stats.errors}\n\n`;
  
  if (existsSync(CRAWL_LOG_PATH)) {
    const existing = readFileSync(CRAWL_LOG_PATH, 'utf-8');
    writeFileSync(CRAWL_LOG_PATH, logEntry + existing);
  } else {
    writeFileSync(CRAWL_LOG_PATH, `# Crawl Log\n\n${logEntry}`);
  }
}

// ── Main Crawl Loop ─────────────────────────────────────────────────

async function runCrawl(dryRun = false) {
  console.log('\n🕷️  Starting job crawl...\n');
  
  const config = loadConfig();
  const titleFilter = buildTitleFilter(config.titleFilter);
  const locationFilter = buildLocationFilter(config.preferredLocations, config.excludedLocations);
  const seenUrls = getSeenUrls();
  const maxResults = config.crawlerConfig.max_results;

  const stats = { queries: 0, found: 0, new: 0, errors: 0 };
  const newOffers = [];

  // Phase 1: Web Search
  console.log('📡 Phase 1: Web search scanning...');
  for (const query of config.searchQueries.slice(0, 20)) {
    if (newOffers.length >= maxResults) break;

    stats.queries++;
    console.log(` Searching: ${query.slice(0, 60)}...`);

    const results = await searchJobs(query);
    stats.found += results.length;

    for (const r of results) {
      if (newOffers.length >= maxResults) break;
      const jobLocation = r.snippet || '';
      if (!seenUrls.has(r.url) && titleFilter(r.title) && locationFilter(jobLocation)) {
        newOffers.push({
          title: r.title,
          url: r.url,
          company: extractCompanyFromUrl(r.url),
          location: jobLocation,
          source: 'search',
        });
        seenUrls.add(r.url);
      }
    }

    await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
  }

  // Phase 2: Direct Company Crawl
  if (newOffers.length < maxResults) {
    console.log('\n🏢 Phase 2: Direct company career pages...');
    for (const company of config.trackedCompanies.slice(0, 15)) {
      if (newOffers.length >= maxResults) break;

      console.log(` Crawling: ${company.name}`);
      const jobs = await crawlCompanyCareers(company);
      stats.found += jobs.length;

      for (const j of jobs) {
        if (newOffers.length >= maxResults) break;
        if (!seenUrls.has(j.url) && titleFilter(j.title)) {
          newOffers.push(j);
          seenUrls.add(j.url);
        }
      }
    }
  }

  // Write results
  if (!dryRun && newOffers.length > 0) {
    const added = appendToPipeline(newOffers);
    stats.new = added;
    console.log(`\n✅ Added ${added} new jobs to pipeline`);
  } else if (dryRun) {
    console.log(`\n📋 Dry run: ${newOffers.length} jobs would be added`);
    console.log('Sample:', newOffers.slice(0, 3).map(j => `${j.title} (${j.url})`).join('\n'));
  }

  logCrawlResults(stats);

  console.log(`\n📊 Stats: ${stats.queries} queries, ${stats.found} results, ${stats.new} new`);

  return stats;
}

function extractCompanyFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^(www\.|jobs\.|careers\.)/i, '').split('.')[0];
  } catch {
    return 'Unknown';
  }
}

// ── Continuous Mode ─────────────────────────────────────────────────

async function continuousCrawl(intervalHours = DEFAULT_INTERVAL_HOURS) {
  console.log(`🔄 Continuous mode: scanning every ${intervalHours} hour(s)`);
  console.log('Press Ctrl+C to stop\n');
  
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  while (true) {
    await runCrawl();
    console.log(`\n💤 Sleeping for ${intervalHours} hour(s)...`);
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

// ── CLI ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const continuous = args.includes('--continuous');

let interval = DEFAULT_INTERVAL_HOURS;
const intervalArg = args.find(a => a.startsWith('--interval'));
if (intervalArg) {
  interval = parseInt(intervalArg.split('=')[1]) || DEFAULT_INTERVAL_HOURS;
}

if (continuous) {
  continuousCrawl(interval);
} else {
  runCrawl(dryRun);
}