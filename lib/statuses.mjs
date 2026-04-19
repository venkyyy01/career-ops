import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const CAREER_OPS = dirname(fileURLToPath(import.meta.url));
const STATES_FILE = existsSync(join(CAREER_OPS, 'templates/states.yml'))
  ? join(CAREER_OPS, 'templates/states.yml')
  : join(CAREER_OPS, 'states.yml');

const parseYaml = yaml.load;

let _cache = null;

function loadStates() {
  if (_cache) return _cache;

  if (!existsSync(STATES_FILE)) {
    _cache = buildFallback();
    return _cache;
  }

  try {
    const data = parseYaml(readFileSync(STATES_FILE, 'utf-8'));
    const states = data.states || [];

    const canonicalIds = states.map(s => s.id);
    const canonicalLabels = states.map(s => s.label);
    const aliases = {};
    const statusRank = {};

    let rank = 0;
    const rankOrder = ['skip', 'discarded', 'rejected', 'evaluated', 'applied', 'responded', 'interview', 'offer'];

    for (const state of states) {
      const id = state.id;
      statusRank[id] = rankOrder.indexOf(id) >= 0 ? rankOrder.indexOf(id) : rank++;

      if (state.aliases) {
        for (const alias of state.aliases) {
          aliases[alias.toLowerCase()] = id;
        }
      }
      aliases[id.toLowerCase()] = id;
      aliases[state.label.toLowerCase()] = id;
    }

    _cache = {
      canonicalIds,
      canonicalLabels,
      aliases,
      statusRank,
      rankOrder,
    };

    return _cache;
  } catch (e) {
    _cache = buildFallback();
    return _cache;
  }
}

function buildFallback() {
  const rankOrder = ['skip', 'discarded', 'rejected', 'evaluated', 'applied', 'responded', 'interview', 'offer'];
  const statusRank = {};
  rankOrder.forEach((s, i) => { statusRank[s] = i; });

  const aliases = {
    'evaluada': 'evaluated', 'condicional': 'evaluated', 'hold': 'evaluated',
    'evaluar': 'evaluated', 'verificar': 'evaluated',
    'aplicado': 'applied', 'enviada': 'applied', 'aplicada': 'applied',
    'applied': 'applied', 'sent': 'applied',
    'respondido': 'responded',
    'entrevista': 'interview',
    'oferta': 'offer',
    'rechazado': 'rejected', 'rechazada': 'rejected',
    'descartado': 'discarded', 'descartada': 'discarded',
    'cerrada': 'discarded', 'cancelada': 'discarded',
    'no aplicar': 'skip', 'no_aplicar': 'skip', 'skip': 'skip', 'monitor': 'skip',
    'geo blocker': 'skip',
  };

  return {
    canonicalIds: rankOrder,
    canonicalLabels: ['Evaluated', 'Applied', 'Responded', 'Interview', 'Offer', 'Rejected', 'Discarded', 'SKIP'],
    aliases,
    statusRank,
    rankOrder,
  };
}

export function getCanonicalIds() { return loadStates().canonicalIds; }
export function getCanonicalLabels() { return loadStates().canonicalLabels; }
export function getAliases() { return loadStates().aliases; }
export function getStatusRank() { return loadStates().statusRank; }
export function getRankOrder() { return loadStates().rankOrder; }

export function normalizeStatus(raw) {
  const { aliases, canonicalIds } = loadStates();
  const clean = raw.replace(/\*\*/g, '').trim().toLowerCase()
    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();

  if (/^duplicado/i.test(clean) || /^dup\b/i.test(clean)) return 'discarded';
  if (/^repost/i.test(clean)) return 'discarded';

  if (aliases[clean]) return aliases[clean];

  for (const id of canonicalIds) {
    if (clean === id.toLowerCase()) return id;
  }

  return clean;
}

export function validateStatus(raw) {
  const { aliases, canonicalLabels, canonicalIds } = loadStates();
  const clean = raw.replace(/\*\*/g, '').replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();
  const lower = clean.toLowerCase();

  for (let i = 0; i < canonicalIds.length; i++) {
    if (canonicalIds[i].toLowerCase() === lower) return canonicalLabels[i];
  }

  if (aliases[lower]) {
    const id = aliases[lower];
    const idx = canonicalIds.indexOf(id);
    return idx >= 0 ? canonicalLabels[idx] : canonicalLabels[0];
  }

  if (/^(duplicado|dup|repost)/i.test(lower)) return 'Discarded';

  console.warn(`⚠️ Non-canonical status "${raw}" → defaulting to "Evaluated"`);
  return 'Evaluated';
}

export function classifyOutcome(status) {
  const s = normalizeStatus(status);
  if (['interview', 'offer', 'responded', 'applied'].includes(s)) return 'positive';
  if (['rejected', 'discarded'].includes(s)) return 'negative';
  if (['skip'].includes(s)) return 'self_filtered';
  return 'pending';
}
