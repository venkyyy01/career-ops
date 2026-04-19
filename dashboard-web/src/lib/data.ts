import { CareerApplication, PipelineMetrics, ReportSummary, ProgressMetrics } from '@/types/pipeline';

const reReportLink = /\[(\d+)\]\(([^)]+)\)/;
const reScoreValue = /(\d+\.?\d*)\/5/;
const reArchetype = /\*\*Arquetipo(?: de riesgo)?\*\*\s*\|\s*(.+)/i;
const reTlDr = /\*\*TL;DR\*\*\s*\|\s*(.+)/i;
const reRemote = /\*\*Remote\*\*\s*\|\s*(.+)/i;
const reComp = /\*\*Comp\*\*\s*\|\s*(.+)/i;

export function parseApplications(careerOpsPath: string, content: string): CareerApplication[] {
  const lines = content.split('\n');
  const apps: CareerApplication[] = [];
  let num = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('# ') || trimmed.startsWith('|---') || trimmed.startsWith('| #')) {
      continue;
    }
    if (!trimmed.startsWith('|')) continue;

    const fields = trimmed.slice(1, -1).split('|').map(f => f.trim());
    if (fields.length < 8) continue;

    num++;
    const app: CareerApplication = {
      number: num,
      date: fields[1] || '',
      company: fields[2] || '',
      role: fields[3] || '',
      score: 0,
      scoreRaw: fields[4] || '',
      status: fields[5] || '',
      hasPDF: fields[6]?.includes('✅') || false,
      reportNumber: '',
      reportPath: '',
      notes: fields[8] || '',
      jobURL: '',
    };

    const scoreMatch = reScoreValue.exec(fields[4] || '');
    if (scoreMatch) {
      app.score = parseFloat(scoreMatch[1]) || 0;
    }

    const reportMatch = reReportLink.exec(fields[7] || '');
    if (reportMatch) {
      app.reportNumber = reportMatch[1];
      app.reportPath = reportMatch[2];
    }

    apps.push(app);
  }

  return apps;
}

export function normalizeStatus(raw: string): string {
  const s = raw.toLowerCase().replace(/\*\*/g, '').trim();

  if (s.includes('no aplicar') || s.includes('skip') || s.includes('geo blocker')) return 'skip';
  if (s.includes('interview') || s.includes('entrevista')) return 'interview';
  if (s.includes('offer') || s.includes('oferta')) return 'offer';
  if (s.includes('responded') || s.includes('respondido')) return 'responded';
  if (s.includes('applied') || s.includes('aplicado') || s === 'enviada') return 'applied';
  if (s.includes('rejected') || s.includes('rechazado')) return 'rejected';
  if (s.includes('discarded') || s.includes('descartado') || s.includes('duplicado')) return 'discarded';
  if (s.includes('evaluated') || s.includes('evaluada') || s === 'condicional' || s === 'hold') return 'evaluated';
  return s;
}

export function computeMetrics(apps: CareerApplication[]): PipelineMetrics {
  const metrics: PipelineMetrics = {
    total: apps.length,
    avgScore: 0,
    topScore: 0,
    withPDF: 0,
    actionable: 0,
    byStatus: {},
  };

  let totalScore = 0;
  let scored = 0;

  for (const app of apps) {
    const norm = normalizeStatus(app.status);
    metrics.byStatus[norm] = (metrics.byStatus[norm] || 0) + 1;

    if (app.score > 0) {
      totalScore += app.score;
      scored++;
      if (app.score > metrics.topScore) metrics.topScore = app.score;
    }
    if (app.hasPDF) metrics.withPDF++;
    if (norm !== 'skip' && norm !== 'rejected' && norm !== 'discarded') {
      metrics.actionable++;
    }
  }

  if (scored > 0) metrics.avgScore = totalScore / scored;
  return metrics;
}

export function loadReportSummary(content: string): ReportSummary {
  const summary: ReportSummary = { archetype: '', tldr: '', remote: '', comp: '' };

  const archMatch = reArchetype.exec(content);
  if (archMatch) summary.archetype = archMatch[1].replace(/\|/g, '').trim();

  const tlDrMatch = reTlDr.exec(content);
  if (tlDrMatch) summary.tldr = tlDrMatch[1].replace(/\|/g, '').trim();

  const remoteMatch = reRemote.exec(content);
  if (remoteMatch) summary.remote = remoteMatch[1].replace(/\|/g, '').trim();

  const compMatch = reComp.exec(content);
  if (compMatch) summary.comp = compMatch[1].replace(/\|/g, '').trim();

  if (summary.tldr.length > 120) summary.tldr = summary.tldr.slice(0, 117) + '...';

  return summary;
}

export function statusPriority(status: string): number {
  switch (normalizeStatus(status)) {
    case 'interview': return 0;
    case 'offer': return 1;
    case 'responded': return 2;
    case 'applied': return 3;
    case 'evaluated': return 4;
    case 'skip': return 5;
    case 'rejected': return 6;
    case 'discarded': return 7;
    default: return 8;
  }
}

export function computeProgressMetrics(apps: CareerApplication[]): ProgressMetrics {
  const pm: ProgressMetrics = {
    totalOffers: 0,
    activeApps: 0,
    avgScore: 0,
    topScore: 0,
    responseRate: 0,
    interviewRate: 0,
    offerRate: 0,
    funnelStages: [],
    scoreBuckets: [],
    weeklyActivity: [],
  };

  const statusCounts: Record<string, number> = {};
  let totalScore = 0;
  let scored = 0;

  for (const app of apps) {
    const norm = normalizeStatus(app.status);
    statusCounts[norm] = (statusCounts[norm] || 0) + 1;

    if (app.score > 0) {
      totalScore += app.score;
      scored++;
      if (app.score > pm.topScore) pm.topScore = app.score;
    }
    if (norm === 'offer') pm.totalOffers++;
    if (norm !== 'skip' && norm !== 'rejected' && norm !== 'discarded') pm.activeApps++;
  }

  if (scored > 0) pm.avgScore = totalScore / scored;

  const total = apps.length;
  const applied = (statusCounts['applied'] || 0) + (statusCounts['responded'] || 0) +
    (statusCounts['interview'] || 0) + (statusCounts['offer'] || 0) + (statusCounts['rejected'] || 0);
  const responded = (statusCounts['responded'] || 0) + (statusCounts['interview'] || 0) + (statusCounts['offer'] || 0);
  const interview = (statusCounts['interview'] || 0) + (statusCounts['offer'] || 0);
  const offer = statusCounts['offer'] || 0;

  pm.funnelStages = [
    { label: 'Evaluated', count: total, pct: 100 },
    { label: 'Applied', count: applied, pct: total > 0 ? (applied / total) * 100 : 0 },
    { label: 'Responded', count: responded, pct: applied > 0 ? (responded / applied) * 100 : 0 },
    { label: 'Interview', count: interview, pct: applied > 0 ? (interview / applied) * 100 : 0 },
    { label: 'Offer', count: offer, pct: applied > 0 ? (offer / applied) * 100 : 0 },
  ];

  if (applied > 0) {
    pm.responseRate = (responded / applied) * 100;
    pm.interviewRate = (interview / applied) * 100;
    pm.offerRate = (offer / applied) * 100;
  }

  const buckets = [0, 0, 0, 0, 0];
  for (const app of apps) {
    if (app.score <= 0) continue;
    if (app.score >= 4.5) buckets[0]++;
    else if (app.score >= 4.0) buckets[1]++;
    else if (app.score >= 3.5) buckets[2]++;
    else if (app.score >= 3.0) buckets[3]++;
    else buckets[4]++;
  }
  pm.scoreBuckets = [
    { label: '4.5-5.0', count: buckets[0] },
    { label: '4.0-4.4', count: buckets[1] },
    { label: '3.5-3.9', count: buckets[2] },
    { label: '3.0-3.4', count: buckets[3] },
    { label: '<3.0', count: buckets[4] },
  ];

  return pm;
}

export function updateApplicationStatus(
  content: string,
  reportNumber: string,
  newStatus: string
): string {
  const lines = content.split('\n');
  let found = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith('|')) continue;

    if (trimmed.includes(`[${reportNumber}]`)) {
      const fields = trimmed.slice(1, -1).split('|').map(f => f.trim());
      const statusIdx = 5;
      fields[statusIdx] = newStatus;
      lines[i] = '| ' + fields.join(' | ') + ' |';
      found = true;
      break;
    }
  }

  if (!found) return content;
  return lines.join('\n');
}

export function getStatusColor(status: string): string {
  switch (normalizeStatus(status)) {
    case 'interview': return 'text-emerald-400';
    case 'offer': return 'text-emerald-400';
    case 'responded': return 'text-blue-400';
    case 'applied': return 'text-sky-400';
    case 'evaluated': return 'text-slate-300';
    case 'skip': return 'text-red-400';
    case 'rejected': return 'text-slate-500';
    case 'discarded': return 'text-slate-500';
    default: return 'text-slate-400';
  }
}

export function getScoreColor(score: number): string {
  if (score >= 4.2) return 'text-emerald-400';
  if (score >= 3.8) return 'text-yellow-400';
  if (score >= 3.0) return 'text-slate-300';
  return 'text-red-400';
}

export function formatStatus(status: string): string {
  const norm = normalizeStatus(status);
  return norm.charAt(0).toUpperCase() + norm.slice(1);
}