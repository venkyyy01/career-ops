#!/usr/bin/env node

/**
 * crawl-browser.mjs — Playwright-powered job crawler
 * 
 * Uses real browser automation for maximum power:
 * - JavaScript-rendered pages (React, Vue, etc.)
 * - Infinite scroll & lazy loading
 * - Login-protected career pages
 * - Dynamic content extraction
 * 
 * Usage:
 *   node crawl-browser.mjs              # Run once
 *   node crawl-browser.mjs --continuous # Continuous mode
 *   node crawl-browser.mjs --headless   # Run headless (default)
 *   node crawl-browser.mjs --headed     # Visible browser for debugging
 *   node crawl-browser.mjs --company Shopify # Scan specific company
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';
import { chromium } from 'playwright';
import { buildTitleFilter, buildLocationFilter, loadSeenUrls, loadProfile } from './lib/filters.mjs';
const parseYaml = yaml.load;

// ── Config ──────────────────────────────────────────────────────────

const PORTALS_PATH = 'portals.yml';
const PROFILE_PATH = 'config/profile.yml';
const SCAN_HISTORY_PATH = 'data/scan-history.tsv';
const PIPELINE_PATH = 'data/pipeline.md';
const APPLICATIONS_PATH = 'data/applications.md';
const CRAWL_LOG_PATH = 'data/crawl-log.md';

const DEFAULT_INTERVAL_HOURS = 4;
const DEFAULT_MAX_RESULTS = 50;
const PAGE_LOAD_TIMEOUT = 30_000;
const SCROLL_DELAY = 1000;

mkdirSync('data', { recursive: true });

// ── Load Configuration ──────────────────────────────────────────────

function loadConfig() {
  const portals = parseYaml(readFileSync(PORTALS_PATH, 'utf-8'));
  const profile = loadProfile(PROFILE_PATH);

  const loc = profile.location || {};
  const crawler = profile.crawler || {};

  return {
    searchQueries: portals.search_queries || [],
    titleFilter: portals.title_filter || { positive: [], negative: [] },
    trackedCompanies: (portals.tracked_companies || []).filter(c => c.enabled !== false),
    location: loc,
    preferredLocations: crawler.preferred_locations || [`${loc.city || 'Toronto'}, ${loc.province || 'Ontario'}`],
    excludedLocations: crawler.excluded_locations || [],
    crawlerConfig: {
      interval_hours: crawler.interval_hours || DEFAULT_INTERVAL_HOURS,
      max_results: crawler.max_results_per_scan || DEFAULT_MAX_RESULTS,
    },
  };
}

// ── Load Seen URLs ──────────────────────────────────────────────────

function getSeenUrls() {
  return loadSeenUrls(SCAN_HISTORY_PATH, PIPELINE_PATH, APPLICATIONS_PATH);
}

// ── Browser Crawler ─────────────────────────────────────────────────

// User agent rotation - realistic browser fingerprints
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Realistic browser context
async function createBrowser(headless = true) {
  const userAgent = getRandomUserAgent();
  
  const browser = await chromium.launch({ 
    headless,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
    ]
  });
  
  return browser;
}

async function createStealthContext(browser) {
  const context = await browser.newContext({
    userAgent: getRandomUserAgent(),
    viewport: { 
      width: 1920 + Math.floor(Math.random() * 100), 
      height: 1080 + Math.floor(Math.random() * 100) 
    },
  locale: 'en-US',
  timezoneId: config.location?.timezone || 'America/Toronto',
    permissions: ['geolocation'],
    // Realistic browser features
    deviceScaleFactor: Math.random() > 0.5 ? 2 : 1,
    hasTouch: false,
    isMobile: false,
  });
  
  // Inject stealth scripts to hide automation
  await context.addInitScript(() => {
    // Override navigator properties
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    
    // Add Chrome runtime
    window.chrome = { runtime: {} };
    
    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
    
    // Add fake automation detection
    window.navigator.chrome = true;
  });
  
  return context;
}

async function crawlWithPlaywright(url, options = {}) {
  const { scroll = true, waitForSelector = null, timeout = PAGE_LOAD_TIMEOUT } = options;
  
  const browser = await createBrowser(options.headless ?? true);
  const context = await createStealthContext(browser);
  
  const page = await context.newPage();
  const jobs = [];
  
  // Set extra HTTP headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  });
  
  try {
    await page.goto(url, { timeout, waitUntil: 'networkidle' });
    
    // Wait for dynamic content
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {});
    }
    
    // Simulate human behavior before scrolling
    await simulateHumanBehavior(page);
    await new Promise(r => setTimeout(r, randomDelay(500, 1500)));
    
    // Scroll to load lazy content (human-like)
    if (scroll) {
      await humanScroll(page);
      await autoScroll(page);
    }
    
    // Extract job listings - multiple patterns
    jobs.push(...await extractJobCards(page));
    
    // Try iframe career pages
    const iframes = await page.frames();
    for (const frame of iframes) {
      try {
        const frameJobs = await frame.evaluate(() => {
          // Look for job posting patterns in iframe
          const results = [];
          document.querySelectorAll('a[href*="job"], a[href*="career"], a[href*="position"]').forEach(a => {
            if (a.href && a.textContent) {
              results.push({ title: a.textContent.trim(), url: a.href });
            }
          });
          return results;
        });
        jobs.push(...frameJobs);
      } catch (e) {
      console.log(`  Iframe extraction failed: ${e.message}`);
    }
    }
    
  } catch (err) {
    console.log(`  Error loading ${url}: ${err.message}`);
  } finally {
    await browser.close();
  }
  
  return jobs;
}

// Human-like behavior delays
function randomDelay(min = 500, max = 2000) {
  return Math.floor(Math.random() * (max - min) + min);
}

async function humanScroll(page) {
  // Random scroll behavior like a real user
  const scrollActions = Math.floor(Math.random() * 3) + 2;
  
  for (let i = 0; i < scrollActions; i++) {
    const scrollAmount = Math.floor(Math.random() * 500) + 200;
    await page.evaluate((y) => window.scrollBy(0, y), scrollAmount);
    await new Promise(r => setTimeout(r, randomDelay(300, 800)));
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        
        if (totalHeight >= scrollHeight || totalHeight > 10000) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// Random mouse movement simulation
async function simulateHumanBehavior(page) {
  try {
    // Random mouse movements
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(Math.random() * 800) + 100;
      const y = Math.floor(Math.random() * 600) + 100;
      await page.mouse.move(x, y);
      await new Promise(r => setTimeout(r, randomDelay(100, 300)));
    }
  } catch (e) {
    // Ignore mouse errors
  }
}

async function extractJobCards(page) {
  return await page.evaluate(() => {
    const jobs = [];
    
    // Pattern 1: Job board cards
    document.querySelectorAll('[class*="job"], [class*="position"], [class*="posting"]').forEach(el => {
      const link = el.querySelector('a') || el;
      const href = link.href || link.getAttribute('onclick')?.match(/'(https[^']+)'/)?.[1];
      const title = el.textContent?.split('\n')[0]?.trim();
      
      if (href && title && href.startsWith('http')) {
        jobs.push({ title, url: href, source: 'card' });
      }
    });
    
    // Pattern 2: Links with job-related text
    document.querySelectorAll('a').forEach(a => {
      const text = a.textContent?.toLowerCase() || '';
      const href = a.href;
      
      if (href && href.startsWith('http') && (
        text.includes('engineer') || 
        text.includes('developer') || 
        text.includes('software') ||
        text.includes('backend') ||
        text.includes('platform')
      )) {
        const title = a.textContent?.trim();
        if (title && title.length > 5 && title.length < 200) {
          jobs.push({ title, url: href, source: 'link' });
        }
      }
    });
    
    // Pattern 3: List items
    document.querySelectorAll('li, tr').forEach(li => {
      const link = li.querySelector('a');
      const text = li.textContent?.toLowerCase() || '';
      
      if (link && link.href && (
        text.includes('engineer') || 
        text.includes('developer') ||
        text.includes('software')
      )) {
        const title = link.textContent?.trim() || li.textContent?.split('\n')[0]?.trim();
        if (title) {
          jobs.push({ title, url: link.href, source: 'list' });
        }
      }
    });
    
    return jobs;
  });
}

// ── Search Engine Crawling ──────────────────────────────────────────

async function searchWithBrowser(query, maxResults = 20) {
  const browser = await createBrowser(true);
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });
  
  const page = await context.newPage();
  const jobs = [];
  
  try {
    // Use DuckDuckGo (no login required)
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { timeout: PAGE_LOAD_TIMEOUT, waitUntil: 'networkidle' });
    
    // Extract results
    const results = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('.result').forEach(el => {
        const linkEl = el.querySelector('.result__a');
        const snippetEl = el.querySelector('.result__snippet');
        
        if (linkEl && linkEl.href) {
          items.push({
            title: linkEl.textContent?.trim(),
            url: linkEl.href,
            snippet: snippetEl?.textContent?.trim(),
          });
        }
      });
      return items;
    });
    
    jobs.push(...results.slice(0, maxResults));
    
  } catch (err) {
    console.log(`  Search error: ${err.message}`);
  } finally {
    await browser.close();
  }
  
  return jobs;
}

// ── Company Career Page Crawling ─────────────────────────────────────

async function crawlCompanyCareers(company, titleFilter, locationFilter, seenUrls, maxResults) {
  const jobs = [];
  const { name, careers_url } = company;
  
  if (!careers_url) return jobs;
  
  console.log(`  Crawling ${name}...`);
  
  // Try main careers page
  const urls = [
    careers_url,
    `${careers_url}/jobs`,
    `${careers_url}/careers`,
    `${careers_url}/jobs?location=Toronto`,
    `${careers_url}/jobs?location=Canada`,
  ];
  
  for (const url of urls) {
    if (jobs.length >= maxResults) break;
    
    try {
      const results = await crawlWithPlaywright(url, { 
        scroll: true,
        waitForSelector: '[class*="job"], [class*="position"]',
      });
      
      for (const job of results) {
        if (jobs.length >= maxResults) break;
        if (seenUrls.has(job.url)) continue;
        if (!titleFilter(job.title)) continue;
        
        jobs.push({
          ...job,
          company: name,
          source: 'company',
        });
        seenUrls.add(job.url);
      }
    } catch (e) {
      console.log(`  Failed to crawl ${url}: ${e.message}`);
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
  
  // Count existing rows
  const existingRows = text.split('\n').filter(l => l.match(/^\|\s*\d+\s*\|/)).length;
  
  offers.forEach((o, i) => {
    newText += `| ${existingRows + i + 1} | [${o.title}](${o.url}) | ${o.company || 'Unknown'} | Crawled ${date} |\n`;
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

async function runCrawl(options = {}) {
  const { dryRun = false, headless = true, company = null } = options;
  
  console.log('\n🕷️  Starting Playwright job crawl...\n');
  
  const config = loadConfig();
  const titleFilter = buildTitleFilter(config.titleFilter);
  const locationFilter = buildLocationFilter(config.preferredLocations, config.excludedLocations);
  const seenUrls = getSeenUrls();
  
  const stats = { queries: 0, found: 0, new: 0, errors: 0 };
  const newOffers = [];
  const maxResults = config.crawlerConfig.max_results;
  
  // Phase 1: Search Engine Results
  console.log('📡 Phase 1: Search engine scanning...');
  const searchQueries = config.searchQueries.slice(0, 15);
  
  for (const query of searchQueries) {
    if (newOffers.length >= maxResults) break;
    stats.queries++;
    console.log(`  Query: ${query.slice(0, 60)}...`);
    
    const results = await searchWithBrowser(query, 10);
    stats.found += results.length;
    
    for (const r of results) {
      if (newOffers.length >= maxResults) break;
      if (seenUrls.has(r.url)) continue;
      if (!titleFilter(r.title)) continue;
      if (!locationFilter(r.snippet || '')) continue;
      
      newOffers.push({
        title: r.title,
        url: r.url,
        company: extractCompanyFromUrl(r.url),
        location: r.snippet,
        source: 'search',
      });
      seenUrls.add(r.url);
    }
  }
  
  // Phase 2: Direct Company Career Pages
  console.log('\n🏢 Phase 2: Company career pages...');
  const companies = company 
    ? config.trackedCompanies.filter(c => c.name.toLowerCase() === company.toLowerCase())
    : config.trackedCompanies;
  
  for (const comp of companies.slice(0, 20)) {
    if (newOffers.length >= maxResults) break;
    
    const jobs = await crawlCompanyCareers(
      comp, 
      titleFilter, 
      locationFilter, 
      seenUrls, 
      maxResults - newOffers.length
    );
    
    stats.found += jobs.length;
    newOffers.push(...jobs);
  }
  
  // Phase 3: LinkedIn (if accessible)
  console.log('\n🔗 Phase 3: LinkedIn Jobs...');
  const locationQueries = config.preferredLocations.slice(0, 3);
  for (const loc of locationQueries) {
    if (newOffers.length >= maxResults) break;
    
    const linkedInQuery = `site:linkedin.com/jobs ${loc} Backend Engineer`;
    const results = await searchWithBrowser(linkedInQuery, 5);
    
    for (const r of results) {
      if (newOffers.length >= maxResults) break;
      if (seenUrls.has(r.url)) continue;
      if (!titleFilter(r.title)) continue;
      
      newOffers.push({
        title: r.title,
        url: r.url,
        company: 'LinkedIn',
        source: 'linkedin',
      });
      seenUrls.add(r.url);
    }
  }
  
  // Write results
  if (!dryRun && newOffers.length > 0) {
    const added = appendToPipeline(newOffers);
    stats.new = added;
    console.log(`\n✅ Added ${added} new jobs to pipeline`);
  } else if (dryRun) {
    console.log(`\n📋 Dry run: ${newOffers.length} jobs found`);
    newOffers.slice(0, 5).forEach(j => console.log(`  - ${j.title} (${j.url})`));
  }
  
  logCrawlResults(stats);
  console.log(`\n📊 Stats: ${stats.queries} queries, ${stats.found} found, ${stats.new} new`);
  
  return stats;
}

function extractCompanyFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^(www\.|jobs\.|careers\.|linkedin\.)/i, '').split('.')[0];
  } catch {
    return 'Unknown';
  }
}

// ── Continuous Mode ─────────────────────────────────────────────────

async function continuousCrawl(intervalHours = DEFAULT_INTERVAL_HOURS, options = {}) {
  console.log(`🔄 Continuous mode: scanning every ${intervalHours} hour(s)`);
  console.log('Press Ctrl+C to stop\n');
  
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  while (true) {
    await runCrawl(options);
    console.log(`\n💤 Sleeping for ${intervalHours} hour(s)...`);
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

// ── CLI ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const continuous = args.includes('--continuous');
const headless = !args.includes('--headed');
const companyArg = args.find(a => a.startsWith('--company='));
const company = companyArg ? companyArg.split('=')[1] : null;

let interval = DEFAULT_INTERVAL_HOURS;
const intervalArg = args.find(a => a.startsWith('--interval='));
if (intervalArg) {
  interval = parseInt(intervalArg.split('=')[1]) || DEFAULT_INTERVAL_HOURS;
}

const options = { dryRun, headless, company };

if (continuous) {
  continuousCrawl(interval, options);
} else {
  runCrawl(options);
}